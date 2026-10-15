'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { call, mockFetch } = require('./helpers.js');
const lead = require('../api/lead.js');
const webinar = require('../api/webinar.js');

delete process.env.DRY_RUN;
delete process.env.LEAD_EMAIL;
console.error = () => {}; // keep expected failure logs out of the test output

const answers = { relative: 'grandparent', left: '1933-1945', documents: 'some', chain: 'all', for_whom: 'me' };
const validLead = {
  answers,
  name: 'ישראל ישראלי',
  phone: '050-1234567',
  email: 'Israel@Example.com',
  consent: true,
  marketing: false,
  _gotcha: '',
  tracking: { utm_source: 'google', utm_campaign: 'de-citizenship', evil: 'x' }
};
const validWebinar = { name: 'Dana Cohen', email: 'dana@example.com', phone: '', attend: true, consent: true, marketing: true };

test('lead: valid submission is scored on the server and e-mailed with the tier in the subject', async (t) => {
  const calls = mockFetch(t);
  const res = await call(lead, 'POST', validLead);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true, tier: 'high' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://formsubmit.co/ajax/tal.g%40yadidlaw.com');
  const p = calls[0].payload;
  assert.match(p._subject, /^\[גבוה\] ליד חדש/);
  assert.equal(p['סיכוי'], 'גבוה (11/13)');
  assert.equal(p['אימייל'], 'israel@example.com');
  assert.equal(p['הסכמה לדיוור שיווקי'], 'לא');
  assert.equal(p.utm_source, 'google');
  assert.equal(p.evil, undefined, 'unknown tracking keys are dropped');
});

test('lead: works with a body pre-parsed by Vercel', async (t) => {
  mockFetch(t);
  const res = await call(lead, 'POST', validLead, { parsed: true });
  assert.equal(res.statusCode, 200);
});

test('lead: client-sent score is ignored — low answers stay low', async (t) => {
  const calls = mockFetch(t);
  const weak = { relative: 'great', left: 'after-1945', documents: 'no', chain: 'no', for_whom: 'me', tier: 'high' };
  const res = await call(lead, 'POST', { ...validLead, answers: weak, tier: 'high' });
  assert.equal(res.json().tier, 'low');
  assert.match(calls[0].payload._subject, /^\[נמוך\]/);
});

test('lead: missing consent, bad phone, short name and missing answers are rejected', async (t) => {
  const calls = mockFetch(t);
  const res = await call(lead, 'POST', { ...validLead, consent: false, phone: '12ab', name: 'א', answers: { relative: 'parent' } });
  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.error, 'validation');
  assert.equal(body.fields.consent, 'required');
  assert.equal(body.fields.phone, 'invalid');
  assert.equal(body.fields.name, 'required');
  assert.deepEqual(body.fields.answers, ['left', 'documents', 'chain', 'for_whom']);
  assert.equal(calls.length, 0, 'nothing is sent when validation fails');
});

test('lead: consent must be a real boolean true, not the string "true"', async (t) => {
  mockFetch(t);
  const res = await call(lead, 'POST', { ...validLead, consent: 'true' });
  assert.equal(res.statusCode, 400);
});

test('lead: honeypot filled → pretend success, send nothing', async (t) => {
  const calls = mockFetch(t);
  const res = await call(lead, 'POST', { ...validLead, _gotcha: 'http://spam' });
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test('lead: FormSubmit failure → 502', async (t) => {
  mockFetch(t, { status: 500, body: { success: 'false' } });
  const res = await call(lead, 'POST', validLead);
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, 'delivery_failed');
});

test('lead: FormSubmit answers 200 but success=false → 502', async (t) => {
  mockFetch(t, { status: 200, body: { success: 'false', message: 'needs activation' } });
  const res = await call(lead, 'POST', validLead);
  assert.equal(res.statusCode, 502);
});

test('lead: GET is not allowed, broken JSON is a 400', async () => {
  const get = await call(lead, 'GET');
  assert.equal(get.statusCode, 405);
  assert.equal(get.headers.allow, 'POST, OPTIONS');
  const broken = await call(lead, 'POST', '{not json');
  assert.equal(broken.statusCode, 400);
  const array = await call(lead, 'POST', '[]');
  assert.equal(array.statusCode, 400);
});

test('lead: LEAD_EMAIL overrides the recipient; DRY_RUN skips the network', async (t) => {
  const calls = mockFetch(t);
  process.env.LEAD_EMAIL = 'test@example.com';
  t.after(() => { delete process.env.LEAD_EMAIL; delete process.env.DRY_RUN; });
  await call(lead, 'POST', validLead);
  assert.equal(calls[0].url, 'https://formsubmit.co/ajax/test%40example.com');

  process.env.DRY_RUN = '1';
  const log = console.log;
  console.log = () => {};
  const res = await call(lead, 'POST', validLead);
  console.log = log;
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1, 'no extra request in dry-run');
});

test('webinar: valid registration is e-mailed', async (t) => {
  const calls = mockFetch(t);
  const res = await call(webinar, 'POST', validWebinar);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });
  assert.match(calls[0].payload._subject, /^הרשמה לוובינר — Dana Cohen/);
  assert.equal(calls[0].payload['אישור השתתפות'], 'כן');
  assert.equal(calls[0].payload['הסכמה לדיוור שיווקי'], 'כן');
  assert.equal(calls[0].payload['טלפון'], '—');
});

test('webinar: attendance confirmation is required', async (t) => {
  const calls = mockFetch(t);
  const res = await call(webinar, 'POST', { ...validWebinar, attend: false });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().fields.attend, 'required');
  assert.equal(calls.length, 0);
});

test('webinar: e-mail is required (Zoom link), phone is optional but validated', async (t) => {
  mockFetch(t);
  const noEmail = await call(webinar, 'POST', { ...validWebinar, email: '' });
  assert.equal(noEmail.json().fields.email, 'required');
  const badEmail = await call(webinar, 'POST', { ...validWebinar, email: 'dana@' });
  assert.equal(badEmail.json().fields.email, 'invalid');
  const badPhone = await call(webinar, 'POST', { ...validWebinar, phone: '123' });
  assert.equal(badPhone.json().fields.phone, 'invalid');
  const intl = await call(webinar, 'POST', { ...validWebinar, phone: '+972 50 123 4567' });
  assert.equal(intl.statusCode, 200);
});
