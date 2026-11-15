import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, x-health-token",
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
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function calculateStreak(rows: Array<{ step_date: string; steps: number }>) {
  const dates = [...new Set(rows.filter((r) => Number(r.steps) > 0).map((r) => r.step_date))].sort();
  if (!dates.length) return 0;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const yesterday = addDays(today, -1);
  const last = dates[dates.length - 1];
  if (last !== today && last !== yesterday) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    if (addDays(dates[i - 1], 1) !== dates[i]) break;
    streak++;
  }
  return streak;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("x-health-token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return json({ error: "Invalid tracking token" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const secret = keyFromJson("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return json({ error: "Function configuration is incomplete" }, 500);

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256Hex(token);
  const { data: connection, error: connectionError } = await admin
    .from("device_tracking_tokens")
    .select("id,user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (connectionError) return json({ error: connectionError.message }, 500);
  if (!connection) return json({ error: "Tracking connection is not active" }, 401);

  const body = await req.json().catch(() => ({}));
  const days = Array.isArray(body?.days) ? body.days : [];
  if (days.length < 1 || days.length > 31) return json({ error: "Send between 1 and 31 days" }, 400);

  // Restrict client-supplied dates to the supported rolling history window.
  return json({
    ok: true,
    synced: cleaned.length,
    today_steps: cleaned.find((row) => row.step_date === today)?.steps ?? null,
  });
});
