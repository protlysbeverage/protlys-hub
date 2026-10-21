import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
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
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = keyFromJson("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secret = keyFromJson("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishable || !secret) {
    return json({ error: "Function configuration is incomplete" }, 500);
  }

  const authClient = createClient(url, publishable, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "pair");

  if (action === "status") {
    const { data: connection, error } = await admin
      .from("device_tracking_tokens")
      .select("last_used_at,created_at")
      .eq("user_id", userData.user.id)
      .eq("platform", "android")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);

    return json({
      active: Boolean(connection),
      last_synced_at: connection?.last_used_at ?? null,
      paired_at: connection?.created_at ?? null,
    });
  }

  const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const tokenHash = await sha256Hex(rawToken);

  const platform = String(body?.platform || "android").slice(0, 30);
  const deviceName = body?.device_name
    ? String(body.device_name).slice(0, 120)
    : null;

  const { error } = await admin.from("device_tracking_tokens").insert({
    user_id: userData.user.id,
    token_hash: tokenHash,
    platform,
    device_name: deviceName,
  });

  if (error) return json({ error: error.message }, 500);

  return json({ token: rawToken });
});
