(function () {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var MAX_DAYS_AHEAD = 180;
  var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  var HOLIDAY_API = 'https://date.nager.at/api/v3/PublicHolidays/';

  // Used only when the holiday API can't be reached.
  var FALLBACK_HOLIDAYS = {
    2026: {
      '2026-01-01': '새해', '2026-02-16': '설날', '2026-02-17': '설날', '2026-02-18': '설날',
      '2026-03-02': '3·1절(대체)', '2026-05-01': '노동절', '2026-05-05': '어린이날',
      '2026-05-25': '부처님 오신 날(대체)', '2026-06-03': '지방 선거일', '2026-06-06': '현충일',
      '2026-07-17': '제헌절', '2026-08-17': '광복절(대체)', '2026-09-24': '추석',
      '2026-09-25': '추석', '2026-09-26': '추석', '2026-10-05': '개천절(대체)',
      '2026-10-09': '한글날', '2026-12-25': '크리스마스'
    },
    2027: {
      '2027-01-01': '새해', '2027-02-06': '설날', '2027-02-08': '설날', '2027-02-09': '설날',
      '2027-03-01': '3·1절', '2027-05-03': '노동절', '2027-05-05': '어린이날',
      '2027-05-13': '부처님 오신 날', '2027-06-06': '현충일', '2027-07-19': '제헌절',
      '2027-08-16': '광복절', '2027-09-14': '추석', '2027-09-15': '추석', '2027-09-16': '추석',
      '2027-10-04': '개천절', '2027-10-11': '한글날', '2027-12-25': '크리스마스'
    }
  };

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function ymd(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var minDate = new Date(today); minDate.setDate(minDate.getDate() + 1);
  var maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  var minKey = ymd(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  var maxKey = ymd(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
  var todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  var el = {
    form: $('reserve-form'), grid: $('cal-grid'), title: $('cal-title'),
    prev: $('cal-prev'), next: $('cal-next'), note: $('cal-note'),
    dateBox: $('date-box'), time: $('time-select'),
    name: $('f-name'), email: $('f-email'), purpose: $('f-purpose'), website: $('f-website'),
    count: $('purpose-count'), consent: $('f-consent'), submit: $('btn-submit'),
    dialog: $('confirm-dialog'), review: $('confirm-review'), done: $('confirm-done'),
    cDate: $('c-date'), cTime: $('c-time'), cName: $('c-name'), cEmail: $('c-email'), cPurpose: $('c-purpose'),
    cError: $('confirm-error'), cEdit: $('confirm-edit'), cSend: $('confirm-send'), cClose: $('confirm-close')
  };

  var state = { date: '', viewYear: minDate.getFullYear(), viewMonth: minDate.getMonth() };
  var touched = {};
  var holidayCache = {};
  var reservationDone = false;

  /* ---------- time options: 13:00 ~ 18:00, 30 min ---------- */
  (function buildTimes() {
    for (var h = 13; h <= 18; h++) {
      [0, 30].forEach(function (m) {
        if (h === 18 && m === 30) return;
        var label = pad(h) + ':' + pad(m);
        var opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        el.time.appendChild(opt);
      });
    }
  })();

  /* ---------- holidays ---------- */
  function loadHolidays(year) {
    if (holidayCache[year]) return Promise.resolve(holidayCache[year]);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    return fetch(HOLIDAY_API + year + '/KR', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        var map = {};
        list.forEach(function (h) { map[h.date] = h.localName; });
        holidayCache[year] = { map: map, ok: true };
        return holidayCache[year];
      })
      .catch(function () {
        var fb = FALLBACK_HOLIDAYS[year];
        holidayCache[year] = { map: fb || {}, ok: !!fb };
        return holidayCache[year];
      })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  }

  /* ---------- calendar ---------- */
  var renderToken = 0;

  function renderCalendar() {
    var y = state.viewYear, m = state.viewMonth;
    var token = ++renderToken;
    el.title.textContent = y + '년 ' + (m + 1) + '월';
    el.prev.disabled = (y === minDate.getFullYear() && m <= minDate.getMonth());
    el.next.disabled = (y === maxDate.getFullYear() && m >= maxDate.getMonth());
    el.grid.innerHTML = '<p class="cal-loading">캘린더를 불러오는 중…</p>';

    loadHolidays(y).then(function (h) {
      if (token !== renderToken) return;
      el.note.hidden = h.ok;
      drawGrid(y, m, h.map);
    });
  }

  function drawGrid(y, m, holidays) {
    var frag = document.createDocumentFragment();
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();

    for (var i = 0; i < first; i++) {
      var blank = document.createElement('span');
      blank.className = 'cal-day is-blank';
      frag.appendChild(blank);
    }

    for (var d = 1; d <= days; d++) {
      var key = ymd(y, m, d);
      var dow = new Date(y, m, d).getDay();
      var holiday = holidays[key];
      var weekend = dow === 0 || dow === 6;
      var outOfRange = key < minKey || key > maxKey;
      var selectable = !weekend && !holiday && !outOfRange;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d;
      btn.dataset.date = key;

      var label = (m + 1) + '월 ' + d + '일 ' + WEEKDAYS[dow] + '요일';
      if (key === todayKey) btn.classList.add('is-today');

      if (selectable) {
        btn.classList.add('is-ok');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', key === state.date ? 'true' : 'false');
        if (key === state.date) btn.classList.add('is-selected');
      } else {
        btn.disabled = true;
        if (holiday) {
          btn.classList.add('is-holiday');
          btn.title = holiday;
          btn.setAttribute('aria-label', label + ', ' + holiday + ' 공휴일, 선택 불가');
        } else {
          btn.classList.add('is-off');
          btn.setAttribute('aria-label', label + ', 선택 불가');
        }
      }
      frag.appendChild(btn);
    }

    el.grid.innerHTML = '';
    el.grid.appendChild(frag);
  }

  el.grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.cal-day.is-ok');
    if (!btn) return;
    selectDate(btn.dataset.date);
  });

  function selectDate(key) {
    state.date = key;
    var parts = key.split('-');
    var dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    el.dateBox.textContent = parts[0] + '년 ' + (+parts[1]) + '월 ' + (+parts[2]) + '일 (' + WEEKDAYS[dt.getDay()] + ')';
    el.dateBox.classList.remove('is-empty');

    el.grid.querySelectorAll('.cal-day.is-ok').forEach(function (b) {
      var on = b.dataset.date === key;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    updateState();
  }

  el.prev.addEventListener('click', function () {
    if (state.viewMonth === 0) { state.viewMonth = 11; state.viewYear--; } else { state.viewMonth--; }
    renderCalendar();
  });
  el.next.addEventListener('click', function () {
    if (state.viewMonth === 11) { state.viewMonth = 0; state.viewYear++; } else { state.viewMonth++; }
    renderCalendar();
  });

  /* ---------- validation ---------- */
  var validators = {
    name: function () {
      return el.name.value.trim() ? '' : '이름을 입력해 주세요.';
    },
    email: function () {
      var v = el.email.value.trim();
      if (!v) return '이메일을 입력해 주세요.';
      if (!EMAIL_RE.test(v)) return '이메일 형식이 올바르지 않습니다. 예: name@example.com';
      return '';
    },
    purpose: function () {
      return el.purpose.value.trim() ? '' : '방문 목적을 입력해 주세요.';
    }
  };

  function showError(field) {
    var msg = touched[field] ? validators[field]() : '';
    var input = el[field];
    $('err-' + field).textContent = msg;
    input.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  ['name', 'email', 'purpose'].forEach(function (field) {
    el[field].addEventListener('blur', function () { touched[field] = true; showError(field); updateState(); });
    el[field].addEventListener('input', function () {
      if (touched[field]) showError(field);
      updateState();
    });
  });

  el.purpose.addEventListener('input', function () {
    el.count.textContent = el.purpose.value.length + ' / 1000';
  });
  el.time.addEventListener('change', updateState);
  el.consent.addEventListener('change', updateState);

  function isFormValid() {
    return !!state.date && !!el.time.value &&
      !validators.name() && !validators.email() && !validators.purpose() &&
      el.consent.checked;
  }

  function updateState() {
    el.submit.disabled = !isFormValid();
  }

  /* ---------- review dialog ---------- */
  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!isFormValid()) {
      ['name', 'email', 'purpose'].forEach(function (f) { touched[f] = true; showError(f); });
      return;
    }
    el.cDate.textContent = el.dateBox.textContent;
    el.cTime.textContent = el.time.value;
    el.cName.textContent = el.name.value.trim();
    el.cEmail.textContent = el.email.value.trim();
    el.cPurpose.textContent = el.purpose.value.trim();
    el.cError.hidden = true;
    el.review.hidden = false;
    el.done.hidden = true;
    el.cSend.disabled = false;
    el.cEdit.disabled = false;
    el.cSend.textContent = '예약하기';
    reservationDone = false;
    el.dialog.showModal();
  });

  el.cEdit.addEventListener('click', function () { el.dialog.close(); });
  el.cClose.addEventListener('click', function () { el.dialog.close(); });

  el.dialog.addEventListener('click', function (e) {
    if (e.target === el.dialog && !el.cSend.disabled) el.dialog.close();
  });
  el.dialog.addEventListener('cancel', function (e) {
    if (el.cSend.disabled) e.preventDefault();
  });
  el.dialog.addEventListener('close', function () {
    if (reservationDone) resetForm();
  });

  el.cSend.addEventListener('click', function () {
    el.cSend.disabled = true;
    el.cEdit.disabled = true;
    el.cSend.textContent = '전송 중…';
    el.cError.hidden = true;

    fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.date,
        time: el.time.value,
        name: el.name.value.trim(),
        email: el.email.value.trim(),
        purpose: el.purpose.value.trim(),
        consent: el.consent.checked,
        website: el.website.value
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(body.error || '예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          return body;
        });
      })
      .then(function () {
        reservationDone = true;
        el.review.hidden = true;
        el.done.hidden = false;
      })
      .catch(function (err) {
        el.cError.textContent = err.message || '예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        el.cError.hidden = false;
        el.cSend.disabled = false;
        el.cEdit.disabled = false;
        el.cSend.textContent = '다시 시도';
      });
  });

  function resetForm() {
    el.form.reset();
    touched = {};
    state.date = '';
    el.dateBox.textContent = '캘린더에서 날짜를 선택하세요';
    el.dateBox.classList.add('is-empty');
    el.count.textContent = '0 / 1000';
    ['name', 'email', 'purpose'].forEach(showError);
    renderCalendar();
    updateState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCalendar();
  updateState();
})();
