(function () {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var STATUS_LABEL = { pending: '접수', confirmed: '확정', cancelled: '취소' };
  var STATUS_ORDER = ['pending', 'confirmed', 'cancelled'];

  var items = [];
  var filter = 'all';

  function $(id) { return document.getElementById(id); }
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function statusOf(r) { return STATUS_LABEL[r.status] ? r.status : 'pending'; }

  var now = new Date();
  var todayKey = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function formatDay(dateStr) {
    var p = dateStr.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일 (' + WEEKDAYS[d.getDay()] + ')';
  }

  function formatReceived(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  function toast(msg) {
    var t = $('rsv-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function counts() {
    var c = { all: items.length, pending: 0, confirmed: 0, cancelled: 0 };
    items.forEach(function (r) { c[statusOf(r)]++; });
    return c;
  }

  function renderSummary(c) {
    $('rsv-summary').innerHTML =
      '<span>전체 <strong>' + c.all + '건</strong></span><span class="sep">/</span>' +
      '<span>접수 <strong>' + c.pending + '건</strong></span><span class="sep">/</span>' +
      '<span>확정 <strong>' + c.confirmed + '건</strong></span><span class="sep">/</span>' +
      '<span>취소 <strong>' + c.cancelled + '건</strong></span>';
  }

  function render() {
    var c = counts();
    renderSummary(c);
    STATUS_ORDER.concat('all').forEach(function (k) { $('count-' + k).textContent = c[k]; });

    var rows = items
      .filter(function (r) { return filter === 'all' || statusOf(r) === filter; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });

    $('rsv-showing').textContent = filter === 'all'
      ? '전체 예약 ' + rows.length + '건을 방문 일시 순으로 표시 중'
      : STATUS_LABEL[filter] + ' 상태 ' + rows.length + '건만 표시 중';

    var body = $('rsv-body');
    if (!rows.length) {
      var msg = !items.length ? '아직 접수된 방문 예약이 없습니다.'
        : STATUS_LABEL[filter] + ' 상태의 예약이 없습니다.';
      body.innerHTML = '<tr><td colspan="6" class="rsv-empty">' + msg + '</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (r) {
      var st = statusOf(r);
      var past = r.date < todayKey;
      var text = r.purpose || '';
      var long = text.length > 90 || text.split('\n').length > 3;
      var options = STATUS_ORDER.map(function (k) {
        return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + STATUS_LABEL[k] + '</option>';
      }).join('');
      return '<tr class="' + (past ? 'is-past' : '') + '" data-id="' + esc(r.id) + '">' +
        '<td class="rsv-when"><strong>' + esc(formatDay(r.date)) + (past ? '<em class="rsv-past-tag">지난 일정</em>' : '') +
          '</strong><span>' + esc(r.time) + '</span></td>' +
        '<td class="rsv-name">' + esc(r.name) + '</td>' +
        '<td><a class="rsv-email" href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></td>' +
        '<td class="rsv-purpose-cell"><div class="rsv-purpose">' + esc(text) + '</div>' +
          (long ? '<button type="button" class="rsv-more">더 보기</button>' : '') + '</td>' +
        '<td class="rsv-received">' + esc(formatReceived(r.createdAt)) + '</td>' +
        '<td class="rsv-status-cell"><select class="rsv-status s-' + st + '" aria-label="' + esc(r.name) + ' 예약 처리 상태">' + options + '</select></td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- events ---------- */
  $('rsv-body').addEventListener('click', function (e) {
    var btn = e.target.closest('.rsv-more');
    if (!btn) return;
    var purpose = btn.previousElementSibling;
    var open = purpose.classList.toggle('open');
    btn.textContent = open ? '접기' : '더 보기';
  });

  $('rsv-body').addEventListener('change', function (e) {
    var select = e.target.closest('.rsv-status');
    if (!select) return;
    var row = select.closest('tr');
    var rec = items.filter(function (r) { return r.id === row.dataset.id; })[0];
    if (!rec) return;
    var next = select.value;
    var prev = statusOf(rec);
    if (next === prev) return;

    select.disabled = true;
    fetch('/api/admin/reservations/' + encodeURIComponent(rec.id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    })
      .then(function (res) {
        if (res.status === 401) { showAuth(); throw new Error('로그인이 만료되었습니다.'); }
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(body.error || '상태를 변경하지 못했습니다.');
          return body;
        });
      })
      .then(function (updated) {
        rec.status = updated.status;
        toast(rec.name + ' 님 예약을 "' + STATUS_LABEL[updated.status] + '"(으)로 변경했습니다.' +
          (updated.status === 'cancelled' ? ' 해당 시간은 다시 예약할 수 있습니다.' : ''));
        render();
      })
      .catch(function (err) {
        select.value = prev;
        select.disabled = false;
        toast(err.message || '상태를 변경하지 못했습니다.');
      });
  });

  document.querySelectorAll('.rsv-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filter = btn.dataset.status;
      document.querySelectorAll('.rsv-filter').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
  });

  function showAuth() {
    $('auth-view').hidden = false;
    $('rsv-view').hidden = true;
    $('logout-btn').hidden = true;
  }

  function load() {
    $('rsv-body').innerHTML = '<tr><td colspan="6" class="rsv-empty">불러오는 중…</td></tr>';
    return fetch('/api/admin/reservations')
      .then(function (res) {
        if (res.status === 401) { showAuth(); return null; }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        items = Array.isArray(data) ? data : [];
        $('auth-view').hidden = true;
        $('rsv-view').hidden = false;
        $('logout-btn').hidden = false;
        render();
      })
      .catch(function () {
        $('auth-view').hidden = true;
        $('rsv-view').hidden = false;
        $('rsv-summary').textContent = '';
        $('rsv-showing').textContent = '';
        $('rsv-body').innerHTML = '<tr><td colspan="6" class="rsv-empty">예약 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</td></tr>';
      });
  }

  $('refresh-btn').addEventListener('click', load);
  $('logout-btn').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST' }).catch(function () {}).then(showAuth);
  });

  load();
})();
