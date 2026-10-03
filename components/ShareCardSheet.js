'use client';

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import ShareCard from './ShareCard';

const THEMES = ['dark', 'light', 'surface'];
const LOOK_LABELS = { dark: 'Dark', light: 'Light', surface: 'Surface' };
const LOGOS = {
  dark: '/protlys-logo-dark.png',
  light: '/protlys-logo-exact.png',
  surface: '/protlys-logo-dark.png',
};
const PUBLIC_SHARE_BASE = 'https://hub.protlys.com/movement';

function publicShareUrl(metric) {
  return PUBLIC_SHARE_BASE + '?utm_source=share&utm_medium=card&utm_campaign=' + encodeURIComponent(metric || 'movement');
}

function ShareGlyph() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>;
}

function SaveGlyph() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 4v5h8V4M8 20v-6h8v6"/></svg>;
}

function LinkGlyph() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/></svg>;
}

function Spinner() {
  return <span aria-hidden="true" style={{width:16,height:16,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'protlys-share-spin .7s linear infinite'}}/>;
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function assetDataUrl(path) {
  const response = await fetch(path, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Unable to load asset: ' + path);
  return blobToDataUrl(await response.blob());
}

async function waitForImages(node) {
  const images = [...node.querySelectorAll('img')];
  await Promise.all(images.map(async image => {
    if (image.decode) {
      try {
        await image.decode();
        return;
      } catch {}
    }
    if (image.complete) return;
    await new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
}

function computeScale() {
  if (typeof window === 'undefined') return 1;
  return Math.max(
    0.3,
    Math.min(
      1.2,
      Math.min(
        (window.innerWidth - 40) / 360,
        (window.innerHeight * 0.62) / 640
      )
    )
  );
}

function CardPreview({ shareData, selected, assets, username, avatarUrl, showUsername }) {
  const scale = computeScale();
  return (
    <div style={{
      width: 360 * scale,
      height: 640 * scale,
      flex: '0 0 auto',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 640,
        transform: 'scale(' + scale + ')',
        transformOrigin: 'top left',
      }}>
        <ShareCard
          metric={shareData.metric}
          data={shareData}
          username={username}
          avatarUrl={avatarUrl}
          look={selected}
          qrDataUrl={assets.qr || ''}
          logoDataUrl={assets[selected] || ''}
          showUsername={showUsername}
        />
      </div>
    </div>
  );
}

export class ShareSheetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Protlys ShareSheet]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{
          minHeight: 180, padding: 24, borderRadius: 20,
          background: '#FFFFFF', color: '#111111',
          fontFamily: 'Manrope,sans-serif', textAlign: 'center',
        }}>
          <strong>Share card unavailable</strong>
          <div style={{marginTop:8,fontSize:12,color:'#555'}}>Close this sheet and try again.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ShareCardSheetInner({
  open,
  onClose,
  data = null,
  metric,
  value,
  unit,
  label,
  subtext,
  progress,
  username,
  avatarUrl = '',
  heatmapDays = [],
  weeklyDays = [],
  onAddSteps,
}) {
  const shareData = useMemo(() => ({
    ...(data || {}),
    metric: data?.metric || metric,
    value: Number(data?.value ?? data?.number ?? value) || 0,
    number: Number(data?.number ?? data?.value ?? value) || 0,
    unit: data?.unit || unit,
    label: data?.label || label,
    subtext: data?.subtext || subtext,
    progress: data?.progress ?? progress,
    heatmapDays: data?.heatmapDays || heatmapDays,
    weeklyDays: data?.weeklyDays || weeklyDays,
    hasData: data?.hasData ?? (
      Number(data?.number ?? data?.value ?? value) > 0 ||
      Number(progress) > 0 ||
      Boolean(data?.visual?.days?.some?.(day => day?.logged))
    ),
  }), [data, metric, value, unit, label, subtext, progress, heatmapDays, weeklyDays]);

  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState('dark');
  const [showUsername, setShowUsername] = useState(true);
  const [assets, setAssets] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const previewShellRef = useRef(null);
  const historyIdRef = useRef(null);
  const touchStartRef = useRef(null);
  const cachedBlobRef = useRef(new Map());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setSelected('dark');
    setShowUsername(true);
    setBusy(false);
    setMessage('');

    (async () => {
      try {
        const [dark, light, qr] = await Promise.all([
          assetDataUrl(LOGOS.dark),
          assetDataUrl(LOGOS.light),
          QRCode.toDataURL(publicShareUrl(shareData.metric), {
            margin: 1,
            width: 220,
            errorCorrectionLevel: 'M',
            color: { dark: '#111111', light: '#FFFFFF' },
          }),
        ]);
        if (!cancelled) setAssets({ dark, light, surface: dark, qr });
      } catch (error) {
        console.error('[Protlys ShareSheet] asset load failed', error);
        if (!cancelled) setMessage('Some share assets could not be loaded.');
      }
    })();

    const state = window.history.state || {};
    const existingId = state.__protlysShareSheetId;
    if (!existingId) {
      const id = 'share-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      historyIdRef.current = id;
      window.history.pushState({
        ...state,
        __protlysShareSheet: true,
        __protlysShareSheetId: id,
      }, '', window.location.href);
    } else {
      historyIdRef.current = existingId;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onPopState = () => {
      historyIdRef.current = null;
      onClose?.();
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, shareData.metric]);

  function closeSheet() {
    if (!open) return;
    const id = historyIdRef.current;
    historyIdRef.current = null;

    if (id && window.history.state?.__protlysShareSheetId === id) {
      window.history.back();
    } else {
      onClose?.();
    }
  }

  function cacheKey() {
    return [
      selected,
      showUsername,
      shareData.metric,
      shareData.number,
      shareData.unit,
      shareData.label,
      shareData.subtext,
      shareData.progress,
      JSON.stringify(shareData.visual || {}),
      JSON.stringify(shareData.highlight || []),
      username,
      avatarUrl,
    ].join('|');
  }

  async function createExportBlob() {
    const key = cacheKey();
    const cached = cachedBlobRef.current.get(key);
    if (cached) return cached;

    const source = previewShellRef.current?.querySelector('[data-protlys-share-card="true"]');
    if (!source) throw new Error('Share card is not mounted.');

    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.position = 'fixed';
    holder.style.left = '-20000px';
    holder.style.top = '0';
    holder.style.width = '360px';
    holder.style.height = '640px';
    holder.style.overflow = 'hidden';
    holder.style.pointerEvents = 'none';
    holder.style.opacity = '1';

    const clone = source.cloneNode(true);
    clone.style.width = '360px';
    clone.style.height = '640px';
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.overflow = 'hidden';

    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await waitForImages(clone);

      const dataUrl = await toPng(clone, {
        cacheBust: true,
        pixelRatio: 3,
        width: 360,
        height: 640,
        style: {
          width: '360px',
          height: '640px',
          transform: 'none',
          overflow: 'hidden',
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      cachedBlobRef.current.set(key, blob);
      return blob;
    } finally {
      holder.remove();
    }
  }

  async function share() {
    if (busy || !shareData.hasData) return;
    setBusy(true);
    setMessage('');

    try {
      const blob = await createExportBlob();
      const file = new File([blob], 'protlys-share-card.png', { type: 'image/png' });

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          files: [file],
          title: 'My Protlys progress',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'protlys-share-card.png';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('[Protlys ShareSheet] share failed', error);
        setMessage('Could not share the card.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy || !shareData.hasData) return;
    setBusy(true);
    setMessage('');

    try {
      const blob = await createExportBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'protlys-share-card.png';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Image saved.');
    } catch (error) {
      console.error('[Protlys ShareSheet] save failed', error);
      setMessage('Could not save the share card.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(publicShareUrl(shareData.metric));
      setMessage('Link copied.');
    } catch (error) {
      console.error('[Protlys ShareSheet] copy failed', error);
      setMessage('Could not copy the link.');
    }
  }

  function onTouchStart(event) {
    touchStartRef.current = event.touches?.[0]?.clientY ?? null;
  }

  function onTouchEnd(event) {
    if (touchStartRef.current == null) return;
    const endY = event.changedTouches?.[0]?.clientY ?? touchStartRef.current;
    const delta = endY - touchStartRef.current;
    touchStartRef.current = null;
    if (delta > 90) closeSheet();
  }

  if (!open || !mounted) return null;

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483000,
      fontFamily: 'Manrope,sans-serif',
    }}>
      <style>{'@keyframes protlys-share-spin{to{transform:rotate(360deg)}}'}</style>

      <div
        aria-hidden="true"
        onPointerUp={closeSheet}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,.60)',
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Share your progress"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100dvh',
          boxSizing: 'border-box',
          padding: 'max(env(safe-area-inset-top), 12px) 16px calc(14px + env(safe-area-inset-bottom))',
          background: 'var(--paper)',
          color: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: 42, height: 5, borderRadius: 99,
          background: 'var(--line)', margin: '0 auto 8px',
          flex: '0 0 auto',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 10,
          flex: '0 0 auto',
        }}>
          <div style={{fontSize:18,fontWeight:800}}>Share your progress</div>
          <button
            type="button"
            aria-label="Close share sheet"
            onPointerUp={event => {
              event.preventDefault();
              event.stopPropagation();
              closeSheet();
            }}
            style={{
              width: 48, height: 48, minWidth: 48,
              border: '1px solid #D7DDD8',
              borderRadius: 24,
              background: '#FFFFFF', color: '#111111',
              fontSize: 20, display: 'grid',
              placeItems: 'center', padding: 0,
            }}
          >×</button>
        </div>

        <div style={{
          flex: '0 0 auto',
          width: '100%',
          height: 640,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'visible',
        }} ref={previewShellRef}>
          {shareData.hasData ? (
            <CardPreview
              shareData={shareData}
              selected={selected}
              assets={assets}
              username={username}
              avatarUrl={avatarUrl}
              showUsername={showUsername}
            />
          ) : (
            <div style={{
              width: 360, height: 640,
              background: '#232924', color: '#FFFFFF',
              borderRadius: 20, display: 'grid',
              placeItems: 'center', padding: 24,
              boxSizing: 'border-box',
            }}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:800}}>No data to share yet</div>
                <div style={{fontSize:12,opacity:.68,lineHeight:1.45,marginTop:6}}>Add some movement or protein data first.</div>
                {onAddSteps && (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      closeSheet();
                      window.setTimeout(() => onAddSteps?.(), 220);
                    }}
                    style={{
                      marginTop:14,minHeight:44,padding:'0 18px',
                      border:0,borderRadius:12,
                      background:'#6BCB45',color:'#111111',
                      fontWeight:800,
                    }}
                  >Add steps</button>
                )}
              </div>
            </div>
          )}
        </div>

        {shareData.hasData && (
          <div style={{
            flex: '1 1 auto', minHeight: 0,
            overflowY: 'auto', overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'center',
              gap: 10, padding: '4px 0 10px',
            }}>
              {THEMES.map(theme => {
                const scale = 0.2;
                return (
                  <div key={theme} style={{
                    width: 92, flex: '0 0 92px',
                    textAlign: 'center',
                  }}>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setSelected(theme);
                      }}
                      aria-label={'Select ' + LOOK_LABELS[theme] + ' theme'}
                      style={{
                        width: 92, height: 132, padding: 2,
                        border: selected === theme ? '2px solid #4F9F35' : '1px solid ' + (selected === 'light' ? '#D7DDD8' : 'rgba(255,255,255,.2)'),
                        borderRadius: 12,
                        background: selected === 'light' ? '#FFFFFF' : '#232924',
                        overflow: 'hidden', cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 72, height: 128,
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 6,
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: 0, top: 0,
                          width: 360, height: 640,
                          transform: 'scale(' + scale + ')',
                          transformOrigin: 'top left',
                        }}>
                          <ShareCard
                            metric={shareData.metric}
                            data={shareData}
                            username={username}
                            avatarUrl={avatarUrl}
                            look={theme}
                            qrDataUrl={assets.qr || ''}
                            logoDataUrl={assets[theme] || ''}
                            showUsername={showUsername}
                          />
                        </div>
                      </div>
                    </button>
                    <div style={{
                      fontSize:11,fontWeight:700,
                      marginTop:5,opacity:.75,
                    }}>{LOOK_LABELS[theme]}</div>
                  </div>
                );
              })}
            </div>

            <label style={{
              display:'flex',alignItems:'center',
              justifyContent:'space-between',
              minHeight:44,padding:'8px 2px',
              fontSize:13,fontWeight:700,
              borderTop:'1px solid var(--line)',
            }}>
              <span>Show my username</span>
              <input
                type="checkbox"
                checked={showUsername}
                onChange={event => setShowUsername(event.target.checked)}
                style={{width:20,height:20,accentColor:'#4F9F35'}}
              />
            </label>

            {message && (
              <div role="status" style={{
                textAlign:'center',fontSize:11,
                fontWeight:700,color:'#4F9F35',
                padding:'2px 0 8px',
              }}>{message}</div>
            )}

            <div style={{
              display:'grid',gridTemplateColumns:'1fr 1fr',
              gap:8,paddingBottom:4,
            }}>
              <button
                type="button"
                onClick={share}
                disabled={busy || !assets[selected] || !assets.qr}
                style={{
                  gridColumn:'1 / -1',minHeight:50,
                  border:0,borderRadius:14,
                  background:'#6BCB45',color:'#111111',
                  fontWeight:800,fontSize:14,
                  display:'inline-flex',
                  alignItems:'center',justifyContent:'center',gap:9,
                  opacity:(busy || !assets[selected] || !assets.qr) ? .55 : 1,
                }}
              >
                {busy ? <><Spinner/>Creating…</> : <><ShareGlyph/>Share {LOOK_LABELS[selected]} card</>}
              </button>

              <button
                type="button"
                onClick={save}
                disabled={busy || !assets[selected] || !assets.qr}
                style={{
                  minHeight:46,border:'1px solid ' + (selected === 'light' ? '#D7DDD8' : 'rgba(255,255,255,.18)'),
                  borderRadius:14,
                  background:selected === 'light' ? '#FFFFFF' : '#232924',
                  color:selected === 'light' ? '#111111' : '#FFFFFF',
                  fontWeight:800,fontSize:13,
                  display:'inline-flex',
                  alignItems:'center',justifyContent:'center',gap:7,
                }}
              ><SaveGlyph/>Save image</button>

              <button
                type="button"
                onClick={copyLink}
                disabled={busy}
                style={{
                  minHeight:46,border:'1px solid ' + (selected === 'light' ? '#D7DDD8' : 'rgba(255,255,255,.18)'),
                  borderRadius:14,
                  background:selected === 'light' ? '#FFFFFF' : '#232924',
                  color:selected === 'light' ? '#111111' : '#FFFFFF',
                  fontWeight:800,fontSize:13,
                  display:'inline-flex',
                  alignItems:'center',justifyContent:'center',gap:7,
                }}
              ><LinkGlyph/>Copy link</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(
    <ShareSheetErrorBoundary>{content}</ShareSheetErrorBoundary>,
    document.body
  );
}

export default function ShareCardSheet(props) {
  return <ShareCardSheetInner {...props} />;
}

export function ShareIconButton({ onClick, label = 'Share', disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={event => {
        event.stopPropagation();
        onClick?.();
      }}
      style={{
        width:40,height:40,minWidth:40,
        border:'1px solid var(--line)',
        borderRadius:'50%',
        background:'var(--surface)',
        color:'var(--ink-45)',
        display:'grid',placeItems:'center',
        cursor:disabled?'not-allowed':'pointer',
        padding:0,opacity:disabled?.45:1,
      }}
    ><ShareGlyph/></button>
  );
}
