'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function getThemeVars() {
  const app = document.querySelector('.protlys-app');
  const source = app ? getComputedStyle(app) : getComputedStyle(document.documentElement);
  return {
    paper: source.getPropertyValue('--paper').trim() || '#EEF4EF',
    white: source.getPropertyValue('--white').trim() || '#FFFFFF',
    ink: source.getPropertyValue('--ink').trim() || '#0F2A4A',
    ink70: source.getPropertyValue('--ink-70').trim() || 'rgba(15,42,74,.7)',
    line: source.getPropertyValue('--line').trim() || 'rgba(15,42,74,.12)',
    green: source.getPropertyValue('--green').trim() || '#2E9E5B',
    greenDark: source.getPropertyValue('--green-dark').trim() || '#1F7A45',
    greenSoft: source.getPropertyValue('--green-soft').trim() || '#E4F3EA',
  };
}

export default function ShareSheet({
  open, title, previewUrl, previewLoading = false, previewError = '',
  onRetry, showIdentity, onToggleIdentity, onShare, onSave, onCopy,
  busy = false, message = '', onClose,
}) {
  const [closing, setClosing] = useState(false);
  const [theme, setTheme] = useState(() => ({
    paper:'#EEF4EF', white:'#FFFFFF', ink:'#0F2A4A', ink70:'rgba(15,42,74,.7)',
    line:'rgba(15,42,74,.12)', green:'#2E9E5B', greenDark:'#1F7A45', greenSoft:'#E4F3EA'
  }));
  const sheetRef = useRef(null);
  const returnFocusRef = useRef(null);
  const historyPushedRef = useRef(false);
  const closingRef = useRef(false);
  const touchStartRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTheme(getThemeVars());
    const app = document.querySelector('.protlys-app');
    const observer = app && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => setTheme(getThemeVars()))
      : null;
    observer?.observe(app, { attributes:true, attributeFilter:['class','style'] });
    return () => observer?.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;
    closingRef.current = false;
    setClosing(false);
    historyPushedRef.current = true;
    window.history.pushState({ ...(window.history.state || {}), __protlysShareSheet: true }, '');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onPopState = () => requestClose(true);
    window.addEventListener('popstate', onPopState);
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); return; }
      if (event.key !== 'Tab') return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = [...root.querySelectorAll('button:not([disabled]),input,[href],[tabindex]:not([tabindex="-1"])')];
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => sheetRef.current?.querySelector('button')?.focus());
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open || !returnFocusRef.current) return;
    const node = returnFocusRef.current;
    requestAnimationFrame(() => node?.focus?.());
    returnFocusRef.current = null;
  }, [open]);

  function finishClose() {
    closingRef.current = false;
    setClosing(false);
    historyPushedRef.current = false;
    onClose?.();
  }

  function requestClose(fromPopState = false) {
    if (!open || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (!fromPopState && historyPushedRef.current) window.history.back();
    window.setTimeout(finishClose, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 250);
  }

  function handleTouchStart(event) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    touchStartRef.current = { y:event.touches[0].clientY, time:performance.now() };
  }

  function handleTouchEnd(event) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dy = Math.max(0, event.changedTouches[0].clientY - start.y);
    const velocity = dy / Math.max(1, performance.now() - start.time);
    if (dy > 110 || velocity > .65) requestClose();
  }

  if (!open || typeof document === 'undefined') return null;

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const styleVars = {
    '--share-paper':theme.paper, '--share-white':theme.white, '--share-ink':theme.ink,
    '--share-ink70':theme.ink70, '--share-line':theme.line, '--share-green':theme.green,
    '--share-green-dark':theme.greenDark, '--share-green-soft':theme.greenSoft,
  };

  return createPortal(
    <div className="protlys-share-root" style={styleVars}>
      <div className="protlys-share-backdrop" onClick={() => requestClose()} aria-hidden="true" />
      <div ref={sheetRef} className={'protlys-share-sheet' + (closing ? ' is-closing' : '') + (reduced ? ' is-reduced-motion' : '')}
        role="dialog" aria-modal="true" aria-labelledby="protlys-share-title"
        >
        <div className="protlys-share-drag-zone" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} aria-hidden="true"><div className="protlys-share-handle" /></div>
        <div className="protlys-share-header">
          <h2 id="protlys-share-title">{title}</h2>
          <button type="button" className="protlys-share-close" onClick={() => requestClose()} aria-label="Close share sheet">×</button>
        </div>
        <div className="protlys-share-scroll">
          <div className="protlys-share-preview-wrap">
            {previewLoading && <div className="protlys-share-skeleton" aria-label="Preparing share preview" />}
            {!previewLoading && previewUrl && <img className="protlys-share-preview" src={previewUrl} alt="Share card preview" />}
            {!previewLoading && !previewUrl && previewError && (
              <div className="protlys-share-error"><span>Couldn’t prepare the preview.</span><button type="button" onClick={onRetry}>Retry</button></div>
            )}
          </div>
          <label className="protlys-share-toggle">
            <span>Show my name and photo</span>
            <input type="checkbox" checked={!!showIdentity} onChange={event => onToggleIdentity?.(event.target.checked)} />
            <span className="protlys-share-switch" aria-hidden="true"><span /></span>
          </label>
          <button type="button" className="protlys-share-primary" onClick={onShare} disabled={busy || previewLoading || !!previewError}>{busy ? 'Creating…' : 'Share card'}</button>
          <div className="protlys-share-secondary">
            <button type="button" onClick={onSave} disabled={busy || previewLoading || !!previewError}>Save image</button>
            <button type="button" onClick={onCopy} disabled={busy}>Copy link</button>
          </div>
          {message && <div className="protlys-share-toast" role="status" aria-live="polite">{message}</div>}
        </div>
      </div>
      <style>{`
        .protlys-share-root{position:fixed;inset:0;z-index:20000;font-family:Manrope,sans-serif;color:var(--share-ink);}
        .protlys-share-backdrop{position:absolute;inset:0;background:rgba(5,13,10,.48);animation:protlys-share-backdrop-in 200ms ease-out;}
        .protlys-share-sheet{position:absolute;left:0;right:0;bottom:0;width:min(760px,100%);max-height:88dvh;margin:0 auto;background:var(--share-paper);border-radius:24px 24px 0 0;padding:9px 18px calc(env(safe-area-inset-bottom) + 16px);box-sizing:border-box;box-shadow:0 -18px 50px rgba(0,0,0,.2);animation:protlys-share-sheet-in 250ms cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;overflow:hidden;touch-action:pan-y;}
        .protlys-share-sheet.is-closing{animation:protlys-share-sheet-out 250ms cubic-bezier(.22,1,.36,1) forwards;}
        .protlys-share-sheet.is-reduced-motion,.protlys-share-sheet.is-reduced-motion.is-closing{animation:none!important;}
        .protlys-share-drag-zone{min-height:26px;display:flex;align-items:flex-start;justify-content:center;touch-action:none;cursor:grab;flex:0 0 auto;}.protlys-share-handle{width:42px;height:5px;border-radius:999px;background:var(--share-line);margin:0 auto 12px;}
        .protlys-share-header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:0 0 auto;}
        .protlys-share-header h2{font-family:Space Grotesk,sans-serif;font-size:19px;line-height:1.2;margin:0;color:var(--share-ink);}
        .protlys-share-close{width:44px;height:44px;min-width:44px;border:1px solid var(--share-line);border-radius:50%;background:var(--share-white);color:var(--share-ink);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer;}
        .protlys-share-scroll{overflow:auto;min-height:0;padding:12px 0 4px;-webkit-overflow-scrolling:touch;}
        .protlys-share-preview-wrap{min-height:260px;display:flex;align-items:center;justify-content:center;padding:4px 0 14px;}
        .protlys-share-preview{display:block;width:min(60%,260px);height:auto;aspect-ratio:1080/1350;object-fit:contain;border-radius:14px;box-shadow:0 12px 28px rgba(15,42,74,.16);background:var(--share-white);}
        .protlys-share-skeleton{width:min(60%,260px);aspect-ratio:1080/1350;border-radius:14px;background:linear-gradient(100deg,var(--share-green-soft) 25%,rgba(255,255,255,.65) 45%,var(--share-green-soft) 65%);background-size:200% 100%;animation:protlys-share-shimmer 1.2s linear infinite;}
        .protlys-share-error{width:min(60%,260px);aspect-ratio:1080/1350;border:1px dashed var(--share-line);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;font-size:12px;color:var(--share-ink70);}
        .protlys-share-error button{border:1px solid var(--share-line);border-radius:999px;background:var(--share-white);color:var(--share-green-dark);font-weight:800;padding:8px 14px;}
        .protlys-share-toggle{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 2px;border-top:1px solid var(--share-line);border-bottom:1px solid var(--share-line);font-size:13px;font-weight:700;color:var(--share-ink);cursor:pointer;}
        .protlys-share-toggle input{position:absolute;opacity:0;pointer-events:none;}
        .protlys-share-switch{margin-left:auto;width:48px;height:28px;border-radius:999px;background:var(--share-line);padding:3px;transition:background 150ms ease;}
        .protlys-share-switch span{display:block;width:22px;height:22px;border-radius:50%;background:var(--share-white);box-shadow:0 1px 3px rgba(0,0,0,.18);transition:transform 150ms ease;}
        .protlys-share-toggle input:checked + .protlys-share-switch{background:var(--share-green);}
        .protlys-share-toggle input:checked + .protlys-share-switch span{transform:translateX(20px);}
        .protlys-share-primary{width:100%;min-height:48px;margin-top:14px;border:0;border-radius:999px;background:var(--share-green);color:#fff;font-weight:800;font-size:14px;cursor:pointer;}
        .protlys-share-primary:disabled,.protlys-share-secondary button:disabled{opacity:.5;cursor:default;}
        .protlys-share-secondary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
        .protlys-share-secondary button{min-height:44px;border:1px solid var(--share-line);border-radius:999px;background:var(--share-white);color:var(--share-ink);font-weight:800;cursor:pointer;}
        .protlys-share-toast{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--share-ink);color:#fff;text-align:center;font-size:11.5px;font-weight:700;}
        @keyframes protlys-share-sheet-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes protlys-share-sheet-out{from{transform:translateY(0)}to{transform:translateY(100%)}}
        @keyframes protlys-share-backdrop-in{from{opacity:0}to{opacity:1}}
        @keyframes protlys-share-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        @media (prefers-reduced-motion:reduce){.protlys-share-backdrop,.protlys-share-sheet,.protlys-share-skeleton{animation:none!important}.protlys-share-switch,.protlys-share-switch span{transition:none!important}}
        @media (max-width:380px){.protlys-share-sheet{padding-left:14px;padding-right:14px}.protlys-share-preview-wrap{min-height:220px}}
      `}</style>
    </div>,
    document.body
  );
}
