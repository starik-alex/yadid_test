/*
 * Eligibility quiz: one question per screen, one tap per answer, then result + contact form.
 */
(function () {
  'use strict';

  var Scoring = window.YadidScoring;
  var Forms = window.YadidForms;
  var QUESTIONS = Scoring.QUESTIONS;

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, data || {}));
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-quiz]');
    if (!root) return;

    var area = root.querySelector('[data-question-area]');
    var stepLabel = root.querySelector('[data-step-label]');
    var progress = root.querySelector('[role="progressbar"]');
    var fill = root.querySelector('[data-progress]');
    var back = root.querySelector('[data-back]');
    var reassure = root.querySelector('[data-reassure]');
    var resultBox = root.querySelector('[data-result]');
    var success = root.querySelector('[data-success]');
    var form = root.querySelector('form');

    var answers = {};
    var step = 0;

    root.classList.add('is-ready');

    function setProgress(done) {
      progress.setAttribute('aria-valuenow', String(done));
      fill.style.width = (done / QUESTIONS.length * 100) + '%';
    }

    function render(focus) {
      var q = QUESTIONS[step];
      stepLabel.textContent = 'שאלה ' + (step + 1) + ' מתוך ' + QUESTIONS.length;
      setProgress(step);
      back.hidden = step === 0;

      area.innerHTML = '';
      var group = document.createElement('div');
      group.className = 'question';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', 'q-title');

      var title = document.createElement('h3');
      title.id = 'q-title';
      title.className = 'question-title';
      title.tabIndex = -1;
      title.textContent = q.title;
      group.appendChild(title);

      if (q.hint) {
        var hint = document.createElement('p');
        hint.className = 'question-hint';
        hint.textContent = q.hint;
        group.appendChild(hint);
      }

      var options = document.createElement('div');
      options.className = 'options';
      q.options.forEach(function (option) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'option';
        button.textContent = option.label;
        button.setAttribute('aria-pressed', answers[q.id] === option.value ? 'true' : 'false');
        button.addEventListener('click', function () { choose(q, option.value, button); });
        options.appendChild(button);
      });
      group.appendChild(options);
      area.appendChild(group);

      if (focus) title.focus();
    }

    /** Moves focus for screen readers and scrolls the panel clear of the sticky header. */
    function reveal(panel, heading) {
      heading.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'center' });
    }

    function choose(q, value, button) {
      if (step === 0 && !answers[q.id]) track('quiz_start');
      answers[q.id] = value;
      area.querySelectorAll('.option').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      button.setAttribute('aria-pressed', 'true');
      track('quiz_step', { step: step + 1 });
      setTimeout(function () {
        if (step < QUESTIONS.length - 1) {
          step += 1;
          render(true);
        } else {
          showResult();
        }
      }, 180);
    }

    function showResult() {
      var result = Scoring.score(answers);
      var tier = Scoring.TIERS[result.tier];
      setProgress(QUESTIONS.length);
      stepLabel.textContent = 'כמעט סיימנו';
      area.innerHTML = '';
      area.hidden = true;
      reassure.hidden = true;
      back.hidden = false;
      resultBox.hidden = false;
      resultBox.dataset.tier = result.tier;
      resultBox.querySelector('[data-result-title]').textContent = tier.title;
      resultBox.querySelector('[data-result-text]').textContent = tier.text;
      reveal(resultBox, resultBox.querySelector('[data-result-title]'));
      track('quiz_complete', { tier: result.tier });
    }

    back.addEventListener('click', function () {
      if (!resultBox.hidden) {
        resultBox.hidden = true;
        area.hidden = false;
        reassure.hidden = false;
      } else if (step > 0) {
        step -= 1;
      }
      render(true);
    });

    Forms.liveClear(form);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var errors = Forms.validate(form, { phoneRequired: true });
      Forms.showErrors(form, errors);
      if (Object.keys(errors).length) return;

      var button = form.querySelector('[type="submit"]');
      var status = form.querySelector('[data-form-status]');
      status.textContent = '';
      Forms.setLoading(button, true);

      Forms.post('/api/lead', {
        answers: answers,
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        consent: form.elements.consent.checked,
        marketing: form.elements.marketing.checked,
        _gotcha: form.elements._gotcha.value,
        tracking: Forms.tracking()
      }).then(function (response) {
        Forms.setLoading(button, false);
        if (response.ok) {
          resultBox.hidden = true;
          back.hidden = true;
          stepLabel.textContent = 'נשלח';
          success.hidden = false;
          reveal(success, success.querySelector('h3'));
          track('generate_lead', { form: 'eligibility', tier: Scoring.score(answers).tier });
          return;
        }
        if (response.fields) Forms.showErrors(form, response.fields);
        status.textContent = response.error === 'validation'
          ? 'נא לבדוק את השדות המסומנים'
          : 'משהו השתבש בשליחה. אפשר לנסות שוב או לכתוב לנו בוואטסאפ.';
      });
    });

    render(false);
  });
})();
