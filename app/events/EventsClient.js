'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

async function rsvpAction(eventId, isGoing) {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  if (isGoing) {
    await supabase.from('event_rsvps').delete()
      .eq('event_id', eventId).eq('user_id', (await supabase.auth.getUser()).data.user?.id);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user.id });
  }
}

const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function EventCard({ event, isGoing, onRsvp }) {
  const [loading, setLoading] = useState(false);
  const d = new Date(event.event_date);
  const count = event.event_rsvps?.[0]?.count || 0;

  async function handleRsvp() {
    setLoading(true);
    await onRsvp(event.id, isGoing);
    setLoading(false);
  }

  function share() {
    const text = `${event.title} — ${event.event_date}${event.location ? ' at ' + event.location : ''}`;
    if (navigator.share) {
      navigator.share({ title: event.title, text, url: event.link_url || window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      alert('Event details copied!');
    }
  }

  return (
    <div style={{ background:'#fff', borderRadius:18, marginBottom:14,
      border:'1.5px solid var(--line)', overflow:'hidden' }}>

      {event.image_url && (
        <img src={event.image_url} alt={event.title}
          style={{ width:'100%', height:140, objectFit:'cover' }} />
      )}

      <div style={{ padding:16 }}>
        {/* Date badge */}
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{ background:'var(--green)', borderRadius:12, padding:'8px 12px',
            textAlign:'center', minWidth:44, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.8)', letterSpacing:1 }}>
              {MONTH[d.getMonth()]}
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1 }}>
              {d.getDate()}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:16, color:'var(--ink)' }}>{event.title}</div>
            {event.location && (
              <div style={{ fontSize:12, color:'var(--ink-45)', marginTop:3 }}>
                📍 {event.location}
              </div>
            )}
            {event.event_time && (
              <div style={{ fontSize:12, color:'var(--ink-45)', marginTop:2 }}>
                🕐 {event.event_time}
              </div>
            )}
          </div>
        </div>

        {event.description && (
          <p style={{ fontSize:13.5, color:'var(--ink-70)', lineHeight:1.55, marginTop:12 }}>
            {event.description}
          </p>
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          marginTop:14, gap:8 }}>
          <span style={{ fontSize:12, color:'var(--ink-45)' }}>
            {count} {count === 1 ? 'person' : 'people'} going
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={share}
              style={{ background:'none', border:'1.5px solid var(--line)', borderRadius:10,
                padding:'8px 12px', fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--ink-70)' }}>
              Share
            </button>
            {event.link_url && (
              <a href={event.link_url} target="_blank" rel="noopener"
                style={{ background:'none', border:'1.5px solid var(--line)', borderRadius:10,
                  padding:'8px 12px', fontSize:12, fontWeight:700, cursor:'pointer',
                  color:'var(--ink-70)', textDecoration:'none' }}>
                Details ↗
              </a>
            )}
            <button onClick={handleRsvp} disabled={loading}
              style={{ background: isGoing ? 'var(--green)' : 'var(--green-soft)',
                border: isGoing ? '1.5px solid var(--green)' : '1.5px solid var(--green)',
                borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700,
                cursor:'pointer', color: isGoing ? '#fff' : 'var(--green-dark)' }}>
              {loading ? '…' : isGoing ? '✓ Going' : "I'm going"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsClient({ events, rsvpIds, userId }) {
  const router = useRouter();
  const [going, setGoing] = useState(new Set(rsvpIds));

  async function handleRsvp(eventId, isGoing) {
    setGoing(prev => {
      const s = new Set(prev);
      isGoing ? s.delete(eventId) : s.add(eventId);
      return s;
    });
    await rsvpAction(eventId, isGoing);
    router.refresh();
  }

  return (
    <>
      <div className="screen-pad">
        <span className="eyebrow">Events</span>
        <h1 style={{ fontSize: 22 }}>Upcoming runs & events</h1>
        <p className="subhead">Community events, runs and marathons near you.</p>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>
        {events.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
            <p className="subhead">No upcoming events yet. Check back soon!</p>
          </div>
        ) : (
          events.map(event => (
            <EventCard key={event.id} event={event}
              isGoing={going.has(event.id)}
              onRsvp={handleRsvp} />
          ))
        )}

        <div style={{ background:'var(--green-soft)', borderRadius:16, padding:16, marginTop:8 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--green-dark)', marginBottom:4 }}>
            Organising an event?
          </div>
          <p style={{ fontSize:12.5, color:'var(--ink-70)', margin:0, lineHeight:1.5 }}>
            Email us at <strong>hub@protlys.com</strong> and we'll add your run or event to the calendar.
          </p>
        </div>
      </div>
    </>
  );
}
