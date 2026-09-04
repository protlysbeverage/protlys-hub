'use client';

import { useEffect } from 'react';
import MovementClient from './MovementClient';

const EMOJI_TO_UI = new Map([
  ['🎉', ''],
  ['🎯', '→'],
  ['🔒', '—'],
  ['📱', ''],
]);

function stripMovementEmojis(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  for (const textNode of nodes) {
    let value = textNode.nodeValue || '';
    for (const [emoji, replacement] of EMOJI_TO_UI) value = value.split(emoji).join(replacement);
    value = value.replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
    textNode.nodeValue = value;
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
        .movement-polish button { font-family: 'Manrope', sans-serif; }
      `}</style>
      <MovementClient {...props} />
    </div>
  );
}
