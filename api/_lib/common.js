'use strict';

/*
 * Shared helpers for the serverless functions.
 * Files under api/_lib are not exposed as routes by Vercel (leading underscore).
 */

const DEFAULT_LEAD_EMAIL = 'tal.g@yadidlaw.com';
const MAX_BODY_BYTES = 16 * 1024;

function leadEmail() {
  return process.env.LEAD_EMAIL || DEFAULT_LEAD_EMAIL;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Reads a JSON body. Vercel pre-parses it into req.body; the dev server and tests may not. */
async function readJson(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    return req.body;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function clean(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidPhone(phone) {
  if (!/^[+\d][\d\s\-()]*$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

/** Validates the contact block shared by both forms. Returns { values, errors }. */
function validateContact(body, { emailRequired, phoneRequired }) {
  const values = {
    name: clean(body.name, 80),
    phone: clean(body.phone, 30),
    email: clean(body.email, 120).toLowerCase(),
    consent: body.consent === true,
    marketing: body.marketing === true
  };
  const errors = {};
  if (values.name.length < 2) errors.name = 'required';
  if (phoneRequired || values.phone) {
    if (!values.phone) errors.phone = 'required';
    else if (!isValidPhone(values.phone)) errors.phone = 'invalid';
  }
  if (emailRequired || values.email) {
    if (!values.email) errors.email = 'required';
    else if (!EMAIL_RE.test(values.email)) errors.email = 'invalid';
  }
  if (!values.consent) errors.consent = 'required';
  return { values, errors };
}

/** Marketing attribution sent by the page (utm_*, gclid, fbclid, landing URL). */
function cleanTracking(tracking) {
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'page'];
  const out = {};
  if (tracking && typeof tracking === 'object') {
    for (const key of allowed) {
      const value = clean(tracking[key], 300);
      if (value) out[key] = value;
    }
  }
  return out;
}

/** True when the hidden honeypot field was filled in — a bot, not a person. */
function isBot(body) {
  return typeof body._gotcha === 'string' && body._gotcha.trim() !== '';
}

/**
 * Forwards a submission to FormSubmit, which e-mails it to the firm.
 * The very first submission triggers an activation e-mail that must be confirmed once.
 * DRY_RUN=1 skips the network call (local dev server and tests).
 */
async function forwardToFormSubmit(fields, { subject }) {
  if (process.env.DRY_RUN === '1') {
    console.log('[DRY_RUN] would e-mail %s: %s\n%o', leadEmail(), subject, fields);
    return { ok: true, dryRun: true };
  }
  const siteUrl = process.env.SITE_URL || 'https://yadid-landing.vercel.app';
  const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(leadEmail()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: siteUrl,
      Referer: siteUrl + '/'
    },
    body: JSON.stringify({
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      ...fields
    })
  });
  let data = null;
  try { data = await response.json(); } catch (_) { /* non-JSON error page */ }
  const ok = response.ok && (!data || data.success === undefined || String(data.success) === 'true');
  return { ok, status: response.status, data };
}

/** Wraps a handler with method checks and uniform error responses. */
function handler(processBody) {
  return async function (req, res) {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.end();
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return send(res, 405, { ok: false, error: 'method_not_allowed' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch (err) {
      return send(res, err.status || 400, { ok: false, error: 'invalid_json' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return send(res, 400, { ok: false, error: 'invalid_json' });
    }
    try {
      const { status, payload } = await processBody(body, req);
      return send(res, status, payload);
    } catch (err) {
      console.error(err);
      return send(res, 500, { ok: false, error: 'server_error' });
    }
  };
}

module.exports = {
  DEFAULT_LEAD_EMAIL,
  leadEmail,
  send,
  readJson,
  clean,
  isValidPhone,
  validateContact,
  cleanTracking,
  isBot,
  forwardToFormSubmit,
  handler
};
