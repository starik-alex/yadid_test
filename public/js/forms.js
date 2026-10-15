/*
 * Shared form behaviour: validation messages, preview mode, tracking, submit states, WhatsApp links.
 */
(function () {
  'use strict';

  var config = window.YADID_CONFIG || {};

  var MESSAGES = {
    name: { required: 'נא לכתוב שם מלא' },
    phone: { required: 'נא לכתוב מספר טלפון', invalid: 'מספר הטלפון לא נראה תקין — לדוגמה 050-1234567' },
    email: { required: 'נא לכתוב כתובת אימייל', invalid: 'כתובת האימייל לא נראית תקינה' },
    consent: { required: 'כדי שנוכל לחזור אליך, צריך לאשר את מדיניות הפרטיות' },
    attend: { required: 'נא לאשר שתגיע/י לוובינר' }
  };

  /**
   * Preview mode: the page is opened as a file, inside a sandboxed preview, or with ?preview=1.
   * Forms then simulate success instead of sending data anywhere.
   */
  function isPreview() {
    var params = new URLSearchParams(location.search);
    if (params.get('preview') === '1') return true;
    if (location.protocol === 'file:' || location.protocol === 'about:' || location.origin === 'null') return true;
    return /(^|\.)claude\.ai$|claudeusercontent|artifact/i.test(location.hostname);
  }

  function showPreviewBanner() {
    if (!isPreview()) return;
    var banner = document.createElement('div');
    banner.className = 'preview-banner';
    banner.setAttribute('role', 'status');
    banner.textContent = 'תצוגה מקדימה — הטפסים עובדים, אבל לא נשלחים';
    document.body.prepend(banner);
  }

  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

  /** Captures ad parameters on the first visit so they survive navigation between the two pages. */
  function tracking() {
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('yadid_tracking') || '{}'); } catch (_) { stored = {}; }
    var params = new URLSearchParams(location.search);
    TRACKING_KEYS.forEach(function (key) {
      if (params.get(key)) stored[key] = params.get(key);
    });
    try { sessionStorage.setItem('yadid_tracking', JSON.stringify(stored)); } catch (_) { /* storage blocked */ }
    stored.page = location.origin + location.pathname;
    return stored;
  }

  function fieldError(form, name, code) {
    var input = form.elements[name];
    var box = form.querySelector('[data-error-for="' + name + '"]');
    var wrapper = input && input.closest('.field, .check');
    var message = code ? (MESSAGES[name] && MESSAGES[name][code]) || 'נא לבדוק את השדה' : '';
    if (input) input.setAttribute('aria-invalid', code ? 'true' : 'false');
    if (wrapper) wrapper.classList.toggle('has-error', !!code);
    if (box) box.textContent = message;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function phoneValid(value) {
    if (!/^[+\d][\d\s\-()]*$/.test(value)) return false;
    var digits = value.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }

  /** Client-side checks mirroring the API. rules: { emailRequired, phoneRequired, attend } */
  function validate(form, rules) {
    var errors = {};
    var name = form.elements.name.value.trim();
    var phone = form.elements.phone ? form.elements.phone.value.trim() : '';
    var email = form.elements.email ? form.elements.email.value.trim() : '';
    if (name.length < 2) errors.name = 'required';
    if (rules.phoneRequired && !phone) errors.phone = 'required';
    else if (phone && !phoneValid(phone)) errors.phone = 'invalid';
    if (rules.emailRequired && !email) errors.email = 'required';
    else if (email && !EMAIL_RE.test(email)) errors.email = 'invalid';
    if (!form.elements.consent.checked) errors.consent = 'required';
    if (rules.attend && !form.elements.attend.checked) errors.attend = 'required';
    return errors;
  }

  function showErrors(form, errors) {
    ['name', 'phone', 'email', 'consent', 'attend'].forEach(function (field) {
      if (form.elements[field]) fieldError(form, field, errors[field]);
    });
    var first = Object.keys(errors)[0];
    if (first && form.elements[first]) form.elements[first].focus();
  }

  /** Clears a field's error as soon as the user fixes it. */
  function liveClear(form) {
    form.addEventListener('input', function (event) {
      var target = event.target;
      if (target.name && target.getAttribute('aria-invalid') === 'true') fieldError(form, target.name, null);
    });
    form.addEventListener('change', function (event) {
      var target = event.target;
      if (target.type === 'checkbox' && target.checked) fieldError(form, target.name, null);
    });
  }

  function setLoading(button, loading) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = loading;
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
    button.textContent = loading ? 'שולח…' : button.dataset.label;
  }

  /** POSTs JSON. Resolves { ok, fields? }. Preview mode never touches the network. */
  function post(path, payload) {
    if (isPreview()) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve({ ok: true, preview: true }); }, 700);
      });
    }
    return fetch((config.apiBase || '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        data.ok = response.ok && data.ok !== false;
        return data;
      });
    }).catch(function () {
      return { ok: false, error: 'network' };
    });
  }

  function whatsappHref() {
    return 'https://wa.me/' + (config.whatsappNumber || '') +
      '?text=' + encodeURIComponent(config.whatsappText || '');
  }

  function wireWhatsapp() {
    document.querySelectorAll('[data-whatsapp]').forEach(function (link) {
      link.href = whatsappHref();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    showPreviewBanner();
    wireWhatsapp();
    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();

    // The sticky mobile bar steps aside while the form it points to is on screen.
    var bar = document.querySelector('[data-mobile-bar]');
    var target = bar && document.querySelector(bar.dataset.hideNear);
    if (bar && target && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle('is-hidden', entries[0].isIntersecting);
      }, { threshold: 0.15 }).observe(target);
    }
  });

  window.YadidForms = {
    isPreview: isPreview,
    tracking: tracking,
    validate: validate,
    showErrors: showErrors,
    liveClear: liveClear,
    setLoading: setLoading,
    post: post,
    whatsappHref: whatsappHref
  };
})();
