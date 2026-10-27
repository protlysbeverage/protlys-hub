'use client';

const THEMES = {
  dark: { panel:'#0D0F0E', surface:'#151815', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45', footer:'#101310' },
  light: { panel:'#F7F8F6', surface:'#FFFFFF', text:'#111311', muted:'rgba(17,19,17,.58)', line:'rgba(17,19,17,.12)', accent:'#4F9F35', footer:'#FFFFFF' },
  surface: { panel:'#151815', surface:'#1D211E', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45', footer:'#151815' },
};

function initials(name='Protlys Member') {
  const clean = String(name).trim();
  return (clean[0] || '?').toUpperCase();
}
function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/,/g,''));
  return Number.isFinite(n) ? n.toLocaleString('en-KE') : String(value);
}
function truncateText(value, max=700) {
  const text = String(value || '');
  if (text.length <= max) return { text, truncated:false };
  let cut = text.slice(0,max);
  const boundary = cut.lastIndexOf(' ');
  if (boundary > 0) cut = cut.slice(0,boundary);
  return { text:cut.trimEnd(), truncated:true };
}
function timeLabel(value) {
  if (!value) return '';
  const raw=String(value);
  const normalized=/(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(raw)?raw:raw+'Z';
  const d=new Date(normalized);
  if(Number.isNaN(d.getTime())) return '';
  const parts=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',hour:'numeric',min¶»§q«^