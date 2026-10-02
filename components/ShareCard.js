'use client';

const LOOKS = {
  dark: { bg:'#232924', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', accent:'#6BCB45' },
  light: { bg:'#F7F8F6', fg:'#111111', muted:'rgba(17,17,17,.58)', tint:'rgba(79,159,53,.12)', dim:'rgba(79,159,53,.28)', accent:'#4F9F35' },
  surface: { bg:'#323A33', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', accent:'#6BCB45' },
};

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

function hexToRgba(hex, alpha) {
  const value = String(hex).replace('#','');
  const r = parseInt(value.slice(0,2),16);
  const g = parseInt(value.slice(2,4),16);
  const b = parseInt(value.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ActivityHeatmap({ days = [], highlight = [], width = 308, accent = '#6BCB45', fg = '#FFFFFF', muted = 'rgba(255,255,255,.62)', tint = 'rgba(107,203,69,.12)', dim = 'rgba(107,203,69,.28)' }) {
  const safeDays = Array.isArray(days) ? days.slice(-30) : [];
  const cols = 7;
  const gap = 4;
  const cell = Math.max(10, Math.floor((Number(width) - gap * (cols - 1)) / cols));
  const highlighted = new Set(highlight || []);
  const weekdays = ['S','M','T','W','T','F','S'];

  return (
    <div style={{width:`${cell * 7 + gap * 6}px`,maxWidth:'100%',boxSizing:'border-box'}}>
      <div style={{display:'grid',gridTemplateColumns:`repeat(7,${cell}px)`,columnGap:`${gap}px`,rowGap:'4px'}}>
        {weekdays.map((day,index)=><div key={`weekday-${index}`} style={{width:`${cell}px`,height:'14px',fontSize:'9px',fontWeight:800,color:muted,textAlign:'center',lineHeight:'14px'}}>{day}</div>)}
        {Array.from({length:safeDays.length ? new Date(safeDays[0].key + 'T12:00:00').getDay() : 0}, (_,index) => <div key={`leading-${index}`} style={{width:`${cell}px`,height:`${cell}px`}} />)}
        {safeDays.map((day,index)=>{
          const logged = Boolean(day?.logged ?? day?.active);
          const strong = highlighted.size > 0 && highlighted.has(day.key);
          const background = logged ? (highlighted.size === 0 ? accent : strong ? accent : dim) : tint;
          const monthLabel = day?.monthChanged || index === 0;
          return (
            <div key={day.key || index} style={{
              width:`${cell}px`,height:`${cell}px`,boxSizing:'border-box',position:'relative',
              borderRadius:'4px',background,display:'grid',placeItems:'center',
              color:logged ? '#111111' : muted,fontSize:'10px',fontWeight:800,
              boxShadow:day?.today ? `inset 0 0 0 2px ${fg}` : 'none',
            }}>
              {monthLabel && <span style={{position:'absolute',left:0,bottom:`${cell + 2}px`,fontSize:'8px',fontWeight:800,color:muted,whiteSpace:'nowrap'}}>{day.monthLabel}</span>}
              {day.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyBars({ days = [], distance = false, look, width = 308 }) {
  const safeDays = Array.isArray(days) ? days.slice(-7) : [];
  const max = Math.max(...safeDays.map(day => Number(distance ? day.distance : day.steps) || 0), 1);
  const barWidth = Math.max(14, Math.floor((Number(width) - 6 * 6) / 7));
  return (
    <div style={{width:`${barWidth * 7 + 6 * 6}px`,maxWidth:'100%',display:'flex',alignItems:'flex-end',justifyContent:'center',gap:'6px',height:'112px'}}>
      {safeDays.map((day,index)=>{
        const value = Number(distance ? day.distance : day.steps) || 0;
        const height = value ? Math.max(8, Math.round((value / max) * 76)) : 4;
        const label = new Date(day.key + 'T12:00:00Z').toLocaleDateString('en-KE',{weekday:'short',timeZone:'Africa/Nairobi'}).slice(0,1);
        return <div key={day.key || index} style={{width:`${barWidth}px`,height:'112px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:'5px'}}>
          <div style={{width:`${barWidth}px`,height:`${height}px`,background:value ? look.accent : look.tint,borderRadius:'4px',boxSizing:'border-box',boxShadow:day.isToday ? `inset 0 0 0 2px ${look.fg}` : 'none'}} />
          <span style={{fontSize:'8px',fontWeight:day.isToday?800:600,color:day.isToday?look.accent:look.muted}}>{label}</span>
        </div>;
      })}
    </div>
  );
}

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
  const visual = data.visual || {};
  const headline = Array.isArray(data.headline) ? data.headline : ['PROGRESS',''];
  const value = Number(data.number ?? data.value ?? 0);
  const numberText = data.unit === 'km' ? value.toFixed(1) : value.toLocaleString();
  const usernameText = String(username || 'protlys').replace(/^@/, '');
  const px = '7.22cqw';
  const py = '6.67cqw';
  const qrSize = '21.11cqw';

  return (
    <div data-protlys-share-card="true" style={{
      width:'100%',height:'100%',boxSizing:'border-box',position:'relative',overflow:'hidden',
      background:t.bg,color:t.fg,padding:`${py}px ${px}px`,display:'flex',flexDirection:'column',
      fontFamily:'Manrope,sans-serif',isolation:'isolate'
    }}>
      <div style={{position:'absolute',inset:0,zIndex:-1,pointerEvents:'none',background:'radial-gradient(circle at 100% 0%,rgba(107,203,69,.22),rgba(107,203,69,.07) 24%,transparent 52%)'}} />

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'10.28cqw'}}>
        <img src={logoDataUrl} alt="Protlys" style={{display:'block',height:'8.89cqw',width:'27.78cqw',objectFit:'contain',objectPosition:'left center'}} />
        <div style={{fontSize:'3.06cqw',fontWeight:700,color:t.muted,whiteSpace:'nowrap'}}>
          {new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date())}
        </div>
      </div>

      <div style={{marginTop:'5.56cqw',fontFamily:'Space Grotesk,sans-serif',fontSize:'13.89cqw',lineHeight:.84,letterSpacing:'-.055em',fontWeight:900,textTransform:'uppercase',whiteSpace:'nowrap'}}>
        <div>{headline[0]}</div>
        <div style={{color:t.dim}}>{headline[1]}</div>
      </div>

      <div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'4.17cqw 0',overflow:'hidden'}}>
        {visual.type === 'heatmap' ? (
          <ActivityHeatmap
            days={visual.days || data.heatmapDays || []}
            highlight={visual.highlight || data.highlight || []}
            width={Math.round(w - px*2)}
            accent={t.accent}
            fg={t.fg}
            muted={t.muted}
            tint={t.tint}
            dim={t.dim}
          />
        ) : visual.type === 'bars' ? (
          <WeeklyBars days={visual.days || data.weeklyDays || []} distance={data.unit === 'km'} look={t} width={Math.round(w - px*2)} />
        ) : (
          <div style={{width:'35.56cqw',height:'35.56cqw',borderRadius:'50%',border:'2.22cqw solid '+t.dim,display:'grid',placeItems:'center',boxSizing:'border-box'}}>
            <span style={{fontSize:'6.94cqw',fontWeight:900,color:t.accent}}>{data.unit === 'km' ? numberText : numberText}</span>
          </div>
        )}
      </div>

      <div style={{flex:'0 0 auto',paddingTop:'3.33cqw'}}>
        {showUsername && (
          <div style={{display:'flex',alignItems:'center',gap:'2.5cqw',minHeight:'7.5cqw'}}>
            <div style={{width:'7.5cqw',height:'7.5cqw',borderRadius:'50%',background:t.accent,color:'#111111',display:'grid',placeItems:'center',fontSize:'3.33cqw',fontWeight:900}}>
              {usernameText.slice(0,1).toUpperCase()}
            </div>
            <div style={{fontFamily:'Manrope,sans-serif',fontSize:'3.33cqw',fontWeight:700,color:t.fg,letterSpacing:'normal',textTransform:'none',lineHeight:1.2,maxWidth:'75cqw',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>@{usernameText}</div>
          </div>
        )}

        <div style={{display:'flex',alignItems:'baseline',gap:'1.94cqw',marginTop:'3.06cqw'}}>
          <span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'13.06cqw',lineHeight:.88,fontWeight:900,letterSpacing:'-.055em',whiteSpace:'nowrap'}}>{numberText}</span>
          <span style={{fontSize:'3.33cqw',fontWeight:800,color:t.muted}}>{data.unit || ''}</span>
        </div>
        <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'3.61cqw',fontWeight:800,marginTop:'2.22cqw',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{data.label || ''}</div>
        {data.subtext && <div style={{fontSize:'2.78cqw',color:t.muted,marginTop:'1.67cqw',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{data.subtext}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:'2.78cqw'}}>
          <div style={{width:`${qrSize}px`,height:`${qrSize}px`,padding:'1.67cqw',boxSizing:'border-box',background:'#FFFFFF',borderRadius:'4px'}}>
            {qrDataUrl && <img src={qrDataUrl} alt="" style={{display:'block',width:'100%',height:'100%'}} />}
          </div>
        </div>
        <div style={{fontSize:'2.36cqw',color:t.muted,marginTop:'1.39cqw',textAlign:'right',whiteSpace:'nowrap'}}>Scan to find your protein target</div>
      </div>
    </div>
  );
}
