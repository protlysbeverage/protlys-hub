export const revalidate = 900;

// One switch controls the journal in both the app and API. Default off.
const BLOG_ENABLED = process.env.NEXT_PUBLIC_BLOG_ENABLED === 'true';

const STORE_URL = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'https://protlys.myshopify.com').replace(/\/+$/, '');
const BLOG_FEED_URL = STORE_URL + '/blogs/news.atom?limit=30';

function decodeEntities(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function tag(xml, name) {
  const match = xml.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function plainText(html = '') {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function entryLink(entry) {
  const links = [...entry.matchAll(/<link\b([^>]*)\/?\s*>/gi)];
  const alternate = links.find(([, attrs]) => /rel=["']alternate["']/i.test(attrs)) || links[0];
  return alternate?.[1]?.match(/href=["']([^"']+)["']/i)?.[1] || '';
}

function parseEntry(entry) {
  const title = plainText(tag(entry, 'title'));
  const content = tag(entry, 'content') || tag(entry, 'summary');
  const excerptSource = tag(entry, 'summary') || content;
  const excerpt = plainText(excerptSource);
  const image = entry.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["']/i)?.[1]
    || content.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1]
    || excerptSource.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1]
    || null;
  const sourceUrl = entryLink(entry);
  let handle = '';
  try {
    const parsed = new URL(sourceUrl || STORE_URL + '/blogs/news');
    handle = parsed.pathname.split('/').filter(Boolean).pop() || '';
  } catch {}
  if (!handle) return null;
  const words = plainText(content).split(/\s+/).filter(Boolean).length;
  const publishedAt = tag(entry, 'published') || tag(entry, 'updated') || null;
  return {
    id: handle,
    handle,
    title: title || 'Protlys Journal',
    excerpt: excerpt.length > 190 ? excerpt.slice(0, 187).trimEnd() + '…' : excerpt,
    coverImage: image ? decodeEntities(image) : null,
    readTime: Math.max(1, Math.ceil(words / 220)),
    publishedAt,
    url: 'https://protlys.com/blogs/news/' + encodeURIComponent(handle),
  };
}

export async function GET() {
  if (!BLOG_ENABLED) {
    return Response.json({ enabled: false, posts: [] }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  try {
    const response = await fetch(BLOG_FEED_URL, {
      headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return Response.json({ posts: [], error: 'The Protlys Journal is temporarily unavailable.' }, { status: 502 });
    }
    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
    const posts = entries.map(([, entry]) => parseEntry(entry)).filter(Boolean);
    return Response.json({ posts }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
    });
  } catch {
    return Response.json({ posts: [], error: 'Could not connect to the Protlys Journal.' }, { status: 502 });
  }
}
