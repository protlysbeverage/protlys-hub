export const dynamic='force-static';
export function GET(){
 const sha=process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_BUILD_SHA||'local';
 const builtAt=process.env.NEXT_PUBLIC_BUILD_DATE||new Date().toISOString();
 return Response.json({sha,shortSha:String(sha).slice(0,7),buildDate:String(builtAt).slice(0,10),builtAt},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
