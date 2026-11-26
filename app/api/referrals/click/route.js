import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const code = String(body?.code || '').trim().toUpperCase();
  const visitorId = String(body?.visitorId || '').trim();
  if (!code || !/^[A-Z0-9]{4,32}$/.test(code) || !/^[a-zA-Z0-9-]{16,80}$/.test(visitorId)) {
    return Response.json({ error: 'Invalid referral details.' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('record_referral_click', {
    p_code: code,
    p_visitor_id: visitorId,
  });
  if (error) return Response.json({ error: 'Could not record this invite.' }, { status: 500 });
  return Response.json({ recorded: Boolean(data) }, { headers: { 'Cache-Control': 'no-store' } });
}
