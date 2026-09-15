/**
 * HA-YEON JEON | Green Smart City Portfolio
 * Dark data-grid design — interaction layer
 */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFilter();
  initMediaModal();
  initCertModal();
  initActions();
  initStatCounters();
});

/* ==========================================================================
   1. Top Nav — scroll style, scrollspy, mobile toggle
   ========================================================================== */
function initNav() {
  const topnav = document.getElementById('topnav');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    topnav.classList.toggle('scrolled', window.scrollY > 30);

    let current = '';
    const scrollPos = window.scrollY + 160;
    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === current);
    });
  });

  toggle?.addEventListener('click', () => links.classList.toggle('open'));
  navLinks.forEach(link => link.addEventListener('click', () => links.classList.remove('open')));
}

/* ==========================================================================
   2. Work Filter
   ========================================================================== */
function initFilter() {
  const pills = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.work-card');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.dataset.filter;

      cards.forEach(card => {
        const match = val === 'all' || card.dataset.category === val;
        card.style.display = match ? '' : 'none';
      });
    });
  });
}

/* ==========================================================================
   3. Media Lightbox
   ========================================================================== */
function initMediaModal() {
  const modal = document.getElementById('media-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close-btn');
  const metaEl = document.getElementById('modal-meta');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-content-area');
  if (!modal) return;

  function open(type, src, title, meta) {
    metaEl.textContent = meta || '';
    titleEl.textContent = title || '';
    bodyEl.innerHTML = '';

    if (type === 'image') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = title;
      bodyEl.appendChild(img);
    } else if (type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      bodyEl.appendChild(video);
    } else if (type === 'research') {
      bodyEl.innerHTML = `
        <div class="modal-research">
          <span class="r-tag">GRAND PRIZE / 춘계학술포스터 대상</span>
          <h3>2026 인간환경학회 춘계학술포스터 대상 연구</h3>
          <p class="r-org">사단법인 한국인간환경학회 (Korean Society for People, Plants and Environment)</p>
          <p>인간과 환경의 상호작용 및 공간 쾌적도 증진을 주제로 한 학술 연구로, 녹지 접근성과 공간 미기후 데이터가 이용자의 심리적 안정에 미치는 영향을 정량 분석하여 학술대회 최우수 대상을 수상하였습니다.</p>
        </div>
      `;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    bodyEl.innerHTML = '';
  }

  document.querySelectorAll('.work-card').forEach(card => {
    card.addEventListener('click', () => {
      open(card.dataset.type, card.dataset.src, card.dataset.title, card.dataset.meta);
    });
  });

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
}

/* ==========================================================================
   4. Certificate Modal
   ========================================================================== */
function initCertModal() {
  const modal = document.getElementById('cert-modal');
  const backdrop = document.getElementById('cert-backdrop');
  const closeBtn = document.getElementById('cert-close-btn');
  if (!modal) return;

  function open() {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('#btn-cert-open, #btn-cert-contact').forEach(btn => {
    btn.addEventListener('click', open);
  });
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
}

/* ==========================================================================
   5. Copy / Print Actions
   ========================================================================== */
function initActions() {
  document.getElementById('btn-print-action')?.addEventListener('click', () => window.print());

  const emailCard = document.getElementById('contact-email-card');
  emailCard?.addEventListener('click', () => {
    copyToClipboard('iris050705@naver.com', '이메일 주소(iris050705@naver.com)');
  });
}

function copyToClipboard(text, label) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast(`${label || text}가 복사되었습니다.`);
  }).catch(() => {
    showToast(`${label || text}가 복사되었습니다.`);
  });
}

function showToast(msg) {
  const toast = document.getElementById('minimal-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ==========================================================================
   6. Stat Counter Animation
   ========================================================================== */
function initStatCounters() {
  const nums = document.querySelectorAll('.stat-num[data-count]');
  if (!nums.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  nums.forEach(el => observer.observe(el));
}

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}
