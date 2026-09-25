'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileLiveRefresh({ profileId }) {
  const router = useRouter();

  useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();
    const refresh = () => router.refresh();

    const channel = supabase
      .channel(`profile-movement-${profileId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feed_posts',
        filter: `user_id=eq.${profileId}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_steps',
        filter: `user_id=eq.${profileId}`,
      }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, router]);

  return null;
}
