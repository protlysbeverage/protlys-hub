import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_hub_member_count');

  if (error) {
    return NextResponse.json({ error: 'Unable to load member count.' }, { status: 500 });
  }

  return NextResponse.json(
    { count: Number(data || 0), capacity: 250 },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
