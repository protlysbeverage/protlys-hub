import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 900;

const STORE_URL = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'https://protlys.myshopify.com').replace(/\/+$/, '');

function decode(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function tag(xml, name) {
  const match = xml.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  return match ? decode(match[1]).trim() : '';
}

function plainText(html = '') {
  return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getHandle(entry) {
  const match = entry.match(/<link\b([^>]*)\/?\s*>/i);
  const href = match?.[1]?.match(/href=["']([^"']+)["']/i)?.[1] || '';
  try { return new URL(href).pathname.split('/').filter(Boolean).pop() || ''; } catch { return ''; }
}

async function getArticle(handle) {
  const response = await fetch(STORE_URL + '/blogs/news.atom?limit=50', {
    headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
    next: { revalidate: 900 },
  });
  if (!response.ok) return null;
  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const entry = entries.map(([, value]) => value).find(value => getHandle(value) === handle);
  if (!entry) return null;
  const content = tag(entry, 'content') || tag(entry, 'summary');
  const text = plainText(content);
  if (!text) return null;
  const image = entry.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["']/i)?.[1]
    || content.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1]
    || null;
  return {
    title: plainText(tag(entry, 'title')) || 'Protlys Journal',
    text,
    image: image ? decode(image) : null,
    publishedAt: tag(entry, 'published') || tag(entry, 'updated') || '',
    sourceUrl: 'https://protlys.com/blogs/news/' + encodeURIComponent(handle),
  };
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const article = await getArticle(String(handle || ''));
  return article ? { title: article.title + ' | Protlys', description: article.text.slice(0, 160) } : { title: 'Protlys Journal' };
}

export default async function ProtlysBlogArticle({ params }) {
  const { handle } = await params;
  const article = await getArticle(String(handle || ''));
  if (!article) notFound();
  const date = article.publishedAt ? new Date(article.publishedAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(date) : '';
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--paper)', color: 'var(--ink)', padding: '24px 18px 48px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/blogs/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--green-dark)', fontSize: 13, fontWeight: 850, textDecoration: 'none', marginBottom: 22 }}>‹ Back to Protlys Journal</Link>
        <div style={{ border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden', background: 'var(--white)' }}>
          {article.image && <img src={article.image} alt="" style={{ display: 'block', width: '100%', maxHeight: 380, objectFit: 'cover' }} />}
          <div style={{ padding: 'clamp(20px,5vw,42px)' }}>
            <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--green-dark)' }}>Protlys Journal{dateLabel ? ' · ' + dateLabel : ''}</div>
            <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', lineHeight: 1.15, margin: '12px 0 22px' }}>{article.title}</h1>
            <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--ink-70)', whiteSpace: 'pre-line' }}>{article.text}</div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 30, paddingTop: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/blogs/news" style={{ color: 'var(--green-dark)', fontSize: 12, fontWeight: 850, textDecoration: 'none' }}>More from Protlys</Link>
              <a href={article.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green-dark)', fontSize: 12, fontWeight: 850, textDecoration: 'none' }}>Open original article ↗</a>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
