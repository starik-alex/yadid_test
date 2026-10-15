/*
 * Quiz questions and lead scoring — the single source of truth.
 * Loaded in the browser as window.YadidScoring and in Node (api/, tests/) via require().
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YadidScoring = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUESTIONS = [
    {
      id: 'relative',
      title: 'מי מבני המשפחה שלך חי בגרמניה או באוסטריה לפני 1945?',
      options: [
        { value: 'parent', label: 'הורה', points: 3 },
        { value: 'grandparent', label: 'סבא או סבתא', points: 3 },
        { value: 'great', label: 'סבא רבא או סבתא רבא', points: 2 },
        { value: 'unknown', label: 'לא בטוח/ה', points: 1 }
      ]
    },
    {
      id: 'left',
      title: 'מתי הם עזבו את גרמניה או אוסטריה?',
      options: [
        { value: '1933-1945', label: 'בין 1933 ל־1945', points: 3 },
        { value: 'before-1933', label: 'לפני 1933', points: 2 },
        { value: 'after-1945', label: 'אחרי 1945', points: 1 },
        { value: 'unknown', label: 'לא יודע/ת', points: 1 }
      ]
    },
    {
      id: 'documents',
      title: 'האם נשארו להם מסמכים מאותה תקופה?',
      hint: 'דרכון, תעודת לידה, תעודת אזרחות, תעודת נישואין',
      options: [
        { value: 'yes', label: 'כן', points: 3 },
        { value: 'some', label: 'חלק מהם', points: 2 },
        { value: 'no', label: 'לא', points: 0 },
        { value: 'unknown', label: 'לא יודע/ת', points: 1 }
      ]
    },
    {
      id: 'chain',
      title: 'יש לך תעודות לידה שמחברות אותך אליהם?',
      hint: 'שלך, של ההורים ושל הסבים — לפי הצורך',
      options: [
        { value: 'all', label: 'כן, לכל הדורות', points: 2 },
        { value: 'some', label: 'חלק מהן', points: 1 },
        { value: 'no', label: 'לא', points: 0 },
        { value: 'unknown', label: 'לא יודע/ת', points: 1 }
      ]
    },
    {
      id: 'for_whom',
      title: 'בשביל מי הבדיקה?',
      options: [
        { value: 'me', label: 'בשבילי', points: 1 },
        { value: 'family', label: 'בשבילי ובשביל הילדים', points: 2 },
        { value: 'relative', label: 'בשביל בן או בת משפחה', points: 1 },
        { value: 'undecided', label: 'עוד לא החלטתי', points: 1 }
      ]
    }
  ];

  var MAX_POINTS = QUESTIONS.reduce(function (sum, q) {
    return sum + Math.max.apply(null, q.options.map(function (o) { return o.points; }));
  }, 0);

  var THRESHOLDS = { high: 10, medium: 5 };

  var TIERS = {
    high: {
      label: 'גבוה',
      title: 'נראה שיש בסיס טוב לזכאות לאזרחות גרמנית',
      text: 'התשובות שלך דומות למקרים שבהם לקוחות שלנו קיבלו אזרחות. נשאיר רק פרטים — ועורך דין יחזור אליך עם הצעדים הבאים.'
    },
    medium: {
      label: 'בינוני',
      title: 'יש סימנים מעודדים — כדאי לבדוק לעומק',
      text: 'חלק מהפרטים חסרים, וזה נורמלי לגמרי. את רוב המסמכים אפשר לאתר בארכיונים בגרמניה. נשמח לבדוק את זה איתך.'
    },
    low: {
      label: 'נמוך',
      title: 'שווה בדיקה מקצועית — לפעמים הזכאות מסתתרת בפרטים',
      text: 'החוק השתנה כמה פעמים בשנים האחרונות, ומקרים שנראו סגורים נפתחו מחדש. שיחה קצרה עם עורך דין תעשה סדר.'
    }
  };

  function findQuestion(id) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
    return null;
  }

  function findOption(question, value) {
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].value === value) return question.options[i];
    }
    return null;
  }

  /** Returns the list of question ids that are missing or have an unknown value. */
  function invalidAnswers(answers) {
    answers = answers || {};
    return QUESTIONS.filter(function (q) { return !findOption(q, answers[q.id]); })
      .map(function (q) { return q.id; });
  }

  function tierFor(points) {
    if (points >= THRESHOLDS.high) return 'high';
    if (points >= THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /** Scores a full answer set. Throws if any answer is missing or invalid. */
  function score(answers) {
    var invalid = invalidAnswers(answers);
    if (invalid.length) throw new Error('Invalid answers: ' + invalid.join(', '));
    var points = QUESTIONS.reduce(function (sum, q) {
      return sum + findOption(q, answers[q.id]).points;
    }, 0);
    var tier = tierFor(points);
    return { points: points, max: MAX_POINTS, tier: tier, tierLabel: TIERS[tier].label };
  }

  /** Human-readable "question: answer" pairs, used in the lawyer's e-mail. */
  function describe(answers) {
    return QUESTIONS.map(function (q) {
      var option = findOption(q, answers[q.id]);
      return { question: q.title, answer: option ? option.label : '—' };
    });
  }

  return {
    QUESTIONS: QUESTIONS,
    MAX_POINTS: MAX_POINTS,
    THRESHOLDS: THRESHOLDS,
    TIERS: TIERS,
    invalidAnswers: invalidAnswers,
    tierFor: tierFor,
    score: score,
    describe: describe
  };
});
