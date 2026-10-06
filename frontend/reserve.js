(function () {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var MAX_DAYS_AHEAD = 180;
  var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  var HOLIDAY_API = 'https://date.nager.at/api/v3/PublicHolidays/';
  var FORMSPREE_URL = 'https://formspree.io/f/xrpebbql';
  var DEFAULT_ERROR = '예약을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.';

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
    dateBox: $('date-box'), time: $('time-select'), timeNote: $('time-note'),
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

  /* ---------- time slots: 13:00 ~ 18:00, 30 min ---------- */
  var TIME_SLOTS = [];
  for (var hh = 13; hh <= 18; hh++) {
    [0, 30].forEach(function (mm) {
      if (hh === 18 && mm === 30) return;
      TIME_SLOTS.push(pad(hh) + ':' + pad(mm));
    });
  }

  var booked = {};
  var availabilityOk = true;

  function bookedTimes(dateKey) { return booked[dateKey] || []; }
  function isFull(dateKey) { return bookedTimes(dateKey).length >= TIME_SLOTS.length; }

  function loadAvailability(y, m) {
    var from = ymd(y, m, 1);
    var to = ymd(y, m, new Date(y, m + 1, 0).getDate());
    return fetch('/api/availability?from=' + from + '&to=' + to, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        Object.keys(booked).forEach(function (k) { if (k >= from && k <= to) delete booked[k]; });
        Object.keys(data.booked || {}).forEach(function (k) { booked[k] = data.booked[k]; });
        availabilityOk = true;
      })
      .catch(function () { availabilityOk = false; });
  }

  function renderTimeOptions() {
    var taken = state.date ? bookedTimes(state.date) : [];
    var current = el.time.value;
    el.time.innerHTML = '<option value="">시간을 선택하세요</option>';
    TIME_SLOTS.forEach(function (t) {
      var isTaken = taken.indexOf(t) !== -1;
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = isTaken ? t + ' · 완료' : t;
      opt.disabled = isTaken;
      el.time.appendChild(opt);
    });
    el.time.value = current && taken.indexOf(current) === -1 ? current : '';

    var note = '';
    if (!availabilityOk) note = '예약 현황을 불러오지 못했습니다. 이미 예약된 시간은 접수할 때 안내됩니다.';
    else if (state.date && isFull(state.date)) note = '이 날짜는 예약이 모두 마감되었습니다.';
    else if (taken.length) note = '"완료"로 표시된 시간은 이미 예약되어 선택할 수 없습니다.';
    el.timeNote.textContent = note;
    el.timeNote.hidden = !note;
    updateState();
  }

  function clearDate() {
    state.date = '';
    el.dateBox.textContent = '캘린더에서 날짜를 선택하세요';
    el.dateBox.classList.add('is-empty');
    renderTimeOptions();
  }

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

    Promise.all([loadHolidays(y), loadAvailability(y, m)]).then(function (res) {
      if (token !== renderToken) return;
      var h = res[0];
      el.note.hidden = h.ok;
      if (state.date && isFull(state.date)) clearDate();
      else if (state.date) renderTimeOptions();
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
      var full = isFull(key);
      var selectable = !weekend && !holiday && !outOfRange && !full;

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
        } else if (full && !weekend && !outOfRange) {
          btn.classList.add('is-full');
          btn.title = '예약 마감';
          btn.setAttribute('aria-label', label + ', 예약 마감, 선택 불가');
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
    renderTimeOptions();

    // Re-check right now so a slot taken moments ago shows as "완료".
    loadAvailability(+parts[0], +parts[1] - 1).then(function () {
      if (state.date !== key) return;
      if (isFull(key)) { clearDate(); renderCalendar(); return; }
      renderTimeOptions();
    });
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
    el.cSend.hidden = false;
    el.cSend.disabled = false;
    el.cEdit.disabled = false;
    el.cSend.textContent = '예약하기';
    reservationDone = false;
    el.dialog.showModal();
  });

  el.cEdit.addEventListener('click', function () { el.dialog.close(); });
  el.cClose.addEventListener('click', function () {
    el.dialog.close();
    if (reservationDone) resetForm();
  });

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

    var reservation = {
      date: state.date,
      time: el.time.value,
      name: el.name.value.trim(),
      email: el.email.value.trim(),
      purpose: el.purpose.value.trim(),
      consent: el.consent.checked,
      website: el.website.value
    };

    // The server save is the source of truth (it reserves the slot atomically). Mail goes out only
    // after it succeeds, so a rejected/duplicate reservation never produces a notification mail.
    saveReservation(reservation)
      .then(function () {
        return mailReservation(reservation).catch(function (e) { console.warn(e.message); });
      })
      .then(function () {
        reservationDone = true;
        el.review.hidden = true;
        el.done.hidden = false;
      })
      .catch(function (err) {
        el.cError.textContent = err.userMessage || DEFAULT_ERROR;
        el.cError.hidden = false;
        el.cEdit.disabled = false;
        if (err.status === 409) {
          // Someone else just took this time: refresh availability, drop the stale choice, and send the user back to edit.
          el.cSend.hidden = true;
          loadAvailability(+state.date.slice(0, 4), +state.date.slice(5, 7) - 1).then(function () {
            if (isFull(state.date)) { clearDate(); renderCalendar(); } else renderTimeOptions();
          });
        } else {
          el.cSend.disabled = false;
          el.cSend.textContent = '다시 시도';
        }
      });
  });

  function saveReservation(data) {
    return fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var err = new Error('save failed: HTTP ' + res.status);
          err.status = res.status;
          err.userMessage = body.error;
          throw err;
        }
        return body;
      });
    });
  }

  function mailReservation(data) {
    return fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: '[방문 예약] ' + data.name + ' · ' + el.dateBox.textContent + ' ' + data.time,
        email: data.email,
        '이름': data.name,
        '방문 날짜': el.dateBox.textContent,
        '희망 시간': data.time,
        '방문 목적': data.purpose,
        _gotcha: data.website
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('formspree failed: HTTP ' + res.status);
    });
  }

  function resetForm() {
    reservationDone = false;
    el.form.reset();
    touched = {};
    el.count.textContent = '0 / 1000';
    ['name', 'email', 'purpose'].forEach(showError);
    clearDate();
    renderCalendar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderTimeOptions();
  renderCalendar();
})();
