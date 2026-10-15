'use strict';

/* Checks the HTML for the things that are easy to break and expensive to miss. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const pages = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html'));
const read = (file) => fs.readFileSync(path.join(PUBLIC, file), 'utf8');

test('all four pages exist', () => {
  assert.deepEqual(pages.sort(), ['accessibility.html', 'index.html', 'privacy.html', 'webinar.html']);
});

for (const page of pages) {
  const html = read(page);

  test(`${page}: Hebrew, right-to-left, viewport set`, () => {
    assert.match(html, /<html lang="he" dir="rtl">/);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /class="skip-link" href="#main"/);
    assert.match(html, /<main id="main"/);
  });

  test(`${page}: every local file it references exists`, () => {
    const refs = [...html.matchAll(/(?:src|href)="(\/(?:css|js|assets)\/[^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) assert.ok(fs.existsSync(path.join(PUBLIC, ref)), `${ref} is missing`);
  });

  test(`${page}: scripts only from our own domain`, () => {
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    for (const src of scripts) assert.ok(src.startsWith('/js/'), src);
  });

  test(`${page}: every input has a <label for>`, () => {
    const ids = [...html.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    const inputs = (html.match(/<input\b/g) || []).length;
    assert.equal(ids.length, inputs, 'every input needs an id');
    for (const id of ids) assert.match(html, new RegExp(`<label for="${id}"`), `label for #${id}`);
  });

  test(`${page}: marketing opt-in is never pre-checked`, () => {
    const marketing = html.match(/<input[^>]*name="marketing"[^>]*>/g) || [];
    for (const input of marketing) assert.doesNotMatch(input, /\bchecked\b/);
  });
}

for (const page of ['index.html', 'webinar.html']) {
  const html = read(page);
  test(`${page}: required consent links to the privacy policy; honeypot present; mobile bar`, () => {
    assert.match(html, /name="consent" type="checkbox" required/);
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /href="\/accessibility"/);
    assert.match(html, /name="_gotcha"/);
    assert.match(html, /data-mobile-bar/);
    assert.match(html, /data-whatsapp/);
  });
}

test('webinar.html: attendance confirmation checkbox is required', () => {
  assert.match(read('webinar.html'), /name="attend" type="checkbox" required/);
});

test('styles: dark mode, reduced motion, 48px tap target and RTL overflow fix', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css', 'styles.css'), 'utf8');
  assert.match(css, /prefers-color-scheme: dark/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /--tap: 48px/);
  assert.match(css, /overflow-x: clip/);
});

test('design tokens match the CSS custom properties', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css', 'styles.css'), 'utf8');
  const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'design', 'tokens.json'), 'utf8'));
  const light = css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)'));
  for (const [name, token] of Object.entries(tokens.color.light)) {
    if (name.startsWith('$')) continue;
    const re = new RegExp(`--color-${name}: ${token.$value.toLowerCase()};`);
    assert.match(light, re, `color.light.${name}`);
  }
  for (const [name, token] of Object.entries(tokens.radius)) {
    if (name.startsWith('$')) continue;
    assert.match(css, new RegExp(`--radius-${name}: ${token.$value};`), `radius.${name}`);
  }
});
