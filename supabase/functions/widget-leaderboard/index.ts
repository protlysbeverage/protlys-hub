import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-widget-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function keyFromJson(name: string, fallbackName: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed?.default) return parsed.default;
      const first = Object.values(parsed || {})[0];
      if (typeof first === "string") return first;
    } catch {}
  }
  return Deno.env.get(fallbackName) || "";
}
function createAdminClient(url: string, secret: string) {
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        // Supabase secret keys belong in apikey, never in Authorization: Bearer.
        headers.delete("Authorization");
        headers.set("apikey", secret);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const token = req.headers.get("x-widget-token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return json({ error: "Widget token required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const secret = keyFromJson("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return json({ error: "Function configuration is incomplete" }, 500);
  const admin = createAdminClient(url, secret);
  const tokenHash = await sha256Hex(token);
  const { data: device, error: tokenError } = await admin.from("device_tracking_tokens")
    .select("id,user_id,created_at").eq("token_hash", tokenHash).eq("platform", "android_widget")
    .is("revoked_at", null).maybeSingle();
  if (tokenError) return json({ error: tokenError.message }, 500);
  if (!device) return json({ error: "Widget access revoked" }, 401);
  if (Date.now() - Date.parse(device.created_at) > 30 * 24 * 60 * 60 * 1000) {
    await admin.from("device_tracking_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", device.id);
    return json({ error: "Widget access expired" }, 401);
  }

  const viewerId = String(device.user_id);
  const { data: viewerProfile, error: viewerProfileError } = await admin.from("profiles")
    .select("step_goal").eq("id", viewerId).maybeSingle();
  if (viewerProfileError) return json({ error: viewerProfileError.message }, 500);
  const dailyGoal = Number(viewerProfile?.step_goal || 8000);

  const { data: group, error: groupError } = await admin.from("groups")
    .select("id,name,member_limit").eq("name", "Founding 250").eq("is_system", true).limit(1).maybeSingle();
  if (groupError) return json({ error: groupError.message }, 500);
  if (!group) return json({ error: "Leaderboard group unavailable" }, 404);

  const { data: membership, error: membershipError } = await admin.from("group_members")
    .select("joined_at").eq("group_id", group.id).eq("user_id", viewerId).maybeSingle();
  if (membershipError) return json({ error: membershipError.message }, 500);
  await admin.from("device_tracking_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);

  const capacity = Number(group.member_limit || 250);
  if (!membership) return json({ joined: false, group_id: group.id, group_name: group.name, capacity, daily_goal: dailyGoal, top: [], viewer: null });

  // This is the same ranking RPC the in-app leaderboard uses. The service-role-only
  // overload returns the top three and this device owner's own row, even outside the top three.
  const { data: rows, error: leaderboardError } = await admin.rpc("get_group_leaderboard", {
    p_group_id: group.id,
    p_period: "this_week",
    p_limit: 3,
    p_offset: 0,
    p_user_id: viewerId,
  });
  if (leaderboardError) return json({ error: leaderboardError.message }, 500);

  const normalized = (rows || []).map((row: any) => ({
    rank: Number(row.rank),
    user_id: String(row.user_id),
    handle: String(row.username || "").trim() || "Member",
    steps: Number(row.steps || 0),
  }));
  const top = normalized.filter((row: any) => row.rank <= 3)
    .map(({ rank, handle, steps }: any) => ({ rank, handle, steps }));
  const own = normalized.find((row: any) => row.user_id === viewerId);
  const leader = top[0] || null;

  return json({
    joined: true,
    group_id: group.id,
    group_name: group.name,
    capacity,
    daily_goal: dailyGoal,
    top,
    viewer: own ? { rank: own.rank, handle: own.handle, steps: own.steps } : null,
    leader,
  });
});
