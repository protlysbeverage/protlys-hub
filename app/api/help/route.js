import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPPORT_EMAIL = process.env.PROTLYS_SUPPORT_EMAIL || 'protlysbeverage@gmail.com';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to send a message.' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const category = String(body?.category || '').trim().toLowerCase();
  const message = String(body?.message || '').trim();
  const appVersion = String(body?.appVersion || 'Web/PWA').slice(0, 80);
  const deviceInfo = String(body?.deviceInfo || 'Unknown device').slice(0, 500);
  if (!['feedback', 'help', 'bug'].includes(category)) return NextResponse.json({ error: 'Choose feedback, help or bug.' }, { status: 400 });
  if (message.length < 5 || message.length > 4000) return NextResponse.json({ error: 'Message must be between 5 and 4000 characters.' }, { status: 400 });

  const { data: ticketId, error } = await supabase.rpc('submit_support_request', {
    p_category: category,
    p_message: message,
    p_app_version: appVersion,
    p_device_info: deviceInfo,
  });
  if (error) {
    const rateLimited = /wait before sending another message/i.test(error.message || '');
    return NextResponse.json({ error: rateLimited ? 'Please wait a few minutes before sending another message.' : 'We could not save your message. Please try again.' }, { status: rateLimited ? 429 : 500 });
  }

  let emailSent = false;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Protlys Hub <support@protlys.com>';
  if (apiKey && from) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [SUPPORT_EMAIL],
          reply_to: user.email || undefined,
          subject: `[Protlys Hub] ${category.toUpperCase()} from ${user.email || user.id}`,
          text: [
            `Type: ${category}`,
            `Account email: ${user.email || 'Unavailable'}`,
            `User ID: ${user.id}`,
            `App version: ${appVersion}`,
            `Device: ${deviceInfo}`,
            `Request ID: ${ticketId}`,
            '',
            message,
          ].join('\n'),
        }),
      });
      emailSent = response.ok;
    } catch {}
  }

  return NextResponse.json({ ok: true, ticketId, emailSent, supportEmail: SUPPORT_EMAIL });
}
