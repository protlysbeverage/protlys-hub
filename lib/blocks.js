export async function getBlockedUserIds(supabase, userId) {
  if (!userId) return [];
  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
  return [...new Set((data || []).map(row => String(row.blocked_id)).filter(Boolean))];
}

export function filterBlockedRows(rows, blockedIds, userId, key = 'user_id') {
  const blocked = new Set((blockedIds || []).map(String));
  return (rows || []).filter(row => {
    const id = row?.[key];
    return !id || String(id) === String(userId) || !blocked.has(String(id));
  });
}
