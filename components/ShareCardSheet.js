'use client';

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import ShareCard from './ShareCard';

const LOOKS=['dark','light','surface'];
const LABELS={dark:'Dark',light:'Light',surface:'Surface'};
const MEDITATION_LOOKS=['mist','dusk','dawn'];
const MEDITATION_LABELS={mist:'Mist',dusk:'Dusk',dawn:'Dawn'};
const LOGOS={dark:'/protlys-logo-dark.png',light:'/protlys-logo-exact.png',surface:'/protlys-logo-dark.png'};
function publicShareUrl(metric,data){
  if(data?.publicUrl)return data.publicUrl;
  const paths={protein_target:'/calculator',protein_today:'/calculator',movement_calendar:'/movement',movement_days:'/movement',current_streak:'/movement',best_streak:'/movement',steps_today:'/movement',this_week:'/movement',distance:'/movement',lifetime_steps:'/movement'};
  const path=paths[metric]||'/movement';
  return 'https://hub.protlys.com'+path+'?utm_source=share&utm_medium=card&utm_campaign='+encodeURIComponent(metric||'movement');
}
function ShareGlyph(){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>}
function SaveGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fi¶»§q«^