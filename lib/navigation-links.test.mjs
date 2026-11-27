import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const exists = (file) => fs.existsSync(new URL('../' + file, import.meta.url));

test('every static destination in the Hub navigation resolves to a page', () => {
  const shell = read('components/AppShell.js');
  const matches = [
    ...shell.matchAll(/href\s*:\s*['"]([^'"]+)['"]/g),
    ...shell.matchAll(/href\s*=\s*['"]([^'"]+)['"]/g),
  ];
  const routes = [...new Set(matches.map((match) => match[1]).filter((href) => href.startsWith('/') && !href.startsWith('//')))];
  assert.ok(routes.length >= 10, 'Expected to discover the primary and menu navigation links');

  for (const route of routes) {
    const normalized = route.split(/[?#]/)[0].replace(/^\/|\/$/g, '');
    const page = normalized ? 'app/' + normalized + '/page.js' : 'app/page.js';
    assert.ok(exists(page), route + ' does not resolve to ' + page);
  }
});

test('Hub manifest, brand assets and Android App Links association exist', () => {
  assert.ok(exists('public/manifest.webmanifest'));
  assert.ok(exists('public/protlys-logo-exact.png'));
  assert.ok(exists('public/protlys-logo-dark.png'));
  assert.ok(exists('public/.well-known/assetlinks.json'));
});

test('Blog stays a Coming Soon experience while its content source is disabled', () => {
  const library = read('app/library/LibraryClient.js');
  const api = read('app/api/blog/route.js');
  assert.match(library, /if \(!BLOG_ENABLED\)/);
  assert.match(library, /Our journal is coming soon/);
  assert.match(api, /if \(!BLOG_ENABLED\)/);
  assert.match(api, /enabled:\s*false,\s*posts:\s*\[\]/);
});

test('movement screen does not promise automatic tracking or expose Health Connect labels', () => {
  const movement = read('app/movement/MovementClient.js');
  assert.doesNotMatch(movement, /Your steps are tracked automatically/);
  assert.doesNotMatch(movement, /'Health Connect'/);
  assert.match(movement, /source === 'manual' \? 'Manual' : 'Synced'/);
});

test('WebView share actions use native Android sharing and image export when available', () => {
  const shareCard = read('components/ShareCardSheet.js');
  const memberCard = read('components/MemberShareSheet.js');
  const invite = read('app/invite/InviteClient.js');
  const postCard = read('components/PostShareSheet.js');
  const milestone = read('components/MilestoneShareCard.js');
  const events = read('app/events/EventsClient.js');
  assert.match(shareCard, /ProtlysNative\?\.shareImage/);
  assert.match(shareCard, /ProtlysNative\?\.saveImage/);
  assert.match(memberCard, /ProtlysNative\?\.shareImage/);
  assert.match(memberCard, /ProtlysNative\?\.saveImage/);
  assert.match(postCard, /ProtlysNative\?\.shareImage/);
  assert.match(postCard, /ProtlysNative\?\.saveImage/);
  assert.match(milestone, /ProtlysNative\?\.shareImage/);
  assert.match(milestone, /ProtlysNative\?\.saveImage/);
  assert.match(events, /ProtlysNative\?\.shareText/);
  assert.match(invite, /ProtlysNative\?\.shareText/);
});
