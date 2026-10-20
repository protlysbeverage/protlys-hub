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
  const body=await request.json();
  const message=String(body?.message||'').trim();
  if(!message||message.length>PROT_MAX_INPUT_CHARS)return NextResponse.json({error:`Keep your message under ${PROT_MAX_INPUT_CHARS} characters.`},{status:400});

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Please sign in to use PROT.'},{status:401});

  const days=dates7(),today=days[6];
  const [profile,steps,protein]=await Promise.all([
   safe(supabase.from('profiles').select('display_name,username,target_g,streak,step_streak,best_streak').eq('id',user.id).maybeSingle(),null),
   safe(supabase.from('daily_steps').select('step_date,steps').eq('user_id',user.id).gte('step_date',days[0]).lte('step_date',today)),
   safe(supabase.from('protein_logs').select('log_date,grams').eq('user_id',user.id).gte('log_date',days[0]).lte('log_date',today))
  ]);

  const sm=Object.fromEntries(steps.map(r=>[r.step_date,Number(r.steps||0)]));
  const pm={};
  protein.forEach(r=>pm[r.log_date]=(pm[r.log_date]||0)+Number(r.grams||0));
  const weekSteps=days.reduce((s,d)=>s+(sm[d]||0),0);
  const weekProtein=days.reduce((s,d)=>s+(pm[d]||0),0);
  const userData={
   name:(profile?.display_name||profile?.username||'').split(/\s+/)[0]||null,
   steps:{today:sm[today]??0,this_week:weekSteps,daily_average:Math.round(weekSteps/7),goal:STEP_GOAL,last_7_days:days.map(d=>({date:d,steps:sm[d]??0}))},
   protein:{target_g:profile?.target_g??null,today_g:pm[today]??0,this_week_g:weekProtein,last_7_days:days.map(d=>({date:d,grams:pm[d]??0}))},
   streak:{current:Number(profile?.step_streak??profile?.streak??0),best:profile?.best_streak==null?null:Number(profile.best_streak)}
  };

  const q=message.toLowerCase();
  if(/relax|relaxed|relaxation|stress|stressed|stillness|meditat|breath|unwind|calm|anxious|overwhelmed|tired/.test(q)){
   return NextResponse.json({reply:'Take a moment for yourself. Open Stillness and choose a short session that fits how you feel right now.',suggestions:[{label:'Open Stillness',href:'/relaxation'}],mode:'direct'});
  }

  const fallback=()=>{
   const s=userData.steps.today,g=userData.steps.goal,p=userData.protein.today_g,t=userData.protein.target_g;
   if(/step|walk|movement|move/.test(q))return `You have ${s.toLocaleString()} steps today, with ${Math.max(g-s,0).toLocaleString()} to go to your ${g.toLocaleString()} goal. A short walk is a good next step.`;
   if(/protein|eat|food|target/.test(q)){
    if(t==null)return 'Your protein target is not set yet. Open Protein to calculate and save your daily target.';
    return p>=t?`You're at ${Math.round(p)} g of protein today, so you've reached your ${Math.round(t)} g target.`:`You're at ${Math.round(p)} g of protein today, with about ${Math.round(t-p)} g to go. A protein-rich snack or meal can help close the gap.`;
   }
   if(/week|progress|doing/.test(q))return `This week you've logged ${weekSteps.toLocaleString()} steps and ${Math.round(weekProtein)} g of protein. Your daily step average is ${userData.steps.daily_average.toLocaleString()}.`;
   return 'I can help with your steps, protein, streaks, challenges, Stillness, and how Protlys works. What would you like to check?';
  };

  if(!process.env.OPENAI_API_KEY){
   return NextResponse.json({reply:fallback(),suggestions:chips(message),mode:'fallback'});
  }

  const ai=await fetch('https://api.openai.com/v1/responses',{
   method:'POST',
   headers:{'content-type':'application/json','authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
   body:JSON.stringify({
    model:PROT_MODEL,
    instructions:PROT_SYSTEM_PROMPT+'\\n\\nUSER DATA:\\n'+JSON.stringify(userData),
    input:message,
    max_output_tokens:PROT_MAX_OUTPUT_TOKENS,
    store:false
   })
  });

  if(!ai.ok){
   const detail=await ai.text().catch(()=> '');
   console.error('OpenAI request failed',ai.status,detail.slice(0,1000));
   return NextResponse.json({reply:fallback(),suggestions:chips(message),mode:'fallback'});
  }

  const result=await ai.json();
  const reply=(result.output_text||result?.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'').trim();
  if(!reply)return NextResponse.json({reply:fallback(),suggestions:chips(message),mode:'fallback'});
  return NextResponse.json({reply,suggestions:followUps(userData,message),mode:'openai'});
 }catch(error){
  console.error('PROT route error:',error);
  return NextResponse.json({reply:'I can still help with your Protlys basics. Ask me about your steps, protein, weekly progress, or Stillness.',suggestions:chips(''),mode:'fallback'});
 }
}
