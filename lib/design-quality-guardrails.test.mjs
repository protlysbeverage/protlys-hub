import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public Hub copy describes protein goals without promising intake logging', () => {
  const home = read('../app/page.js');
  assert.match(home, /Use the protein calculator to estimate a practical daily target/);
  assert.doesNotMatch(home, /Keep a simple record of the protein you eat/);
});

test('repository agent guidance routes UI work through the design system and skills', () => {
  const guidance = read('../AGENTS.md');
  assert.match(guidance, /DESIGN\.md/);
  assert.match(guidance, /better-design\/SKILL\.md/);
  assert.match(guidance, /Protein intake\/food logging is out of scope/);
});

test('Protlys design system keeps protein intake logging out of scope', () => {
  const design = read('../DESIGN.md');
  assert.match(design, /protein intake logging is out of scope/i);
  assert.match(design, /44×44/);
});

test('project-local design skills have discoverable entry points', () => {
  for (const skill of [
    'better-design',
    'frontend-design-deslop',
    'make-interfaces-feel-better',
    'motion-director',
    'web-motion-auditor',
  ]) {
    const entry = read('../.agents/skills/' + skill + '/SKILL.md');
    assert.match(entry, /^---\nname:/);
    assert.match(entry, /Protlys/i);
  }
});

test('shared controls retain visible focus and practical touch targets', () => {
  const css = read('../app/globals.css');
  const shell = read('../components/AppShell.js');
  assert.match(css, /\.protlys-app \.pill-opt:focus-visible/);
  assert.match(css, /\.protlys-app \.icon-btn,[\s\S]*?min-width:44px/);
  assert.match(shell, /post-more-btn \{ width:44px;height:44px/);
  assert.match(shell, /movement-setting-button \{ min-height:44px/);
});


test('account dashboard renders one compact build stamp, not duplicate version lines', () => {
  const page = read('../app/account/page.js');
  const account = read('../app/account/AccountClient.js');
  const stamp = read('../components/BuildStamp.js');
  assert.doesNotMatch(page, /NEXT_PUBLIC_BUILD_SHA|NEXT_PUBLIC_BUILD_DATE/);
  assert.equal((account.match(/<BuildStamp\s*\/>/g) || []).length, 1);
  assert.match(stamp, /aria-label="Application version"/);
  assert.match(stamp, /overflowWrap:'anywhere'/);
});

test('feed post cards stay within their column and retain accessible post controls', () => {
  const patch = read('../components/FeedVisualPatch.js');
  const shell = read('../components/AppShell.js');
  assert.match(shell, /import FeedVisualPatch from '@\/components\/FeedVisualPatch'/);
  assert.match(shell, /<FeedVisualPatch \/>/);
  assert.match(patch, /feed-card\.profile-post-card \{ box-sizing:border-box !important; width:100% !important; max-width:100% !important/);
  assert.match(patch, /post-more-btn \{ box-sizing:border-box !important; width:44px !important; height:44px !important/);
  assert.match(patch, /overflow-wrap:anywhere/);
});


test('loading screen uses a light progress bar without rendering the incomplete logo asset', () => {
  const loading = read('../components/LoadingScreen.js');
  const login = read('../app/login/page.js');
  assert.match(loading, /background:\s*#F7F8F6/);
  assert.match(loading, /role="progressbar"/);
  assert.match(loading, /protlys-loading-progress/);
  assert.doesNotMatch(loading, /protlys-logo-exact\.png|<img/);
  assert.match(login, /fallback=\{<LoadingScreen label="Loading login" \/>\}/);
  assert.match(login, /import LoadingScreen from '@\/components\/LoadingScreen'/);
});


test('dashboard greeting prefers the account full name metadata and omits protein intake logging', () => {
  const page = read('../app/account/page.js');
  const account = read('../app/account/AccountClient.js');
  assert.match(page, /metadata\.full_name/);
  assert.match(page, /greetingName=\{greetingName\}/);
  assert.match(account, /greetingName/);
  assert.doesNotMatch(account, /Protein tracker|Log today.?s intake|\/protein/);
});
