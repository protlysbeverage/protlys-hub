import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public Hub copy describes protein goals without promising intake logging', () => {
  const home = read('../app/page.js');
  assert.match(home, /Use the protein calculator to estimate a practical daily target/);
  assert.doesNotMatch(home, /Keep a simple record of the protein you eat/);
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
