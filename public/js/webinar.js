/*
 * Webinar page: fills in the date from config, handles registration, offers "add to calendar".
 */
(function () {
  'use strict';

  var Forms = window.YadidForms;
  var webinar = (window.YADID_CONFIG || {}).webinar || {};

  function formatDate(date) {
    var tz = { timeZone: 'Asia/Jerusalem' };
    return {
      day: date.toLocaleDateString('he-IL', Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, tz)),
      time: date.toLocaleTimeString('he-IL', Object.assign({ hour: '2-digit', minute: '2-digit' }, tz))
    };
  }

  function icsStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function calendarLinks(start, end) {
    var text = webinar.title || 'וובינר';
    var details = 'קישור ל־Zoom יישלח במייל לפני תחילת הוובינר.';
    var google = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(text) +
      '&dates=' + icsStamp(start) + '/' + icsStamp(end) +
      '&details=' + encodeURIComponent(details) +
      '&location=Zoom';
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Yadid Law//Webinar//HE', 'BEGIN:VEVENT',
      'UID:webinar-' + icsStamp(start) + '@yadidlaw.com',
      'DTSTAMP:' + icsStamp(new Date()),
      'DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(end),
      'SUMMARY:' + text, 'DESCRIPTION:' + details, 'LOCATION:Zoom',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    return {
      google: google,
      ics: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var start = new Date(webinar.start);
    var end = new Date(start.getTime() + (webinar.durationMinutes || 60) * 60000);
    var valid = !isNaN(start.getTime());

    if (valid) {
      var formatted = formatDate(start);
      document.querySelectorAll('[data-webinar-day]').forEach(function (el) { el.textContent = formatted.day; });
      document.querySelectorAll('[data-webinar-time]').forEach(function (el) { el.textContent = formatted.time; });
    }
    document.querySelectorAll('[data-webinar-title]').forEach(function (el) {
      if (webinar.title) el.textContent = webinar.title;
    });

    var form = document.querySelector('[data-webinar-form]');
    if (!form) return;
    var success = document.querySelector('[data-success]');
    var formCard = document.querySelector('[data-form-card]');

    if (valid) {
      var links = calendarLinks(start, end);
      success.querySelector('[data-cal-google]').href = links.google;
      success.querySelector('[data-cal-ics]').href = links.ics;
    } else {
      success.querySelector('[data-calendar]').hidden = true;
    }

    Forms.liveClear(form);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var errors = Forms.validate(form, { emailRequired: true, attend: true });
      Forms.showErrors(form, errors);
      if (Object.keys(errors).length) return;

      var button = form.querySelector('[type="submit"]');
      var status = form.querySelector('[data-form-status]');
      status.textContent = '';
      Forms.setLoading(button, true);

      Forms.post('/api/webinar', {
        webinar: (webinar.title || '') + (valid ? ' — ' + start.toISOString() : ''),
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        attend: form.elements.attend.checked,
        consent: form.elements.consent.checked,
        marketing: form.elements.marketing.checked,
        _gotcha: form.elements._gotcha.value,
        tracking: Forms.tracking()
      }).then(function (response) {
        Forms.setLoading(button, false);
        if (response.ok) {
          formCard.hidden = true;
          success.hidden = false;
          success.querySelector('h2').focus({ preventScroll: true });
          success.scrollIntoView({ block: 'center' });
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'sign_up', form: 'webinar' });
          return;
        }
        if (response.fields) Forms.showErrors(form, response.fields);
        status.textContent = response.error === 'validation'
          ? 'נא לבדוק את השדות המסומנים'
          : 'משהו השתבש בשליחה. אפשר לנסות שוב או לכתוב לנו בוואטסאפ.';
      });
    });
  });
})();
