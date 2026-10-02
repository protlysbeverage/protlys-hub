'use client';

const LOOKS = {
  dark: { bg:'#232924', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', faint:'rgba(255,255,255,.12)', faded:'rgba(255,255,255,.20)', accent:'#6BCB45' },
  light: { bg:'#F7F8F6', fg:'#111111', muted:'rgba(17,17,17,.58)', faint:'rgba(17,17,17,.12)', faded:'rgba(17,17,17,.20)', accent:'#4F9F35' },
  surface: { bg:'#323A33', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', faint:'rgba(255,255,255,.12)', faded:'rgba(255,255,255,.20)', accent:'#6BCB45' },
};

const HEADLINES = {
  protein_today:['PROTEIN','TODAY'],
  protein_target:['PROTEIN','TARGET'],
  steps_today:['STEPS','THIS WEEK'],
  distance:['MOVED','THIS WEEK'],
  movement_days:['ACTIVE','DAYS'],
  lifetime_steps:['TOTAL','STEPS'],
  best_streak:['BEST','STREAK'],
};

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

export default function ShareCard({
  metric = 'steps_today',
  data = {},
  username = '',
  look = 'dark',
  theme,
  qrDataUrl = '',
  logoDataUrl = '',
  showUsername = true,
  cardWidth = 360,
}) {
  const t = LOOKS[look || theme || 'dark'] || LOOKS.dark;
  const w = Number(cardWidth) || 360;
  const h = Math.round(w * 16 / 9);
  const s = w / 360;
  const progress = clamp(data.progress);
  const headline = HEADLINES[metric] || ['PROGRESS',''];
  const weeklyDays = data.weeklyDays || [];
  const heatmapDays = data.heatmapDays || [];
  const isSteps = metric === 'steps_today';
  const isDistance = metric === 'distance';
  const isHeatmap = metric === 'movement_days' || metric === 'best_streak';
  const value = data.value ?? 0;
  const unit = data.unit || '';
  const label = data.label || '';
  const subtext = data.subtext || '';
  const period = data.period || '';
  const numberText = isDistance ? Number(value).toFixed(1) : Number(value).toLocaleString();
  const dailyAverage = data.dailyAverageText || '';
  const usernameText = String(username || 'protlys').replace(/^@/, '');
  const heatmapCell = Math.max(1, Math.floor((Math.round(w * .86) - Math.round(5*s) * 6) / 7));
  const px = Math.round(26*s);
  const py = Math.round(24*s);
  const gap = Math.max(2, Math.round(5*s));
  const chartLabel = isSteps ? 'This week' : isDistance ? 'This week' : period;

  return (
    <div data-protlys-share-card="true" data-look={look || theme || 'dark'} style={{
      width:w+'px', height:h+'px', boxSizing:'border-box', position:'relative', overflow:'hidden',
      background:t.bg, color:t.fg, padding:py+'px '+px+'px', display:'flex', flexDirection:'column',
      fontFamily:'Manrope,sans-serif', isolation:'isolate'
    }}>
      {(look === 'dark' || look === 'surface' || theme === 'dark' || theme === 'surface') && (
        <div style={{position:'absolute',inset:0,zIndex:-1,pointerEvents:'none',background:'radial-gradient(circle at 100% 0%,rgba(107,203,69,.25),rgba(107,203,69,.08) 24%,transparent 52%)'}} />
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:Math.round(37*s)}}>
        <img src={logoDataUrl} alt="Protlys" style={{display:'block',height:Math.round(32*s),width:Math.round(100*s),objectFit:'contain',objectPosition:'left center'}} />
        <div style={{fontSize:Math.round(11*s),fontWeight:700,color:t.muted,whiteSpace:'nowrap'}}>
          {new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date())}
        </div>
      </div>

      <div style={{marginTop:Math.round(20*s),fontFamily:'Space Grotesk,sans-serif',fontSize:Math.round(54*s),lineHeight:.82,letterSpacing:'-.055em',fontWeight:900,textTransform:'uppercase',whiteSpace:'nowrap'}}>
        <div>{headline[0]}</div>
        <div style={{color:t.faded}}>{headline[1]}</div>
      </div>

      <div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',padding:Math.round(15*s)+'px 0',overflow:'hidden'}}>
        {isHeatmap ? (
          <div style={{width:Math.round(w*.86),maxWidth:'100%'}}>
            <div style={{fontSize:Math.round(10*s),fontWeight:700,color:t.muted,textAlign:'center',marginBottom:Math.round(8*s)}}>Last 30 days</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,'+heatmapCell+'px)',gap:gap+'px',position:'relative',paddingTop:Math.round(10*s)}}>
              {['S','M','T','W','T','F','S'].map((d,i)=><div key={'weekday-'+i} style={{width:heatmapCell,height:Math.round(13*s),fontSize:Math.round(9*s),fontWeight:800,color:t.muted,textAlign:'center'}}>{d}</div>)}
              {heatmapDays.map((d,index)=>{
                const previous = heatmapDays[index - 1];
                const monthChanged = index === 0 || (previous && d.month !== previous.month);
                return (
                  <div key={d.key || index} style={{width:heatmapCell,height:heatmapCell,boxSizing:'border-box',borderRadius:Math.max(2,Math.round(4*s)),background:d.active?t.accent:t.faint,boxShadow:d.today?'inset 0 0 0 '+Math.max(1,Math.round(2*s))+'px '+t.fg:'none',display:'grid',placeItems:'center',fontSize:Math.round(10*s),fontWeight:800,color:d.active?t.bg:t.muted,position:'relative'}}>
                    {monthChanged && <span style={{position:'absolute',left:0,bottom:'100%',fontSize:Math.max(7,Math.round(8*s)),fontWeight:800,color:t.muted,whiteSpace:'nowrap'}}>{d.monthLabel}</span>}
                    {d.day}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{width:'100%',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {(isSteps || isDistance) ? (
              <div style={{width:'100%',textAlign:'center'}}>
                <div style={{fontSize:Math.round(11*s),fontWeight:800,color:t.muted,marginBottom:Math.round(10*s)}}>{chartLabel}</div>
                <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:Math.max(3,Math.round(7*s)),height:Math.round(102*s)}}>
                  {weeklyDays.map((d,index)=>{
                    const max = Math.max(...weeklyDays.map(x=>Number(isDistance ? x.distance : x.steps) || 0), 1);
                    const v = Number(isDistance ? d.distance : d.steps) || 0;
                    const barHeight = v ? Math.max(Math.round(6*s),Math.round(v/max*Math.round(74*s))) : Math.max(2,Math.round(3*s));
                    return <div key={d.key || index} style={{width:Math.max(8,Math.floor((w-px*2-42*s)/7)),height:Math.round(102*s),display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:Math.max(2,Math.round(4*s))}}>
                      <div style={{width:'100%',height:barHeight,background:v?t.accent:t.faint,borderRadius:Math.max(2,Math.round(4*s)),border:d.isToday?'2px solid '+t.fg:'none',boxSizing:'border-box'}} />
                      <span style={{fontSize:Math.max(7,Math.round(8*s)),fontWeight:d.isToday?800:600,color:d.isToday?t.accent:t.muted}}>{new Date(d.key+'T12:00:00').toLocaleDateString('en-KE',{weekday:'short'}).slice(0,1)}</span>
                    </div>;
                  })}
                </div>
              </div>
            ) : metric === 'best_streak' ? (
              <div style={{fontSize:Math.round(23*s),fontWeight:900,color:t.accent}}>{subtext}</div>
            ) : (
              <div style={{position:'relative',width:Math.round(130*s),height:Math.round(130*s)}}>
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                  <circle cx="50" cy="50" r="42" fill="none" stroke={t.faded} strokeWidth="7"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke={t.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray={2*Math.PI*42} strokeDashoffset={2*Math.PI*42*(1-progress)} transform="rotate(-90 50 50)"/>
                </svg>
                <span style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontSize:Math.round(22*s),fontWeight:900}}>{Math.round(progress*100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{flex:'0 0 auto',paddingTop:Math.round(16*s)}}>
        <div style={{display:'flex',alignItems:'center',gap:Math.round(9*s),minHeight:Math.round(27*s)}}>
          <div style={{width:Math.round(27*s),height:Math.round(27*s),flex:'0 0 auto',borderRadius:'50%',background:t.accent,color:t.bg,display:'grid',placeItems:'center',fontSize:Math.round(12*s),fontWeight:900}}>
            {usernameText.slice(0,1).toUpperCase()}
          </div>
          {showUsername && <div style={{fontFamily:'Manrope,sans-serif',fontSize:Math.round(12*s),fontWeight:700,color:t.fg,letterSpacing:'normal',lineHeight:1.2,width:Math.max(40,w-80*s),maxWidth:Math.max(40,w-80*s),whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>@{usernameText}</div>}
        </div>

        <div style={{display:'flex',alignItems:'baseline',gap:Math.round(7*s),marginTop:Math.round(12*s)}}>
          <span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:Math.round(49*s),lineHeight:.88,fontWeight:900,letterSpacing:'-.055em',whiteSpace:'nowrap'}}>{numberText}</span>
          <span style={{fontSize:Math.round(12*s),fontWeight:800,color:t.muted}}>{unit}</span>
        </div>
        <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:Math.round(13*s),fontWeight:800,marginTop:Math.round(9*s),whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
        {subtext && <div style={{fontSize:Math.max(8,Math.round(10*s)),color:t.muted,marginTop:Math.round(6*s),whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtext}</div>}
        {dailyAverage && <div style={{fontSize:Math.max(8,Math.round(10*s)),color:t.muted,marginTop:Math.round(4*s)}}>{dailyAverage}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:Math.round(15*s)}}>
          <div style={{width:Math.round(76*s),height:Math.round(76*s),padding:Math.round(6*s),boxSizing:'border-box',background:'#fff',borderRadius:Math.max(2,Math.round(4*s))}}>
            {qrDataUrl && <img src={qrDataUrl} alt="" style={{display:'block',width:'100%',height:'100%'}} />}
          </div>
        </div>
        <div style={{fontSize:Math.max(7,Math.round(8.5*s)),color:t.muted,marginTop:Math.round(6*s),textAlign:'right',whiteSpace:'nowrap'}}>Scan to find your protein target</div>
      </div>
    </div>
  );
}
