'use client';

import { useEffect } from 'react';
import MovementClient from './MovementClient';

function PhoneIcon({ type }) {
  if (type === 'apple') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M10 6h4M11 18h2" /></svg>
  );
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 7h6M9 17h6" /></svg>;
}

function removeLegacyMovementBlocks(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  let node;
  while ((node = walker.nextNode())) elements.push(node);
  for (const element of elements) {
    const text = (element.textContent || '').trim();
    if (text.includes('Your milestone journey') || text.includes('Step milestones')) element.remove();
  }
}

export default function MovementPolish(props) {
  useEffect(() => {
    const root = document.querySelector('.movement-polish');
    if (!root) return;
    removeLegacyMovementBlocks(root);
    const observer = new MutationObserver(() => removeLegacyMovementBlocks(root));
    observer.observe(root, { childList:true, subtree:true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono,.movement-polish .metric-number,.movement-polish .stat-number{font-family:'Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;letter-spacing:-.025em;}
        .movement-polish .phone-card{background:var(--green-soft);border-radius:16px;padding:16px;margin:10px 18px 0;}
        .movement-polish .phone-coming-soon{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:9.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--green-dark);margin-bottom:8px;}
        .movement-polish .phone-title{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:750;}
        .movement-polish .phone-copy{font-size:12px;line-height:1.5;color:var(--ink-70);margin-top:5px;}
        .movement-polish .phone-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;}
        .movement-polish .phone-option{background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px;display:flex;align-items:flex-start;gap:8px;}
        .movement-polish .phone-option strong{display:block;font-size:11.5px;}
        .movement-polish .phone-option span{display:block;font-size:10px;color:var(--ink-45);margin-top:3px;line-height:1.35;}
      `}</style>

      <MovementClient {...props} />

      <div className="phone-card">
        <div className="phone-coming-soon">Coming soon</div>
        <div className="phone-title">Connect your phone</div>
        <div className="phone-copy">Automatic step syncing will use your phone’s health data when the Protlys mobile app is connected.</div>
        <div className="phone-grid">
          <div className="phone-option"><PhoneIcon type="apple" /><div><strong>iPhone</strong><span>Apple Health through the Protlys mobile app</span></div></div>
          <div className="phone-option"><PhoneIcon type="android" /><div><strong>Android</strong><span>Health Connect through the Protlys mobile app</span></div></div>
        </div>
      </div>
    </div>
  );
}
