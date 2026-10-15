'use strict';

/*
 * POST /api/lead — eligibility quiz submission.
 * Re-scores the answers on the server (the browser score is never trusted) and puts the
 * tier in the e-mail subject, so the lawyer can call the strongest leads first.
 */

const scoring = require('../public/js/scoring.js');
const common = require('./_lib/common.js');

module.exports = common.handler(async function (body) {
  if (common.isBot(body)) return { status: 200, payload: { ok: true } };

  const { values, errors } = common.validateContact(body, { phoneRequired: true, emailRequired: false });
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const invalid = scoring.invalidAnswers(answers);
  if (invalid.length) errors.answers = invalid;
  if (Object.keys(errors).length) {
    return { status: 400, payload: { ok: false, error: 'validation', fields: errors } };
  }

  const result = scoring.score(answers);
  const tracking = common.cleanTracking(body.tracking);
  const subject = `[${result.tierLabel}] ליד חדש — בדיקת זכאות לאזרחות גרמנית — ${values.name}`;

  const fields = {
    'שם': values.name,
    'טלפון': values.phone,
    'אימייל': values.email || '—',
    'סיכוי': `${result.tierLabel} (${result.points}/${result.max})`
  };
  scoring.describe(answers).forEach(function (row, i) {
    fields[`${i + 1}. ${row.question}`] = row.answer;
  });
  fields['הסכמה לעיבוד מידע'] = 'כן';
  fields['הסכמה לדיוור שיווקי'] = values.marketing ? 'כן' : 'לא';
  fields['זמן שליחה'] = new Date().toISOString();
  Object.assign(fields, tracking);

  const sent = await common.forwardToFormSubmit(fields, { subject });
  if (!sent.ok) {
    console.error('FormSubmit failed', sent.status, sent.data);
    return { status: 502, payload: { ok: false, error: 'delivery_failed' } };
  }
  return { status: 200, payload: { ok: true, tier: result.tier } };
});
