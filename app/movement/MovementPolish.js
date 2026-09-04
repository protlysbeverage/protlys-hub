'use client';

import { useEffect } from 'react';
import MovementClient from './MovementClient';

const EMOJI_TO_UI = new Map([
  ['🎉', ''],
  ['🎯', '●'],
  ['🔒', '○'],
  ['📱', ''],
]);

function stripMovementEmojis(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  for (const textNode of nodes) {
    const original = textNode.nodeValue || '';
    let value = original;
    for (const [emoji, replacement] of EMOJI_TO_UI) value = value.split(emoji).join(replacement);

    // Remove any remaining pictographic emoji used by achievement data.
    value = value.replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
    if (value !== original) textNode.nodeValue = value;
  }
}

export default function MovementPolish(props) {
  useEffect(() => {
    const root = document.querySelector('[data-movement-polish]');
    if (!root) return;
    stripMovementEmojis(root);

    const observer = new MutationObserver(() => stripMovementEmojis(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div data-movement-polish className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono {
          font-family: 'Space Grotesk', sans-serif !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.025em;
        }
        .movement-polish .hub-card .t {
          font-family: 'Manrope', sans-serif;
          letter-spacing: .55px;
        }
        .movement-polish .hub-card [style*="minWidth:72"] {
          font-family: 'Space Grotesk', sans-serif;
        }
        .movement-polish .hub-card [style*="minWidth:72"] .mono {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 12px !important;
          letter-spacing: -0.02em;
        }
        .movement-polish .data-chip .value,
        .movement-polish .data-chip .label {
          font-family: 'Manrope', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .movement-polish button {
          font-family: 'Manrope', sans-serif;
        }
      `}</style>
      <MovementClient {...props} />
    </div>
  );
}
