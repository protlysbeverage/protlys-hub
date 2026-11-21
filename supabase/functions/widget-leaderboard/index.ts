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
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function nairobiWeekStart() {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}
function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const token = req.headers.get("x-widget-token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return json({ error: "Widget token required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const secret = keyFromJson("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return json({ error: "Function configuration is incomplete" }, 500);
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256Hex(token);
  const { data: device, error: tokenError } = await admin.from("device_tracking_tokens")
    .select("id,user_id").eq("token_hash", tokenHash).eq("platform", "android_widget")
    .is("revoked_at", null).maybeSingle();
  if (tokenError) return json({ error: tokenError.message }, 500);
  if (!device) return json({ error: "Widget access revoked" }, 401);

  const viewerId = String(device.user_id);
  const { data: group, error: groupError } = await admin.from("groups")
    .select("id,member_limit").eq("name", "Founding 250").eq("is_system", true).limit(1).maybeSingle();
  if (groupError) return json({ error: groupError.message }, 500);
  if (!group) return json({ error: "Leaderboard group unavailable" }, 404);

  const { data: membership, error: membershipError } = await admin.from("group_members")
    .select("joined_at").eq("group_id", group.id).eq("user_id", viewerId).maybeSingle();
  if (membershipError) return json({ error: membershipError.message }, 500);
  await admin.from("device_tracking_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);

  const capacity = Number(group.member_limit || 250);
  if (!membership) return json({ joined: false, capacity, top: [], viewer: null });

  const { data: members, error: membersError } = await admin.from("group_members")
    .select("user_id,joined_at").eq("group_id", group.id);
  if (membersError) return json({ error: membersError.message }, 500);
  const memberIds = (members || []).map((row: any) => String(row.user_id));
  if (!memberIds.includes(viewerId)) return json({ joined: false, capacity, top: [], viewer: null });

  const weekStart = nairobiWeekStart();
  const weekEnd = addDays(weekStart, 7);
  const [{ data: profiles, error: profilesError }, { data: steps, error: stepsError },
    { data: settings, error: settingsError }, { data: blocks, error: blocksError }] = await Promise.all([
    admin.from("profiles").select("id,display_name,show_group_steps").in("id", memberIds),
    admin.from("daily_steps").select("user_id,step_date,steps,synced_at,is_flagged,source")
      .in("user_id", memberIds).gte("step_date", weekStart).lt("step_date", weekEnd),
    admin.from("leaderboard_settings").select("count_synced_only").eq("id", true).maybeSingle(),
    admin.from("blocks").select("blocker_id,blocked_id"),
  ]);
  if (profilesError || stepsError || settingsError || blocksError) {
    return json({ error: profilesError?.message || stepsError?.message || settingsError?.message || blocksError?.message }, 500);
  }

  const blocked = new Set<string>();
  for (const row of blocks || []) {
    if (String(row.blocker_id) === viewerId) blocked.add(String(row.blocked_id));
    if (String(row.blocked_id) === viewerId) blocked.add(String(row.blocker_id));
  }
  const memberById = new Map((members || []).map((row: any) => [String(row.user_id), row]));
  const profileById = new Map((profiles || []).map((row: any) => [String(row.id), row]));
  const countSyncedOnly = Boolean(settings?.count_synced_only);
  const stepRows = steps || [];
  const ranked = memberIds
    .filter((id) => id === viewerId || (!blocked.has(id) && profileById.get(id)?.show_group_steps === true))
    .map((id) => {
      const daily = stepRows.filter((row: any) => String(row.user_id) === id &&
        !row.is_flagged && (!countSyncedOnly || String(row.source || "").toLowerCase() === "synced"));
      const total = daily.reduce((sum: number, row: any) => sum + Number(row.steps || 0), 0);
      const reachedTimes = daily.filter((row: any) => Number(row.steps || 0) > 0)
        .map((row: any) => Date.parse(row.synced_at || "")).filter(Number.isFinite);
      const profile = profileById.get(id);
      const member = memberById.get(id);
      return {
        user_id: id,
        handle: String(profile?.display_name || "").trim() || "Member",
        steps: total,
        reached_at: reachedTimes.length ? Math.min(...reachedTimes) : null,
        joined_at: Date.parse(member?.joined_at || "") || 0,
      };
    });

  ranked.sort((a, b) => {
    if (a.steps !== b.steps) return b.steps - a.steps;
    if (a.reached_at !== b.reached_at) {
      if (a.reached_at === null) return 1;
      if (b.reached_at === null) return -1;
      return a.reached_at - b.reached_at;
    }
    if (a.joined_at !== b.joined_at) return a.joined_at - b.joined_at;
    return a.user_id.localeCompare(b.user_id);
  });
  const withRanks = ranked.map((row, index) => ({
    rank: index + 1, handle: row.handle, steps: row.steps, user_id: row.user_id,
  }));
  const viewer = withRanks.find((row) => row.user_id === viewerId) || null;
  const top = withRanks.slice(0, 3).map(({ rank, handle, steps }) => ({ rank, handle, steps }));
  const leader = top[0] || null;
  return json({
    joined: true,
    capacity,
    week_start: weekStart,
    top,
    viewer: viewer ? { rank: viewer.rank, handle: viewer.handle, steps: viewer.steps } : null,
    leader,
  });
});
