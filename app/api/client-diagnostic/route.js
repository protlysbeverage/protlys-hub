export async function POST(request) {
  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return new Response(null, { status: 413 });
    }

    const input = JSON.parse(raw);
    const safe = {
      kind: String(input?.kind || 'unknown').slice(0, 40),
      message: String(input?.message || '').slice(0, 1000),
      source: String(input?.source || '').slice(0, 500),
      stack: String(input?.stack || '').slice(0, 3000),
      pathname: String(input?.pathname || '').slice(0, 300),
      line: Number.isFinite(input?.line) ? input.line : null,
      column: Number.isFinite(input?.column) ? input.column : null,
      build: String(input?.build || '').slice(0, 100),
      timestamp: new Date().toISOString(),
    };

    console.error('[Protlys browser diagnostic]', JSON.stringify(safe));
    return Response.json({ received: true }, { status: 202 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
