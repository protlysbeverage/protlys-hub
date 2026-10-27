export function hallUrl(pathname,search=''){return pathname+search+'#hall-of-fame';}
export function leaderboardUrl(pathname,search=''){return pathname+search;}
export function hallViewFromHash(hash){return hash==='#hall-of-fame'?'hall':'leaderboard';}
export function closeMemberSheet(view){return view;}
