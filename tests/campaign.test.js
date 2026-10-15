'use strict';

/* Google Ads rejects headlines over 30 and descriptions over 90 characters. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'CAMPAIGN.md'), 'utf8');

function items(heading) {
  const start = md.indexOf(heading);
  assert.ok(start !== -1, `section "${heading}" not found`);
  const rest = md.slice(start + heading.length);
  const section = rest.slice(0, rest.search(/\n#{2,3} /));
  return [...section.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]);
}

test('Google Ads headlines: 10–15 items, each 30 characters or fewer', () => {
  const headlines = items('### Заголовки (до 30 символов)');
  assert.ok(headlines.length >= 10 && headlines.length <= 15, `${headlines.length} headlines`);
  for (const h of headlines) assert.ok([...h].length <= 30, `${[...h].length}: ${h}`);
  assert.equal(new Set(headlines).size, headlines.length, 'no duplicates');
});

test('Google Ads descriptions: 2–4 items, each 90 characters or fewer', () => {
  const descriptions = items('### Описания (до 90 символов)');
  assert.ok(descriptions.length >= 2 && descriptions.length <= 4, `${descriptions.length} descriptions`);
  for (const d of descriptions) assert.ok([...d].length <= 90, `${[...d].length}: ${d}`);
});
