'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const scoring = require('../public/js/scoring.js');

const strong = { relative: 'grandparent', left: '1933-1945', documents: 'yes', chain: 'all', for_whom: 'family' };
const unsure = { relative: 'unknown', left: 'unknown', documents: 'unknown', chain: 'unknown', for_whom: 'undecided' };
const weak = { relative: 'great', left: 'after-1945', documents: 'no', chain: 'no', for_whom: 'me' };

test('quiz has five questions, each with four answers including "don\'t know"-style option', () => {
  assert.equal(scoring.QUESTIONS.length, 5);
  for (const q of scoring.QUESTIONS) {
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.title.length > 0);
  }
});

test('max points is the sum of the best answer of each question', () => {
  assert.equal(scoring.MAX_POINTS, 13);
  assert.equal(scoring.score(strong).points, 13);
});

test('tiers: strong answers are high, all "don\'t know" is medium, weak is low', () => {
  assert.equal(scoring.score(strong).tier, 'high');
  assert.equal(scoring.score(unsure).tier, 'medium');
  assert.equal(scoring.score(weak).tier, 'low');
  assert.equal(scoring.score(strong).tierLabel, 'גבוה');
});

test('tier thresholds are inclusive', () => {
  assert.equal(scoring.tierFor(scoring.THRESHOLDS.high), 'high');
  assert.equal(scoring.tierFor(scoring.THRESHOLDS.high - 1), 'medium');
  assert.equal(scoring.tierFor(scoring.THRESHOLDS.medium), 'medium');
  assert.equal(scoring.tierFor(scoring.THRESHOLDS.medium - 1), 'low');
});

test('missing or forged answers are rejected', () => {
  assert.deepEqual(scoring.invalidAnswers({ ...strong, chain: undefined }), ['chain']);
  assert.deepEqual(scoring.invalidAnswers({ ...strong, relative: 'hacker' }), ['relative']);
  assert.throws(() => scoring.score({}), /Invalid answers/);
});

test('describe() returns readable question/answer pairs for the e-mail', () => {
  const rows = scoring.describe(strong);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].answer, 'סבא או סבתא');
});
