'use strict';

/*
 * POST /api/webinar — free Zoom webinar registration.
 * The registrant must explicitly confirm attendance; e-mail is required for the Zoom link.
 */

const common = require('./_lib/common.js');

module.exports = common.handler(async function (body) {
  if (common.isBot(body)) return { status: 200, payload: { ok: true } };

  const { values, errors } = common.validateContact(body, { phoneRequired: false, emailRequired: true });
  if (body.attend !== true) errors.attend = 'required';
  if (Object.keys(errors).length) {
    return { status: 400, payload: { ok: false, error: 'validation', fields: errors } };
  }

  const webinar = common.clean(body.webinar, 120) || 'וובינר אזרחות גרמנית';
  const subject = `הרשמה לוובינר — ${values.name}`;
  const fields = {
    'וובינר': webinar,
    'שם': values.name,
    'אימייל': values.email,
    'טלפון': values.phone || '—',
    'אישור השתתפות': 'כן',
    'הסכמה לעיבוד מידע': 'כן',
    'הסכמה לדיוור שיווקי': values.marketing ? 'כן' : 'לא',
    'זמן שליחה': new Date().toISOString(),
    ...common.cleanTracking(body.tracking)
  };

  const sent = await common.forwardToFormSubmit(fields, { subject });
  if (!sent.ok) {
    console.error('FormSubmit failed', sent.status, sent.data);
    return { status: 502, payload: { ok: false, error: 'delivery_failed' } };
  }
  return { status: 200, payload: { ok: true } };
});
