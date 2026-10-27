export const INVITE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function normalizeInviteCode(value=''){return String(value).toUpperCase().replace(/[\s-]+/g,'').split('').filter(c=>INVITE_ALPHABET.includes(c)).join('').slice(0,8)}
export function inviteMessage(result){switch(result?.status){case'not_found':return'Code not found. Check it and try again.';case'code_disabled':return'This code is no longer active.';case'group_full':return'This group is full.';case'rate_limited':return`Too many tries. Try again in ${Math.max(1,Number(result.minutes)||1)} min.`;case'already_member':return`You're already in ${result.name||'this group'}.`;default:return''}}
export function isInviteReady(code){return normalizeInviteCode(code).length===8}
export function inviteLink(code,origin='https://hub.protlys.com'){return origin.replace(/\/$/,'')+'/challenges?join='+encodeURIComponent(normalizeInviteCode(code))}
