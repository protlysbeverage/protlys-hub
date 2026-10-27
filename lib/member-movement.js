import {STEP_KM} from './leaderboard-week.js';
export const MEMBER_MOVEMENT_CACHE_MS=60000;
export function normalizeMovementWindow(days=[],todayKey){
 const end=new Date(todayKey+'T12:00:00Z');
 const normalized=Array.from({length:14},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-13+i);const date=d.toISOString().slice(0,10);const found=days.find(x=>String(x.date)===date);return {date,steps:Number(found?.steps)||0}});
 const previous=normalized.slice(0,7),current=normalized.slice(7),values=current.map(d=>Number(d.steps)||0),total=values.reduce((a,b)=>a+b,0),previousTotal=previous.reduce((a,d)=>a+(Number(d.steps)||0),0),average=Math.round(total/7),max=Math.max(...values,1),best=current.reduce((a,b)=>(Number(b.steps)||0)>(Number(a.steps)||0)?b:a,current[0]);
 let change='–',changeTone='neutral';if(previousTotal===0&&total>0){change='New';changeTone='positive'}else if(previousTotal>0){const pct=Math.round(((total-previousTotal)/previousTotal)*100);change=(pct>0?'+':'')+pct+'%';changeTone=pct>0?'positive':'neutral'}
 return {days:current,previous,total,previousTotal,average,max,best:total>0?best:null,change,changeTone,distanceKm:total*STEP_KM,movementDays:current.filter(d=>d.steps>0).length,stepsToday:current[6]?.steps||0};
}
export function barHeight(steps,max){const n=Number(steps)||0,m=Math.max(Number(max)||0,1);return Math.max(3,Math.round((n/m)*118));}
export function compactSteps(value){const n=Number(value)||0;if(n<1000)return String(Math.round(n));return (n/1000).toFixed(1).replace('.0','')+'k';}
export function dayMeta(date,todayKey){const d=new Date(date+'T12:00:00Z');return {weekday:new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(d),day:new Intl.DateTimeFormat('en-GB',{day:'numeric',timeZone:'UTC'}).format(d),detail:new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(d),today:date===todayKey};}
