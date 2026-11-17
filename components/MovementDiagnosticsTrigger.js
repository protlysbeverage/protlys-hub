'use client';
import { useEffect } from 'react';

export default function MovementDiagnosticsTrigger() {
  useEffect(() => {
    const title = document.querySelector('.movement-polish .eyebrow');
    if (!title) return undefined;
    let taps = 0;
    let resetHandle = null;
    const onTap = () => {
      taps += 1;
      if (resetHandle) window.clearTimeout(resetHandle);
      if (taps >= 5) {
        taps = 0;
        window.location.href = 'protlys://steps-debug';
        return;
      }
      resetHandle = window.setTimeout(() => { taps = 0; }, 2500);
    };
    title.addEventListener('click', onTap);
    return () => {
      title.removeEventListener('click', onTap);
      if (resetHandle) window.clearTimeout(resetHandle);
    };
  }, []);
  return null;
}