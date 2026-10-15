/*
 * Settings the firm changes without touching the code. See README → "Что поменять перед запуском".
 */
window.YADID_CONFIG = {
  // WhatsApp number in international format, digits only (972 + number without the leading 0).
  // TODO: replace with the firm's real WhatsApp number before launch.
  whatsappNumber: '972000000000',
  whatsappText: 'שלום, אשמח לבדוק זכאות לאזרחות גרמנית',

  webinar: {
    title: 'אזרחות גרמנית לצאצאי יוצאי גרמניה — מה צריך לדעת ב־2026',
    // TODO: set the real date. ISO 8601 with the Israel offset.
    start: '2026-11-19T20:00:00+02:00',
    durationMinutes: 60
  },

  // Forms post here. Leave empty to use the same domain (/api/lead, /api/webinar on Vercel).
  apiBase: ''
};
