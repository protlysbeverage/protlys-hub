import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PROT_DAILY_LIMIT, PROT_HOURLY_LIMIT, PROT_MAX_INPUT_CHARS, PROT_MAX_OUTPUT_TOKENS, PROT_MODEL, PROT_SYSTEM_PROMPT } from '@/app/dot/config';

const STEP_GOAL=7500;
const buckets=globalThis.__protRateBuckets||(globalThis.__protRateBuckets=new Map());
const date=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi'}).format(d)};
const dates7=()=>Array.from({length:7},(_,i)=>date(i-6));
function limited(id){const now=Date.now(),hour=3600000,day=86400000,recent=(buckets.get(id)||[]).filter(t=>now-t<day);buckets.set(id,recent);if(recent.filter(t=>now-t<hour).length>=PROT_HOURLY_LIMIT||recent.length>=PROT_DAILY_LIMIT)return true;recent.push(now);return false}
async function safe(p,f=[]){try{const {data,error}=await p;return error?f:(data??f)}catch{return f}}
function chips(q){q=q.toLowerCase();if(/relax|stress|stillness|breath|unwind|calm|anxious|overwhelmed|tired/.test(q))return[{label:'Start Stillness',href:'/relaxation'}];if(/protein|food|target|eat/.test(q))return[{label:'Log protein',href:'/account'},{label:'View this week',href:'/hub/week'}];if(/leader|rank|challenge/.test(q))return[{label:'See leaderboard',href:'/leaderboard'},{label:'Challenges',href:'/challenges'}];if(/week|progress|step|walk|movement/.test(q))return[{label:'View this week',href:'/movement'},{label:'What should I do next?',href:'#prot-followups'}];return[{label:'How am I doing today?',href:'#prot-followups'},{label:'How am I doing this week?',href:'#prot-followups'},{label:'What should I focus on next?',href:'#prot-followups'}]}

function followUps(data,q){const s=Number(data.steps?.today||0),g=Number(data.steps?.goal||7500),p=Number(data.protein?.today_g||0),t=data.protein?.target_g;const out=[];if(/relax|stress|stillness|breath|unwind|calm|anxious|overwhelmed|tired/i.test(q))return [{label:'Open Stillness',href:'/relaxation'}];if(s<g)out.push({label:'How can I close my step gap?',href:'#prot-followups'});else out.push({label:'How did I do on steps today?',href:'#prot-followups'});if(t!=null&&p<t)out.push({label:'How can I close my protein gap?',href:'#prot-followups'});else out.push({label:'How is my protein looking today?',href:'#prot-followups'});out.push({label:'How am I doing this week?',href:'#prot-followups'});return out.slice(0,3)}

export async function POST(request){
 try{
  const body=await request.json(),message=String(body?.message||'').trim(),history=Array.isArray(body?.messages)?body.messages.slice(-10):[];
  if(!message||message.length>PROT_MAX_INPUT_CHARS)return NextResponse.json({error:`Keep your message under ${PROT_MAX_INPUT_CHARS} characters.`},{status:400});
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Please sign in to use PROT.'},{status:401});
  if(limited(user.id))return NextResponse.json({error:'PROT has had a busy hour. Try again a little later.'},{status:429});
  const days=dates7(),today=days[6],month=today.slice(0,7)+'-01T00:00:00';
  const [profile,steps,protein,stillness,challenges,rankThis,rankLast]=await Promise.all([
   safe(supabase.from('profiles').select('display_name,username,target_g,streak,step_streak,best_streak').eq('id',user.id).maybeSingle(),null),
   safe(supabase.from('daily_steps').select('step_date,steps').eq('user_id',user.id).gte('step_date',days[0]).lte('step_date',today)),
   safe(supabase.from('protein_logs').select('log_date,grams').eq('user_id',user.id).gte('log_date',days[0]).lte('log_date',today)),
   safe(supabase.from('meditation_sessions').select('completed_at').eq('user_id',user.id).gte('completed_at',month)),
   safe(supabase.from('challenge_members').select('challenge_id,challenges(name)').eq('user_id',user.id)),
   safe(supabase.rpc('get_my_rank',{p_scope:'world',p_group_id:null,p_period:'this_week'}),null),
   safe(supabase.rpc('get_my_rank',{p_scope:'world',p_group_id:null,p_period:'last_week'}),null)
  ]);
  const sm=Object.fromEntries(steps.map(r=>[r.step_date,Number(r.steps||0)])),pm={};protein.forEach(r=>pm[r.log_date]=(pm[r.log_date]||0)+Number(r.grams||0));
  const weekSteps=days.reduce((s,d)=>s+(sm[d]||0),0),weekProtein=days.reduce((s,d)=>s+(pm[d]||0),0);
  const userData={name:(profile?.display_name||profile?.username||'').split(/\s+/)[0]||null,steps:{today:sm[today]??0,this_week:weekSteps,daily_average:Math.round(weekSteps/7),goal:STEP_GOAL,last_7_days:days.map(d=>({date:d,steps:sm[d]??0}))},protein:{target_g:profile?.target_g??null,today_g:pm[today]??0,this_week_g:weekProtein,last_7_days:days.map(d=>({date:d,grams:pm[d]??0}))},streak:{current:Number(profile?.step_streak??profile?.streak??0),best:profile?.best_streak==null?null:Number(profile.best_streak)},stillness_sessions_this_month:stillness.length,leaderboard:{this_week:rankThis??null,last_week:rankLast??null},active_challenges:challenges.map(r=>r.challenges?.name).filter(Boolean)};
  const wantsStillness=/\\b(relax|relaxed|relaxation|stress|stressed|stillness|meditat|breath|unwind|calm|anxious|overwhelmed)\\b/i.test(message);
  if(wantsStillness)return NextResponse.json({reply:'Of course. Head to Stillness in Protlys and choose a session that fits how you feel right now.',suggestions:[{label:'Open Stillness',href:'/relaxation'}],mode:'direct'});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'PROT is resting, try again in a moment'},{status:503});
  const messages=history.filter(m=>['user','assistant','prot'].includes(m?.role)&&typeof m?.text==='string').map(m=>({role:m.role==='user'?'user':'assistant',content:m.text.slice(0,PROT_MAX_INPUT_CHARS)}));
  if(!messages.length||messages.at(-1).content!==message)messages.push({role:'user',content:message});
  const input=messages.map(m=>`${m.role}: ${m.content}`).join('\\n\\n');
  const ai=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:PROT_MODEL,instructions:PROT_SYSTEM_PROMPT+'\\n\\nUSER DATA:\\n'+JSON.stringify(userData),input,max_output_tokens:PROT_MAX_OUTPUT_TOKENS,store:false})});
  if(!ai.ok){
    const detail=await ai.text().catch(()=> '');
    console.error('OpenAI request failed',ai.status,detail.slice(0,1000));
    if(ai.status===429)return NextResponse.json({error:'PROT is temporarily busy. Please try again in a moment.'},{status:503});
    throw new Error('OpenAI '+ai.status);
  }
  const result=await ai.json(),reply=(result.output_text||result?.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'').trim();if(!reply)throw new Error('Empty response');
  return NextResponse.json({reply,suggestions:followUps(userData,message).map((item)=>item.href==='#prot-followups'?{...item,href:'#prot-followups'}:item),mode:'openai'});
 }catch(error){console.error('PROT route error:',error);return NextResponse.json({error:'PROT is resting, try again in a moment'},{status:500})}
}
