'use client';

const LOOKS = {
  dark: {
    bg: '#232924',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,.62)',
    tint: 'rgba(107,203,69,.12)',
    dim: 'rgba(107,203,69,.28)',
    accent: '#6BCB45',
    glow: true,
  },
  light: {
    bg: '#F7F8F6',
    fg: '#111111',
    muted: 'rgba(17,17,17,.58)',
    tint: 'rgba(79,159,53,.12)',
    dim: 'rgba(79,159,53,.28)',
    accent: '#4F9F35',
    glow: false,
  },
  surface: {
    bg: '#323A33',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,.62)',
    tint: 'rgba(107,203,69,.12)',
    dim: 'rgba(107,203,69,.28)',
    accent: '#6BCB45',
    glow: true,
  },
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateFromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatRange(days) {
  if (!days?.length) return '';
  const formatter = new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
  });
  return formatter.format(dateFromKey(days[0].key)) + ' – ' + formatter.format(dateFromKey(days[days.length - 1].key));
}

function formatToday() {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

export function ActivityHeatmap({ days = [], highlight = [], look }) {
  const cells = Array.isArray(days) ? days.slice(-35) : [];
  const highlighted = new Set(Array.isArray(highlight) ? highlight : []);
  const accent = look?.accent || '#6BCB45';
  const fg = look?.fg || '#FFFFFF';
  const muted = look?.muted || 'rgba(255,255,255,.62)';
  const tint = look?.tint || 'rgba(107,203,69,.12)';
  const dim = look?.dim || 'rgba(107,203,69,.28)';

  return (
    <div style={{ width: 296, height: 262, boxSizing: 'border-box', overflow: 'visible' }}>
      <div style={{ height: 14, lineHeight: '14px', marginBottom: 5, fontSize: 9, fontWeight: 700, color: muted }}>
        {formatRange(cells)}
      </div>

      <div style={{
        width: 296, height: 16, marginBottom: 5, display: 'grid',
        gridTemplateColumns: 'repeat(7, 38px)', columnGap: 5,
      }}>
        {WEEKDAYS.map((day, index) => (
          <div key={index} style={{
            width: 38, height: 16, textAlign: 'center',
            fontSize: 8, fontWeight: 800, lineHeight: '16px', color: muted,
          }}>{day}</div>
        ))}
      </div>

      <div style={{
        width: 296, height: 210, display: 'grid',
        gridTemplateColumns: 'repeat(7, 38px)',
        gridTemplateRows: 'repeat(5, 38px)',
        columnGap: 5, rowGap: 5,
      }}>
        {cells.map((day, index) => {
          const logged = Boolean(day?.logged ?? day?.active);
          const highlightedDay = highlighted.has(day.key);
          const strong = highlighted.size === 0 || highlightedDay;
          const future = Boolean(day?.future);
          const background = logged ? (strong ? accent : dim) : tint;
          const numberColor = logged ? '#111111' : fg;
          const monthInside = Boolean(day?.monthChanged || index === 0);

          return (
            <div key={day.key || index} style={{
              width: 38, height: 38, boxSizing: 'border-box',
              borderRadius: 5, background,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: numberColor, fontSize: 11, fontWeight: 800,
              lineHeight: 1,
              border: future ? '1px dashed rgba(255,255,255,.35)' : '0 solid transparent',
              outline: day?.today ? '2px solid ' + accent : 'none',
              outlineOffset: day?.today ? 2 : 0,
              position: 'relative',
            }}>
              {monthInside && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  fontSize: 7, fontWeight: 800, lineHeight: '8px',
                  color: logged ? 'rgba(17,17,17,.72)' : muted,
                }}>{day.monthLabel}</span>
              )}
              <span>{day.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyBars({ days = [], distance = false, look }) {
  const safe = Array.isArray(days) ? days.slice(-7) : [];
  const max = Math.max(...safe.map(day => Number(distance ? day.distance : day.steps) || 0), 1);

  return (
    <div style={{
      width: 312, height: 160, display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', gap: 8,
    }}>
      {safe.map((day, index) => {
        const value = Number(distance ? day.distance : day.steps) || 0;
        const height = value ? Math.max(8, Math.round((value / max) * 92)) : 4;
        const label = new Intl.DateTimeFormat('en-KE', {
          timeZone: 'Africa/Nairobi', weekday: 'short',
        }).format(dateFromKey(day.key)).slice(0, 1);

        return (
          <div key={day.key || index} style={{
            width: 36, height: 160, display: 'flex',
            flexDirection: 'column', alignItems: 'center',
            justifyContent: 'flex-end', gap: 7,
          }}>
            <div style={{
              width: 36, height, borderRadius: 5,
              background: value ? look.accent : look.tint,
              boxSizing: 'border-box',
              boxShadow: day.isToday ? 'inset 0 0 0 2px ' + look.fg : 'none',
            }} />
            <span style={{
              fontSize: 8, fontWeight: day.isToday ? 800 : 600,
              color: day.isToday ? look.accent : look.muted,
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({ progress, look }) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const degrees = p * 360;
  return (
    <div style={{
      width: 150, height: 150, borderRadius: 75,
      background: 'conic-gradient(' + look.accent + ' ' + degrees + 'deg, ' + look.dim + ' 0deg)',
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        width: 126, height: 126, borderRadius: 63,
        background: look.bg, display: 'grid', placeItems: 'center',
      }}>
        <span style={{
          fontFamily: 'Space Grotesk,sans-serif',
          fontSize: 28, lineHeight: 1, fontWeight: 900,
          color: look.accent,
        }}>{Math.round(p * 100)}%</span>
      </div>
    </div>
  );
}

function SummaryNumber({ value, look }) {
  return (
    <div style={{
      width: 312, height: 160, display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        fontFamily: 'Space Grotesk,sans-serif',
        fontSize: 54, lineHeight: .9, fontWeight: 900,
        color: look.accent,
      }}>{value}</div>
    </div>
  );
}

export default function ShareCard({
  metric = 'steps_today',
  data = {},
  username = '',
  avatarUrl = '',
  look = 'dark',
  theme,
  qrDataUrl = '',
  logoDataUrl = '',
  showUsername = true,
}) {
  const palette = LOOKS[look || theme || 'dark'] || LOOKS.dark;
  const visual = data.visual || {};
  const headline = Array.isArray(data.headline) ? data.headline : ['PROGRESS', ''];
  const value = Number(data.number ?? data.value ?? 0);
  const numberText = data.unit === 'km'
    ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : value.toLocaleString();
  const usernameText = String(username || 'protlys').replace(/^@/, '');
  const hasProgress = Number.isFinite(Number(data.progress)) && Number(data.progress) >= 0.4;

  return (
    <div data-protlys-share-card="true" style={{
      width: 360, height: 640, boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
      background: palette.bg, color: palette.fg,
      padding: 24, display: 'flex', flexDirection: 'column',
      fontFamily: 'Manrope,sans-serif', isolation: 'isolate',
    }}>
      {palette.glow && (
        <div style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 100% 0%,rgba(107,203,69,.18),rgba(107,203,69,.05) 24%,transparent 52%)',
        }} />
      )}

      <div style={{
        height: 28, flex: '0 0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <img
          src={logoDataUrl}
          alt="Protlys"
          style={{
            display: 'block', width: 78, height: 28,
            objectFit: 'contain', objectPosition: 'left center',
          }}
        />
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: palette.muted, whiteSpace: 'nowrap',
        }}>{formatToday()}</div>
      </div>

      <div style={{
        height: 86, flex: '0 0 86px', marginTop: 12,
        fontFamily: 'Anton,Space Grotesk,sans-serif',
        fontSize: 76, lineHeight: .82, fontWeight: 900,
        letterSpacing: '-0.035em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap', overflow: 'visible',
      }}>
        <div>{headline[0]}</div>
        <div style={{ color: palette.dim }}>{headline[1]}</div>
      </div>

      <div style={{
        height: 262, flex: '0 0 262px',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', overflow: 'visible',
      }}>
        {visual.type === 'heatmap' ? (
          <ActivityHeatmap
            days={visual.days || data.heatmapDays || []}
            highlight={visual.highlight || data.highlight || []}
            look={palette}
          />
        ) : visual.type === 'bars' ? (
          <WeeklyBars
            days={visual.days || data.weeklyDays || []}
            distance={data.unit === 'km'}
            look={palette}
          />
        ) : hasProgress ? (
          <ProgressRing progress={data.progress} look={palette} />
        ) : (
          <SummaryNumber value={numberText} look={palette} />
        )}
      </div>

      <div style={{
        height: 188, flex: '0 0 188px',
        position: 'relative', paddingTop: 4,
        boxSizing: 'border-box',
      }}>
        {showUsername && (
          <div style={{
            height: 28, display: 'flex', alignItems: 'center',
            gap: 10, fontSize: 11, fontWeight: 700,
            letterSpacing: 'normal', color: palette.fg,
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            <div style={{
              width: 28, height: 28, flex: '0 0 28px',
              borderRadius: 14, overflow: 'hidden',
              background: palette.accent, color: '#111111',
              display: 'grid', placeItems: 'center',
              fontSize: 11, fontWeight: 900,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{
                  display: 'block', width: 28, height: 28,
                  objectFit: 'cover',
                }} />
              ) : usernameText.slice(0, 1).toUpperCase()}
            </div>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>@{usernameText}</span>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 7,
        }}>
          <span style={{
            fontFamily: 'Space Grotesk,sans-serif',
            fontSize: 47, lineHeight: .9, fontWeight: 900,
            letterSpacing: '-0.045em', whiteSpace: 'nowrap',
          }}>{numberText}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, color: palette.muted,
          }}>{data.unit || ''}</span>
        </div>

        <div style={{
          fontFamily: 'Space Grotesk,sans-serif',
          fontSize: 13, fontWeight: 800, lineHeight: 1.05,
          marginTop: 7, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.label || ''}</div>

        {data.subtext && (
          <div style={{
            fontSize: 9, color: palette.muted, lineHeight: 1.2,
            marginTop: 5, maxWidth: 230,
            whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{data.subtext}</div>
        )}

        <div style={{
          position: 'absolute', right: 0, bottom: 18,
          width: 68, height: 68, padding: 4,
          boxSizing: 'border-box', background: '#FFFFFF',
          borderRadius: 4,
        }}>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="" style={{
              display: 'block', width: 60, height: 60,
              objectFit: 'contain',
            }} />
          )}
        </div>

        <div style={{
          position: 'absolute', right: 0, bottom: 5,
          fontSize: 7, color: palette.muted,
          textAlign: 'right', whiteSpace: 'nowrap',
        }}>Scan to find your protein target</div>
      </div>
    </div>
  );
}
