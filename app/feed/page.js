import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import FeedClient from '@/app/FeedClient';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Ffeed');

  return (
    <AppShell>
      <FeedClient
        posts={[]}
        likedIds={[]}
        userId={user.id}
        profile={null}
        loadError={null}
        hasMore={true}
        nextOffset={0}
      />
    </AppShell>
  );
}
