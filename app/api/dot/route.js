import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function compactRows(rows = []) {
  return rows.map((row) => ({ date: row.step_date, steps: Number(row.steps || 0) }));
}

function localReply(message, profile, steps, proteinLogs, today) {
  const q = message.toLowerCase();
  const name = profile?.display_name ? String(profile.display_name).split(/\s+/)[0] : '';
  const target = Number(profile?.target_g || 0);
  const todaySteps = Number((steps || []).find((row) => row.step_date === today)?.steps || 0);
  const weekRows = (steps || []).filter((row) => {
    const d = new Date(`${row.step_date}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    return (now - d) / 86400000 < 7;
  });
  const weekStepTotal = weekRows.reduce((sum, row) => sum + Number(row.steps || 0), 0);
  const proteinToday = (proteinLogs || []).filter((row) => row.log_date === today).reduce((sum, row) => sum + Number(row.grams || 0), 0);
  const activeDays = weekRows.filter((row) => Number(row.steps || 0) > 0).length;
  const streak = Number(profile?.step_streak || profile?.streak || 0);

  if (/\b(hi|hello|hey|morning|good morning|good afternoon|good evening)\b/.test(q))
    return `Hi${name ? ` ${name}` : ''}. I’m PROT. Ask me about your steps, protein, streak, or what to focus on today.`;

  if (/(protein).*(target|goal)|target.*protein|protein.*how much/.test(q))
    return target > 0
      ? `Your current protein target is ${target} g. You’ve logged ${Math.round(proteinToday)} g today, leaving ${Math.max(0, Math.round(target - proteinToday))} g to reach it.`
      : 'You have not set a protein target yet. Once you set one in your Hub profile, I can track your progress against it.';

  if (/protein|intake|ate|eaten|grams|g\b/.test(q))
    return target > 0
      ? `Today you’ve logged ${Math.round(proteinToday)} g of protein against your ${target} g target. That leaves ${Math.max(0, Math.round(target - proteinToday))} g to go.`
      : `Today you’ve logged ${Math.round(proteinToday)} g of protein.`;

  if (/step|walk|movement|active|activity/.test(q))
    return `Today you’ve logged ${todaySteps.toLocaleString()} steps. Over the last 7 days, you’ve logged ${weekStepTotal.toLocaleString()} steps across ${activeDays} active day${activeDays === 1 ? '' : 's'}.`;

  if (/streak|consisten|habit/.test(q))
    return streak > 0
      ? `Your current streak is ${streak} day${streak === 1 ? '' : 's'}. Keep the next step simple and protect the routine.`
      : 'You do not currently have a recorded streak. Start with one manageable action today.';

  if (/today|focus|do next|should i|what should/.test(q)) {
    const gap = target > 0 ? Math.max(0, target - proteinToday) : null;
    if (todaySteps === 0 && gap !== null && gap > 0) return `Two useful wins today: get some movement in and aim for about ${Math.round(gap)} g more protein to reach your target.`;
    if (todaySteps === 0) return 'A simple focus for today: get some movement in, even if it is just a short walk.';
    if (gap !== null && gap > 0) return `You already have ${todaySteps.toLocaleString()} steps today. Your next useful focus is about ${Math.round(gap)} g more protein to reach your target.`;
    return `You’ve already logged ${todaySteps.toLocaleString()} steps today. Focus on keeping the routine consistent.`;
  }

  if (/week|progress|doing|summary/.test(q))
    return `This week: ${weekStepTotal.toLocaleString()} steps across ${activeDays} active day${activeDays === 1 ? '' : 's'}.${target > 0 ? ` Today’s protein: ${Math.round(proteinToday)} g of ${target} g.` : ''}`;

  return 'I can currently help with your Protlys steps, movement, protein intake, targets and streaks. Try “How am I doing this week?” or “What should I focus on today?”';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const message = String(body?.message || '').trim();
    if (!message || message.length > 2000)
      return NextResponse.json({ error: 'Please enter a message up to 2,000 characters.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in to use PROT.' }, { status: 401 });

    const [{ data: profile }, { data: steps }, { data: proteinLogs }] = await Promise.all([
      supabase.from('profiles').select('display_name,target_g,streak,step_streak,total_steps,last_step_date,activity_level').eq('id', user.id).maybeSingle(),
      supabase.from('daily_steps').select('step_date,steps').eq('user_id', user.id).order('step_date', { ascending: false }).limit(14),
      supabase.from('protein_logs').select('grams,product_label,log_date').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
    ]);

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
    const reply = localReply(message, profile || {}, steps || [], proteinLogs || [], today);
    return NextResponse.json({ reply, mode: 'local' });
  } catch (error) {
    console.error('PROT route error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
