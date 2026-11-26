import { createClient } from '@/lib/supabase/server';

const SUPPORT_EMAIL = process.env.PROTLYS_EMAIL || 'protlysbeverage@gmail.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Protlys Hub <support@protlys.com>';

function deviceFromUserAgent(userAgent = '') {
  const android = userAgent.match(/Android[^;)]*;\s*([^;)]+)/i);
  if (android?.[1]) return android[1].replace(/\s+Build\/.*/i, '').trim().slice(0, 120);
  const apple = userAgent.match(/(iPhone|iPad|iPod)/i);
  return apple?.[1] || 'Unknown device';
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Please sign in to send feedback.' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const type = String(body?.type || '').trim();
  const message = String(body?.message || '').trim();
  const email = String(body?.email || user.email || '').trim().toLowerCase();
  const appVersion = String(body?.appVersion || process.env.NEXT_PUBLIC_APP_VERSION || '1.3.3').trim().slice(0, 80);
  const userAgent = request.headers.get('user-agent') || '';
  const deviceModel = String(body?.deviceModel || deviceFromUserAgent(userAgent)).trim().slice(0, 120);

  if (!['Feedback', 'Help', 'Bug'].includes(type)) return Response.json({ error: 'Choose Feedback, Help or Bug.' }, { status: 400 });
  if (!message || message.length > 5000) return Response.json({ error: 'Please enter a message (up to 5,000 characters).' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('feedback_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  if (countError) return Response.json({ error: 'Could not check the submission limit. Please try again.' }, { status: 500 });
  if ((count || 0) >= 3) return Response.json({ error: 'You have reached the limit of 3 messages per hour. Please try again later.' }, { status: 429 });

  const { data: saved, error: saveError } = await supabase
    .from('feedback_submissions')
    .insert({
      user_id: user.id,
      email,
      type,
      message,
      app_version: appVersion,
      device_model: deviceModel,
      user_agent: userAgent.slice(0, 1000),
    })
    .select('id')
    .single();
  if (saveError) return Response.json({ error: 'Your message could not be saved. Please try again.' }, { status: 500 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await supabase.from('feedback_submissions').update({ status: 'email_not_configured' }).eq('id', saved.id);
    return Response.json({ error: 'Your message was saved, but email delivery is not configured yet. Please use “Email us instead” for now.' }, { status: 503 });
  }

  let emailResponse;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [SUPPORT_EMAIL],
      reply_to: email,
      subject: `[Protlys Hub] ${type} from ${email}`,
      text: [
        `Type: ${type}`,
        `Reply to: ${email}`,
        `App version: ${appVersion}`,
        `Device model: ${deviceModel}`,
        `User ID: ${user.id}`,
        `Submission ID: ${saved.id}`,
        '',
        message,
      ].join('\\n'),
    }),
    });
  } catch {
    await supabase.from('feedback_submissions').update({ status: 'email_failed' }).eq('id', saved.id);
    return Response.json({ error: 'Your message was saved, but the email service could not be reached. Please use “Email us instead” if urgent.' }, { status: 502 });
  }

  if (!emailResponse.ok) {
    await supabase.from('feedback_submissions').update({ status: 'email_failed' }).eq('id', saved.id);
    return Response.json({ error: 'Your message was saved, but we could not send the notification. Please use “Email us instead” if urgent.' }, { status: 502 });
  }

  await supabase.from('feedback_submissions').update({ status: 'sent' }).eq('id', saved.id);
  return Response.json({ sent: true });
}
