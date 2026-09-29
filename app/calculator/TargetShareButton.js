'use client';

import { useEffect, useState } from 'react';
import ShareSheet from '@/components/ShareSheet';
import QRCode from 'qrcode';

const SHARE_URL = 'https://hub.protlys.com/calculator?src=share';

export default function TargetShareButton({ target, activity, goal, profile }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showIdentity, setShowIdentity] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('protlysShareIdentity');
      if (saved !== null) setShowIdentity(saved === 'true');
    } catch {}
  }, []);

  function toggleIdentity(value) {
    setShowIdentity(value);
    try { localStorage.setItem('protlysShareIdentity', String(value)); } catch {}
  }

  async function renderPreview() {
    setPreviewLoading(true); setPreviewError(''); setPreviewUrl('');
    try { const canvas = await drawShareCard(); setPreviewUrl(canvas.toDataURL('image/png')); }
    catch (e) { console.error(e); setPreviewError('Could not create preview.'); }
    finally { setPreviewLoading(false); }
  }

  useEffect(() => { if (previewOpen) renderPreview(); }, [previewOpen, showIdentity]);

  async function saveImage() {
    if (busy || previewLoading) return;
    try { const canvas = await drawShareCard(); const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (!png) throw new Error('Could not create share image.'); const u=URL.createObjectURL(png); const a=document.createElement('a'); a.href=u; a.download='protlys-protein-target.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); setMessage('Image saved.'); }
    catch (e) { console.error(e); setMessage('Could not save the image.'); }
  }

  async function copyLink() {
    try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(SHARE_URL); setMessage('Link copied.'); }
    catch (e) { console.error(e); setMessage('Could not copy the link.'); }
  }

  async function loadImage(src, anonymous = false) {
    const img = new Image();
    if (anonymous) img.crossOrigin = 'anonymous';
    img.src = src;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    if (img.decode) await img.decode().catch(() => {});
    return img;
  }

  async function drawShareCard() {
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) throw new Error('missing-target');
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable.');

    const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, '#F4FAF5'); bg.addColorStop(.5, '#E3F1E6'); bg.addColorStop(1, '#CFE7D5');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = 'rgba(46,158,91,.09)';
    [[920,150,260],[130,1160,240],[620,650,410]].forEach(([x,y,r]) => { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = 'rgba(15,42,74,.035)';
    for (let y=90;y<1270;y+=28) for (let x=80;x<1020;x+=28) { ctx.beginPath(); ctx.arc(x,y,1.4,0,Math.PI*2); ctx.fill(); }

    ctx.beginPath(); ctx.roundRect(54,54,972,1242,48);
    ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(15,42,74,.10)'; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(74,74,932,1202,38);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(46,158,91,.25)'; ctx.stroke();

    let y = 116;
    let logo = null;
    try { logo = await loadImage('/protlys-logo-exact.png'); } catch {}
    if (logo) {
      const scale = Math.min(170 / logo.width, 1);
      ctx.drawImage(logo, 96, y, logo.width * scale, logo.height * scale);
      y += logo.height * scale + 34;
    } else y += 60;

    const identityName = profile?.display_name?.trim();
    const identityPhoto = profile?.avatar_url?.trim();
    if (showIdentity && identityName) {
      const avatarX = 96, avatarY = y + 2, size = 96;
      ctx.save();
      ctx.beginPath(); ctx.arc(avatarX + size/2, avatarY + size/2, size/2 + 4, 0, Math.PI*2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.beginPath(); ctx.arc(avatarX + size/2, avatarY + size/2, size/2, 0, Math.PI*2); ctx.clip();
      let avatar = null;
      if (identityPhoto) {
        try { avatar = await loadImage(identityPhoto, true); } catch {}
      }
      if (avatar) {
        ctx.drawImage(avatar, avatarX, avatarY, size, size);
      } else {
        ctx.fillStyle = '#2E9E5B'; ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '800 42px "Space Grotesk",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(identityName.charAt(0).toUpperCase(), avatarX + size/2, avatarY + size/2);
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(avatarX + size/2, avatarY + size/2, size/2 + 2, 0, Math.PI*2);
      ctx.lineWidth = 3; ctx.strokeStyle = '#2E9E5B'; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#0F2A4A'; ctx.font = '700 25px "IBM Plex Mono",monospace';
      ctx.fillText('SHARED BY ' + identityName.toUpperCase(), 220, avatarY + 56);
      y = avatarY + size + 44;
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1F7A45'; ctx.font = '700 27px "IBM Plex Mono",monospace';
    ctx.fillText('MY DAILY PROTEIN TARGET', 96, y + 22);
    y += 108;

    const t = String(Math.round(n));
    ctx.fillStyle = '#0F2A4A';
    ctx.font = '400 320px "Fraunces","Playfair Display",Georgia,serif';
    const tw = ctx.measureText(t).width;
    ctx.fillText(t, 96, y + 250);
    ctx.font = '500 82px "Fraunces","Playfair Display",Georgia,serif';
    ctx.fillText('g', 96 + tw + 22, y + 250);

    const dividerY = y + 300;
    ctx.strokeStyle = 'rgba(46,158,91,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(96, dividerY); ctx.lineTo(984, dividerY); ctx.stroke();
    ctx.fillStyle = 'rgba(15,42,74,.62)'; ctx.font = '600 28px Manrope,sans-serif';
    ctx.fillText('PER DAY', 96, dividerY + 42);

    const activityText = activity ? String(activity).replace(/\s*activity\s*$/i, '') : '';
    const goalText = goal ? String(goal).replace(/&/g, 'and') : '';
    if (activityText || goalText) {
      ctx.fillStyle = '#1F7A45'; ctx.font = '600 24px Manrope,sans-serif';
      if (activityText) ctx.fillText(activityText, 96, dividerY + 104);
      if (goalText) ctx.fillText(goalText, 96, dividerY + (activityText ? 140 : 104));
    }

    const qrX = 720, qrY = 920, tile = 264;
    ctx.beginPath(); ctx.roundRect(qrX, qrY, tile, tile, 28);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, SHARE_URL, { errorCorrectionLevel:'M', margin:1, width:240, color:{dark:'#0F2A4A',light:'#FFFFFF'} });
    ctx.drawImage(qr, qrX + 12, qrY + 12, 240, 240);

    ctx.fillStyle = '#0F2A4A'; ctx.font = '700 22px Manrope,sans-serif';
    ctx.fillText('Scan to calculate yours', 96, 1075);
    ctx.fillStyle = '#1F7A45'; ctx.font = '800 30px "IBM Plex Mono",monospace';
    ctx.fillText('hub.protlys.com/calculator', 96, 1122);

    ctx.fillStyle = 'rgba(15,42,74,.58)'; ctx.font = '500 22px Manrope,sans-serif';
    ctx.fillText('A simple starting point for your daily protein.', 96, 1190);

    return canvas;
  }

  async function share() {
    if (busy) return;
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) {
      setMessage('Your protein target is missing. Calculate it again before sharing.');
      window.setTimeout(() => setMessage(''), 2800);
      return;
    }
    setBusy(true);
    try {
      const canvas = await drawShareCard();
      const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('Could not create share image.');
      const file = new File([png], 'protlys-protein-target.png', { type:'image/png' });
      const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files:[file] });
      if (typeof navigator.share === 'function' && canShareFiles) {
        const name = showIdentity && profile?.display_name?.trim() ? profile.display_name.trim() : '';
        const prefix = name ? name + "'s " : '';
        await navigator.share({
          files:[file],
          title:'My Protlys protein target',
          text: prefix + 'daily protein target is ' + Math.round(n) + 'g. Calculate yours: ' + SHARE_URL,
          url:SHARE_URL
        });
        setMessage('Share card ready.');
      } else {
        const u = URL.createObjectURL(png);
        const a = document.createElement('a'); a.href=u; a.download='protlys-protein-target.png';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(SHARE_URL);
        setMessage('Image downloaded. Calculator link copied.');
        window.setTimeout(() => setMessage(''), 2800);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error(e);
        setMessage(e?.message === 'missing-target' ? 'Your protein target is missing. Calculate it again before sharing.' : 'Could not create the share card. Please try again.');
        window.setTimeout(() => setMessage(''), 2800);
      }
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => setPreviewOpen(true)} disabled={busy} aria-label="Share protein target" title="Share protein target" style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--line)',background:'var(--white)',color:'var(--ink)',display:'grid',placeItems:'center',cursor:busy?'default':'pointer',flexShrink:0}}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
      </button>
      <ShareSheet
        open={previewOpen}
        title="Share your target"
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        previewError={previewError}
        onRetry={renderPreview}
        showIdentity={showIdentity}
        onToggleIdentity={toggleIdentity}
        onShare={share}
        onSave={saveImage}
        onCopy={copyLink}
        busy={busy}
        message={message}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
