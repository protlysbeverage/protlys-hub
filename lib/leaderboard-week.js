export const STEP_KM = 0.00075;

export function isoWeekStart(date = new Date(), timeZone = 'Africa/Nairobi') {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=t=>parts.find(p=>p.type===t)?.value;
  const key=`${get('year')}-${get('month')}-${get('day')}`;
  const noon=new Date(key+'T12:00:00Z');
  const dow=noon.getUTCDay() || 7;
  noon.setUTCDate(noon.getUTCDate()-(dow-1));
  return noon.toISOString().slice(0,10);
}

export function summarizeMemberWeek(days, weekStart, todayKey) {
  const normalized=Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+i);
    const date=d.toISOString().slice(0,10);
    const found=(days||[]).find(x=>String(x.date)===date);
    return {date,steps:Number(found?.steps||0)};
  });
  const weeklySteps=normalized.reduce((s,d)=>s+d.steps,0);
  const movementDays=normalized.filter(d=>d.steps>0).length;
  const current=weekStart===isoWeekStart(new Date(todayKey+'T12:00:00Z'),'UTC');
  const best=normalized.reduce((a,b)=>b.steps>a.steps?b:a,normalized[0]);
  return {days:normalized,weeklySteps,movementDays,distanceKm:weeklySteps*STEP_KM,isCurrentWeek:current,
    stepsToday:current?(normalized.find(d=>d.date===todayKey)?.steps||0):null,bestDay:current?null:best};
}

export function weekContextLabel(weekStart,currentWeekStart) {
  if(weekStart===currentWeekStart)return 'This week';
  return 'Week of '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(weekStart+'T12:00:00Z'));
}
