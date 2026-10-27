'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

const TYPES=[
 ['steps','Steps','Total steps walked','steps',10000,1000000,'👣',[10000,30000,70000,100000]],
 ['protein','Protein','Grams logged','g',100,10000,'🥛',[50,100,150]],
 ['movement_days','Movement days','Days you moved','days',5,90,'🏃',[3,5,7]],
 ['stillness','Stillness','Minutes of sessions','min',30,10000,'🧘',[10,30,60]],
 ['distance','Distance','Estimated km','km',5,10000,'📍',[5,10,25]]
];
const today=()=>new Date().toISOString().slice(0,10);
const plus7=()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10)};
const dayCount=(a,b)=>Math.floor((new Date(b)-new Date(a))/86400000);

export default function NewChallengeClient({groupId}){
 const router=useRouter();
 const [group,setGroup]=useState(null),[name,setName]=useState(''),[description,setDescription]=useState(''),[type,setType]=useState('steps'),[target,setTarget]=useState('10000'),[score,setScore]=useState('total'),[start,setStart]=useState(today()),[end,setEnd]=useState(plus7()),[visibility,setVisibility]=useState(groupId?'private':'public'),[teams,setTeams]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[dirty,setDirty]=useState(false),[vh,setVh]=useState('100dvh');
 const spec=useMemo(()=>TYPES.find(x=>x[0]===type),[type]);
 const days=start&&end&&end>=start?dayCount(start,end):0;
 const dateError=end<start?'End date cannot be before the start date.':days>90?'Challenges can be at most 90 days.':'';

 useEffect(()=>{
  if(groupId){createClient().from('groups').select('id,name').eq('id',groupId).maybeSingle().then(({data})=>setGroup(data||null))}
  const vv=window.visualViewport,s=()=>setVh((vv?.height||window.innerHeight)+'px');s();vv?.addEventListener('resize',s);vv?.addEventListener('scroll',s);
  const pop=()=>{if(dirty&&!window.confirm('Discard this?')){history.pushState({},'',location.href);return}router.replace('/challenges')};history.pushState({},'',location.href);
  addEventListener('popstate',pop);return()=>{vv?.removeEventListener('resize',s);vv?.removeEventListener('scroll',s);removeEventListener('popstate',pop)};
 },[groupId,router]);
 useEffect(()=>setTarget(String(spec[4])),[type,spec]);

 const valid=name.trim().length>=3&&name.trim().length<=50&&description.length<=200&&/^\d+$/.test(target)&&Number(target)>0&&Number(target)<=spec[5]&&!!start&&!!end&&!dateError;
 const setField=(setter)=>(e)=>{setter(e.target.value);setDirty(true)};
 const close=()=>{if(dirty&&!window.confirm('Discard this?'))return;router.replace('/challenges')};

 async function submit(e){
  e.preventDefault();if(!valid||busy)return;setBusy(true);setError('');
  let createdChallengeId=null;const supabase=createClient();
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in again.');
   const {data:c,error:e1}=await supabase.from('challenges').insert({creator_id:user.id,name:name.trim(),description:description.trim()||null,challenge_type:type,target:Number(target),scoring_mode:score,step_target:type==='steps'?Number(target):0,start_date:start,end_date:end,visibility:groupId?'private':visibility,allow_teams:teams,group_id:groupId||null}).select('id').single();
   if(e1)throw e1;createdChallengeId=c.id;
   const m=await supabase.from('challenge_members').insert({challenge_id:c.id,user_id:user.id});if(m.error)throw m.error;
   setDirty(false);sessionStorage.setItem('protlys-toast','Challenge created');router.replace('/challenges');router.refresh();
  }catch(err){
   if(createdChallengeId)await supabase.from('challenges').delete().eq('id',createdChallengeId);
   setError(err?.message||'We could not create that challenge. Please try again.');setBusy(false);
  }
 }

 const previewUnit=spec[3],previewType=spec[6];
 return <main className="protlys-fullscreen" style={{height:vh}}>
  <header className="fullscreen-topbar">
   <button type="button" aria-label="Close" className="fullscreen-close" onClick={close}>×</button>
   <h1>New challenge</h1>
   <button type="submit" form="challenge-form" disabled={!valid||busy} className="fullscreen-create">{busy?<span className="fullscreen-spinner"/>:'Create'}</button>
  </header>
  <form id="challenge-form" className="fullscreen-form" onSubmit={submit}>
   <div className="fullscreen-body">
    <div className="fullscreen-section-label">THE BASICS</div>
    <label className="fullscreen-field"><span>Challenge name</span><input autoFocus maxLength={50} value={name} onChange={setField(setName)} placeholder="Name your challenge"/><em>{name.trim().length}/50</em></label>
    <label className="fullscreen-field textarea-field"><span>What is it about? <b>Optional</b></span><textarea maxLength={200} value={description} onChange={setField(setDescription)} placeholder="Add a short description"/><em>{description.length}/200</em></label>

    <div className="fullscreen-section-label">WHAT ARE WE TRACKING?</div>
    <div className="challenge-type-grid">{TYPES.map(x=>
      <button key={x[0]} type="button" className={type===x[0]?'challenge-type-card selected':'challenge-type-card'} onClick={()=>{setType(x[0]);setDirty(true)}} aria-pressed={type===x[0]}>
       <span className="type-icon">{x[6]}</span>{type===x[0]&&<span className="type-tick">✓</span>}
       <strong>{x[1]}</strong><small>{x[2]}</small>
      </button>)}</div>

    <div className="fullscreen-section-label">TARGET</div>
    <label className="fullscreen-field target-field"><span>Target</span><input inputMode="numeric" type="text" pattern="[0-9]*" value={target} onChange={e=>{setTarget(e.target.value.replace(/\D/g,'').slice(0,7));setDirty(true)}}/><i>{previewUnit}</i></label>
    <div className="quick-picks">{spec[7].map(v=><button key={v} type="button" className={Number(target)===v?'quick-chip selected':'quick-chip'} onClick={()=>{setTarget(String(v));setDirty(true)}}>{v.toLocaleString()}</button>)}</div>
    <div className="field-helper">Maximum {spec[5].toLocaleString()} {previewUnit}</div>

    <div className="fullscreen-section-label">HOW IS IT SCORED?</div>
    <div className="fullscreen-segmented">{[['total','Total over challenge'],['days_hit','Days you hit it']].map(([v,label])=><button key={v} type="button" className={score===v?'active':''} onClick={()=>{setScore(v);setDirty(true)}}>{label}</button>)}</div>
    <p className="segmented-help">{score==='total'?"Everyone's steps add up across the dates.":"A day counts when you reach the target."}</p>

    <div className="fullscreen-section-label">DATES</div>
    <div className="date-grid">
     <label className="fullscreen-field"><span>Start</span><input type="date" value={start} onChange={setField(setStart)}/></label>
     <label className="fullscreen-field"><span>End</span><input type="date" value={end} min={start} onChange={setField(setEnd)}/></label>
    </div>
    <div className="date-helper">{days>0?days+' days':'Choose valid dates'} · up to 90 days allowed</div>
    {dateError&&<div className="inline-validation">{dateError}</div>}

    <div className="fullscreen-section-label">WHO CAN SEE THIS?</div>
    <div className="fullscreen-segmented visibility-segmented">{[['public','🌍 Public'],['private','🔒 Private']].map(([v,label])=><button key={v} type="button" disabled={!!groupId} className={visibility===v?'active':''} onClick={()=>{setVisibility(v);setDirty(true)}}>{label}</button>)}</div>
    {group&&<div className="field-helper">Group: {group.name}. Visibility is locked to group members.</div>}
    <button type="button" className="teams-row" onClick={()=>{setTeams(v=>!v);setDirty(true)}} aria-pressed={teams}><span><strong>Allow teams</strong><small>Members can join as a team</small></span><span className={teams?'toggle on':'toggle'}><i/></span></button>

    <div className="fullscreen-section-label">PREVIEW</div>
    <div className="challenge-preview"><small>COMMUNITY CHALLENGE</small><strong>{name.trim()||'Your challenge'}</strong><span>{previewType} {Number(target||0).toLocaleString()} {previewUnit} · {days||7} days · {groupId?'🔒 Private':visibility==='public'?'🌍 Public':'🔒 Private'}</span></div>
    {error&&<div className="fullscreen-error" role="alert">{error}</div>}
   </div>
   <footer className="fullscreen-footer"><button type="submit" disabled={!valid||busy} className="fullscreen-footer-button">{busy?<><span className="fullscreen-spinner"/>Creating challenge…</>:'Create challenge'}</button></footer>
  </form>
 </main>
}
