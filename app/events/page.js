import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import EventsClient from './EventsClient';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: events }, { data: myRsvps }] = await Promise.all([
    supabase.from('events')
      .select('*, event_rsvps(count)')
      .eq('is_published', true)
      .gte('event_date', today)
      .order('event_date', { ascending: true }),
    supabase.from('event_rsvps').select('event_id').eq('user_id', user.id),
  ]);

  const rsvpIds = new Set((myRsvps || []).map(r => r.event_id));

  return (
    <AppShell>
      <EventsClient
        events={events || []}
        rsvpIds={[...rsvpIds]}
        userId={user.id}
      />
    </AppShell>
  );
}
