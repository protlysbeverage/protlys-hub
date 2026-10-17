import sharp from 'sharp';
import { join } from 'node:path';

export const runtime = 'nodejs';

export async function GET() {
  const source = join(process.cwd(), 'public', 'protlys-logo-exact.png');
  const icon = await sharp(source)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return new Response(icon, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
