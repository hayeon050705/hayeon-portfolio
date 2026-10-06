(function () {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var items = [];
  var filter = 'upcoming';

  function $(id) { return document.getElementById(id); }
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  var now = new Date();
  var todayKey = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function isPast(r) { return r.date < todayKey; }

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
    }) + ' 접수';
  }

  function visibleItems() {
    var list = items.slice();
    if (filter === 'upcoming') {
      return list.filter(function (r) { return !isPast(r); })
        .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    }
    if (filter === 'past') {
      return list.filter(isPast)
        .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    }
    return list.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  }

  function render() {
    $('count-upcoming').textContent = items.filter(function (r) { return !isPast(r); }).length;
    $('count-past').textContent = items.filter(isPast).length;
    $('count-all').textContent = items.length;

    var listEl = $('rsv-list');
    var rows = visibleItems();
    if (!rows.length) {
      var msg = items.length ? '이 목록에 해당하는 예약이 없습니다.' : '아직 접수된 방문 예약이 없습니다.';
      listEl.innerHTML = '<p class="admin-empty">' + msg + '</p>';
      return;
    }

    listEl.innerHTML = rows.map(function (r) {
      var past = isPast(r);
      var badge = past ? '<span class="admin-status-badge past">지난 예약</span>'
                       : '<span class="admin-status-badge pending">대기</span>';
      var long = (r.purpose || '').length > 110 || (r.purpose || '').split('\n').length > 3;
      return '<article class="rsv-card">' +
        '<div class="rsv-when"><strong>' + esc(formatDay(r.date)) + '</strong><span>' + esc(r.time) + '</span></div>' +
        '<div class="rsv-who">' +
          '<div class="rsv-name">' + esc(r.name) + '</div>' +
          '<a class="rsv-email" href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' +
          '<div class="rsv-purpose">' + esc(r.purpose) + '</div>' +
          (long ? '<button type="button" class="rsv-more">더 보기</button>' : '') +
        '</div>' +
        '<div class="rsv-side">' + badge + '<span class="rsv-received">' + esc(formatReceived(r.createdAt)) + '</span></div>' +
      '</article>';
    }).join('');
  }

  $('rsv-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.rsv-more');
    if (!btn) return;
    var purpose = btn.previousElementSibling;
    var open = purpose.classList.toggle('open');
    btn.textContent = open ? '접기' : '더 보기';
  });

  document.querySelectorAll('.rsv-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      filter = tab.dataset.filter;
      document.querySelectorAll('.rsv-tab').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
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
    $('rsv-list').innerHTML = '<p class="admin-empty">불러오는 중…</p>';
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
        $('rsv-list').innerHTML = '<p class="admin-empty">예약 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>';
      });
  }

  $('refresh-btn').addEventListener('click', load);
  $('logout-btn').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST' }).catch(function () {}).then(showAuth);
  });

  load();
})();
