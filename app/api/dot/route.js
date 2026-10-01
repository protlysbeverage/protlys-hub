import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function compactRows(rows = []) {
  return rows.map((row) => ({
    date: row.step_date,
    steps: Number(row.steps || 0),
  }));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const message = String(body?.message || '').trim();
    if (!message || message.length > 2000) return NextResponse.json({ error: 'Please enter a message up to 2,000 characters.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in to use PROT.' }, { status: 401 });

    const [{ data: profile }, { data: steps }, { data: proteinLogs }] = await Promise.all([
      supabase.from('profiles').select('display_name,target_g,streak,step_streak,total_steps,last_step_date,activity_level').eq('id', user.id).maybeSingle(),
      supabase.from('daily_steps').select('step_date,steps').eq('user_id', user.id).order('step_date', { ascending: false }).limit(14),
      supabase.from('protein_logs').select('grams,product_label,log_date').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
    ]);

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
    const q = message.toLowerCase();
    const target = Number(profile?.target_g || 0);
    const todaySteps = Number((steps || []).find((row) => row.step_date === today)?.steps || 0);
    const weekRows = (steps || []).filter((row) => (new Date(`${today}T00:00:00`) - new Date(`${row.step_date}T00:00:00`)) / 86400000 < 7);
    const weekSteps = weekRows.reduce((sum, row) => sum + Number(row.steps || 0), 0);
    const activeDays = weekRows.filter((row) => Number(row.steps || 0) > 0).length;
    const proteinToday = (proteinLogs || []).filter((row) => row.log_date === today).reduce((sum, row) => sum + Number(row.grams || 0), 0);
    const streak = Number(profile?.step_streak || profile?.streak || 0);
    const gap = target > 0 ? Math.max(0, target - proteinToday) : null;
    const name = profile?.display_name ? String(profile.display_name).split(/\s+/)[0] : '';

    let reply;
    if (/\b(hi|hello|hey|morning|good morning|good afternoon|good evening)\b/.test(q)) reply = `Hi${name ? ` ${name}` : ''}. I’m PROT. Ask me about your steps, protein, streak, or what to focus on today.`;
    else if (/(protein).*(target|goal)|target.*protein|protein.*how much/.test(q)) reply = target > 0 ? `Your current protein target is ${target} g. You’ve logged ${Math.round(proteinToday)} g today, leaving ${gap} g to reach it.` : 'You have not set a protein target yet.';
    else if (/protein|intake|ate|eaten|grams|g\b/.test(q)) reply = target > 0 ? `Today you’ve logged ${Math.round(proteinToday)} g of protein against your ${target} g target. That leaves ${gap} g to go.` : `Today you’ve logged ${Math.round(proteinToday)} g of protein.`;
    else if (/step|walk|movement|active|activity/.test(q)) reply = `Today you’ve logged ${todaySteps.toLocaleString()} steps. Over the last 7 days, you’ve logged ${weekSteps.toLocaleString()} steps across ${activeDays} active day${activeDays === 1 ? '' : 's'}.`;
    else if (/streak|consisten|habit/.test(q)) reply = streak > 0 ? `Your current streak is ${streak} day${streak === 1 ? '' : 's'}. Keep the next step simple and protect the routine.` : 'You do not currently have a recorded streak. Start with one manageable action today.';
    else if (/today|focus|do next|should i|what should/.test(q)) reply = todaySteps === 0 && gap !== null && gap > 0 ? `Two useful wins today: get some movement in and aim for about ${gap} g more protein to reach your target.` : todaySteps === 0 ? 'A simple focus for today: get some movement in, even if it is just a short walk.' : gap !== null && gap > 0 ? `You already have ${todaySteps.toLocaleString()} steps today. Your next useful focus is about ${gap} g more protein to reach your target.` : `You’ve already logged ${todaySteps.toLocaleString()} steps today. Focus on keeping the routine consistent.`;
    else if (/week|progress|doing|summary/.test(q)) reply = `This week: ${weekSteps.toLocaleString()} steps across ${activeDays} active day${activeDays === 1 ? '' : 's'}.${target > 0 ? ` Today’s protein: ${Math.round(proteinToday)} g of ${target} g.` : ''}`;
    else reply = 'I can help with your Protlys steps, movement, protein intake, targets and streaks. Try “How am I doing this week?” or “What should I focus on today?”';

    return NextResponse.json({ reply, mode: 'local' });
  } catch (error) {
    console.error('PROT route error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
