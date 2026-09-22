/**
 * HA-YEON JEON | Minimal White Portfolio (v4)
 * Content (profile/projects/awards) is fetched from /api/* — served today from
 * local JSON in /backend/data via /backend/lib/store.js, swappable for a real
 * database later without any frontend change.
 */

let CONTACT_EMAIL = 'iris050705@naver.com';

document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initActions();
  initShare();
  await loadPortfolioData();
  initReveal();
  initFilter();
  initMediaModal();
  initCertModal();
});

/* ==========================================================================
   0. Fetch + render content from the backend API
   ========================================================================== */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function loadPortfolioData() {
  try {
    const [profile, projects, awards] = await Promise.all([
      fetch('/api/profile').then(r => { if (!r.ok) throw new Error('profile fetch failed'); return r.json(); }),
      fetch('/api/projects').then(r => { if (!r.ok) throw new Error('projects fetch failed'); return r.json(); }),
      fetch('/api/awards').then(r => { if (!r.ok) throw new Error('awards fetch failed'); return r.json(); })
    ]);
    renderProfile(profile);
    renderProjects(projects);
    renderAwards(awards);
  } catch (err) {
    console.error('Failed to load portfolio content from the API', err);
    showToast('콘텐츠를 불러오지 못했습니다. 새로고침해 주세요.');
  }

  // Separate from the block above: admin-managed entries are supplementary,
  // so a failure here shouldn't be treated as a page-load error.
  try {
    const entries = await fetch('/api/entries').then(r => { if (!r.ok) throw new Error('entries fetch failed'); return r.json(); });
    renderEntries(entries);
  } catch (err) {
    console.error('Failed to load project log entries', err);
  }
}

function renderProfile(profile) {
  if (!profile) return;

  const kickerEl = document.getElementById('hero-kicker');
  if (kickerEl && profile.kicker) kickerEl.textContent = profile.kicker;

  const descEl = document.getElementById('hero-desc');
  if (descEl) descEl.textContent = profile.heroDesc || '';

  const captionEl = document.getElementById('cover-caption');
  if (captionEl && profile.coverCaption) {
    const spans = captionEl.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = profile.coverCaption.left || '';
    if (spans[1]) spans[1].textContent = profile.coverCaption.right || '';
  }

  const quoteEl = document.getElementById('about-quote');
  if (quoteEl) quoteEl.textContent = profile.aboutQuote ? `"${profile.aboutQuote}"` : '';

  const bodyEl = document.getElementById('about-body');
  if (bodyEl) {
    bodyEl.innerHTML = (profile.aboutBody || []).map(p => `<p>${esc(p)}</p>`).join('');
  }

  const factLineEl = document.getElementById('fact-line');
  if (factLineEl) {
    factLineEl.innerHTML = (profile.facts || []).map(f => {
      const value = f.href ? `<a href="${esc(f.href)}">${esc(f.v)}</a>` : esc(f.v);
      return `<span class="item"><span class="k">${esc(f.k)}</span>${value}</span>`;
    }).join('');
  }

  const skillsEl = document.getElementById('skills-line');
  if (skillsEl) {
    skillsEl.innerHTML = (profile.skills || []).map(s => `<span>${esc(s)}</span>`).join('');
  }

  const eduEl = document.getElementById('edu-line');
  if (eduEl) {
    eduEl.innerHTML = (profile.education || []).map(e => {
      const certBtn = e.hasCert ? `<button class="cert-link" id="btn-cert-open">재학증명서 확인 →</button>` : '';
      return `
        <div class="edu-row${e.current ? ' current' : ''}">
          <div>
            <div class="name">${esc(e.name)}</div>
            <div class="sub">${esc(e.sub)}</div>
            ${certBtn}
          </div>
          <span class="period">${esc(e.period)}</span>
        </div>
      `;
    }).join('');
  }

  if (profile.contact) {
    CONTACT_EMAIL = profile.contact.email || CONTACT_EMAIL;

    const emailBtn = document.getElementById('contact-email-card');
    if (emailBtn) emailBtn.textContent = CONTACT_EMAIL;

    const mailLink = document.getElementById('contact-mail-link');
    if (mailLink) mailLink.href = `mailto:${CONTACT_EMAIL}`;

    const hintEl = document.getElementById('contact-hint');
    if (hintEl) hintEl.textContent = profile.contact.hint || '';

    const infoLineEl = document.getElementById('contact-info-line');
    if (infoLineEl) {
      infoLineEl.innerHTML = (profile.contact.infoLine || []).map(s => `<span>${esc(s)}</span>`).join('');
    }
  }
}

function workMetaHTML(p) {
  if (p.badge) {
    return `<span class="badge">${esc(p.badge)}</span><br>${esc(p.metaCategory)} · ${esc(p.metaYear)}`;
  }
  return `${esc(p.metaCategory)}<br>${esc(p.metaYear)}`;
}

function workFigureHTML(p) {
  if (p.type === 'video') {
    return `<video src="${esc(p.src)}" muted loop playsinline preload="metadata"></video>`;
  }
  if (p.type === 'research') {
    return `<i class="fa-solid fa-award"></i>`;
  }
  return `<img src="${esc(p.src)}" alt="${esc(p.alt || p.title)}" loading="lazy">`;
}

function renderProjects(projects) {
  const listEl = document.getElementById('work-list');
  if (!listEl || !Array.isArray(projects)) return;

  listEl.innerHTML = projects.map(p => `
    <article class="work-row reveal" data-category="${esc(p.category)}"
      data-type="${esc(p.type)}" data-src="${esc(p.src)}" data-title="${esc(p.modalTitle || p.title)}" data-meta="${esc(p.modalMeta || '')}">
      <div class="work-figure${p.type === 'research' ? ' research-plate' : ''}">${workFigureHTML(p)}</div>
      <div class="work-caption">
        <div class="work-caption-left">
          <span class="work-idx">${esc(p.idx)}</span>
          <div>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.description)}</p>
            <div class="work-tags">${(p.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="work-meta">${workMetaHTML(p)}</div>
      </div>
    </article>
  `).join('');
}

function renderAwards(awards) {
  if (!awards) return;

  const statEl = document.getElementById('stat-line');
  if (statEl && Array.isArray(awards.stats)) {
    statEl.innerHTML = awards.stats.map((s, i) => {
      const sep = i < awards.stats.length - 1 ? '<span class="sep">·</span>' : '';
      return `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>${sep}`;
    }).join('');
  }

  const listEl = document.getElementById('award-list');
  if (listEl && Array.isArray(awards.items)) {
    listEl.innerHTML = awards.items.map(a => `
      <div class="award-row">
        <span class="award-year">${esc(a.year)}</span>
        <div>
          <div class="award-title">${esc(a.title)}</div>
          <div class="award-org">${esc(a.org)}</div>
          ${a.desc ? `<div class="award-desc">${esc(a.desc)}</div>` : ''}
        </div>
        <span class="award-badge">${esc(a.badge || '')}</span>
      </div>
    `).join('');
  }
}

function renderEntries(entries) {
  const section = document.getElementById('entries');
  const listEl = document.getElementById('entry-list');
  if (!section || !listEl) return;

  if (!Array.isArray(entries) || !entries.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  listEl.innerHTML = entries.map(en => `
    <div class="entry-row">
      <div class="entry-head">
        <span class="entry-title">${esc(en.title)}</span>
        <span class="entry-date">${esc(en.date)}</span>
      </div>
      <div class="entry-meta">${esc(en.role)} · ${esc(en.teamSize)}</div>
      <div class="entry-desc">${esc(en.description)}</div>
      ${en.notes ? `<div class="entry-notes">${esc(en.notes)}</div>` : ''}
    </div>
  `).join('');
}

/* ==========================================================================
   1. Nav — scroll style, scrollspy, mobile toggle
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
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === current));
  });

  toggle?.addEventListener('click', () => links.classList.toggle('open'));
  navLinks.forEach(link => link.addEventListener('click', () => links.classList.remove('open')));
}

/* ==========================================================================
   2. Scroll Reveal
   ========================================================================== */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  items.forEach(el => observer.observe(el));
}

/* ==========================================================================
   3. Work Filter
   ========================================================================== */
function initFilter() {
  const btns = document.querySelectorAll('.work-filter button');
  const rows = document.querySelectorAll('.work-row');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.filter;

      rows.forEach(row => {
        const match = val === 'all' || row.dataset.category === val;
        row.style.display = match ? '' : 'none';
      });
    });
  });
}

/* ==========================================================================
   4. Media Lightbox
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
        <div class="wmodal-research">
          <span class="r-tag">Grand Prize / 춘계학술포스터 대상</span>
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

  document.querySelectorAll('.work-row').forEach(row => {
    row.addEventListener('click', () => {
      open(row.dataset.type, row.dataset.src, row.dataset.title, row.dataset.meta);
    });
  });

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
}

/* ==========================================================================
   5. Certificate Modal
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

  document.querySelectorAll('#btn-cert-open, #btn-cert-contact').forEach(btn => btn.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
}

/* ==========================================================================
   6. Copy / Print Actions
   ========================================================================== */
function initActions() {
  document.getElementById('btn-print-action')?.addEventListener('click', () => window.print());

  const emailCard = document.getElementById('contact-email-card');
  emailCard?.addEventListener('click', () => {
    copyToClipboard(CONTACT_EMAIL, `이메일 주소(${CONTACT_EMAIL})`);
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
   7. Share Menu — copy link / structured PDF export
   ========================================================================== */
function initShare() {
  const wrap = document.getElementById('share-wrap');
  const btn = document.getElementById('share-btn');
  const menu = document.getElementById('share-menu');
  const copyBtn = document.getElementById('share-copy-link');
  const pdfBtn = document.getElementById('share-pdf');
  if (!wrap || !btn || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closeMenu();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  copyBtn?.addEventListener('click', () => {
    closeMenu();
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      showToast('링크가 복사되었습니다.');
    }).catch(() => {
      showToast('링크가 복사되었습니다.');
    });
  });

  pdfBtn?.addEventListener('click', async () => {
    closeMenu();
    if (pdfBtn.disabled) return;
    const originalHTML = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중…';
    try {
      await buildPortfolioPdf();
      showToast('PDF가 다운로드되었습니다.');
    } catch (err) {
      console.error('PDF export failed', err);
      showToast('PDF 생성에 실패했습니다.');
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = originalHTML;
    }
  });
}

/* --- collect the page's own content into plain structured data --- */
function extractPortfolioData() {
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const metaText = el => {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach(br => br.replaceWith(' — '));
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };
  const joinSpans = (selector, sep) => [...document.querySelectorAll(selector)].map(s => text(s)).join(sep);

  const work = [...document.querySelectorAll('.work-row')].map(row => {
    const tags = [...row.querySelectorAll('.work-tags span')].map(s => text(s));
    const meta = metaText(row.querySelector('.work-meta'));
    return {
      idx: text(row.querySelector('.work-idx')),
      title: text(row.querySelector('.work-caption h3')),
      desc: text(row.querySelector('.work-caption-left > div > p')),
      meta,
      tags
    };
  });

  const awards = [...document.querySelectorAll('.award-row')].map(row => ({
    year: text(row.querySelector('.award-year')),
    title: text(row.querySelector('.award-title')),
    org: text(row.querySelector('.award-org')),
    desc: text(row.querySelector('.award-desc')),
    badge: text(row.querySelector('.award-badge'))
  }));

  const statLine = joinSpans('.stat-line > span:not(.sep)', '   ·   ');

  const facts = [...document.querySelectorAll('.fact-line .item')].map(item => {
    const k = text(item.querySelector('.k'));
    const full = text(item);
    return { k, v: full.replace(k, '').trim() };
  });

  const edu = [...document.querySelectorAll('.edu-row')].map(row => ({
    name: text(row.querySelector('.name')),
    sub: text(row.querySelector('.sub')),
    period: text(row.querySelector('.period'))
  }));

  return {
    kicker: text(document.querySelector('.hero .kicker')),
    heroDesc: text(document.querySelector('.hero-desc')),
    work,
    statLine,
    awards,
    quote: text(document.querySelector('.about-quote')),
    aboutBody: [...document.querySelectorAll('.about-body p')].map(p => text(p)),
    facts,
    skills: joinSpans('.skills-line span', '  ·  '),
    edu,
    contactLine: joinSpans('.contact-info-line span', '   —   ')
  };
}

/* --- fetch a Hangul-capable TTF at click-time and register it with jsPDF
   (jsPDF's built-in fonts are Latin-only, so Korean text needs an embedded font) --- */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadKoreanFont(doc) {
  try {
    const base = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/';
    const [regularBuf, boldBuf] = await Promise.all([
      fetch(base + 'Pretendard-Regular.ttf').then(r => { if (!r.ok) throw new Error('font fetch failed'); return r.arrayBuffer(); }),
      fetch(base + 'Pretendard-Bold.ttf').then(r => { if (!r.ok) throw new Error('font fetch failed'); return r.arrayBuffer(); })
    ]);
    doc.addFileToVFS('Pretendard-Regular.ttf', arrayBufferToBase64(regularBuf));
    doc.addFont('Pretendard-Regular.ttf', 'Pretendard', 'normal');
    doc.addFileToVFS('Pretendard-Bold.ttf', arrayBufferToBase64(boldBuf));
    doc.addFont('Pretendard-Bold.ttf', 'Pretendard', 'bold');
    return true;
  } catch (err) {
    console.warn('Korean font load failed, Korean text will fall back to Latin-only font', err);
    return false;
  }
}

/* --- render the collected data into a clean, text-based PDF (not a page screenshot) --- */
async function buildPortfolioPdf() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('jsPDF not loaded');

  const data = extractPortfolioData();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const koreanReady = await loadKoreanFont(doc);
  const BODY_FONT = koreanReady ? 'Pretendard' : 'helvetica';

  const INK = [26, 26, 23];
  const SOFT = [99, 98, 90];
  const FAINT = [150, 148, 138];
  const SAGE = [74, 107, 82];
  const LINE = [230, 228, 219];

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 54;
  const marginTop = 60;
  const marginBottom = 56;
  const contentW = pageW - marginX * 2;
  let y = marginTop;

  function ensureSpace(h) {
    if (y + h > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function setColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

  function kicker(str) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setColor(SAGE);
    doc.text(str.toUpperCase(), marginX, y);
    y += 20;
  }

  function heading(str) {
    ensureSpace(28);
    doc.setFont('times', 'italic');
    doc.setFontSize(19);
    setColor(INK);
    doc.text(str, marginX, y);
    y += 10;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(1);
    doc.line(marginX, y, pageW - marginX, y);
    y += 24;
  }

  function paragraph(str, opts = {}) {
    if (!str) return;
    const size = opts.size || 10;
    const font = opts.font || BODY_FONT;
    // the embedded Korean font only has normal/bold — 'italic' has no glyph set to fall back to
    const style = opts.style === 'italic' && font === BODY_FONT && koreanReady ? 'normal' : (opts.style || 'normal');
    const color = opts.color || SOFT;
    const lineGap = opts.lineGap || size * 1.5;
    doc.setFont(font, style);
    doc.setFontSize(size);
    setColor(color);
    const lines = doc.splitTextToSize(str, contentW);
    lines.forEach(line => {
      ensureSpace(lineGap);
      doc.text(line, marginX, y);
      y += lineGap;
    });
  }

  function divider(gapBefore = 14, gapAfter = 14) {
    y += gapBefore;
    ensureSpace(1 + gapAfter);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageW - marginX, y);
    y += gapAfter;
  }

  /* ---- Cover ---- */
  kicker(data.kicker || 'GREEN SMART CITY · LANDSCAPE ARCHITECTURE');
  ensureSpace(40);
  doc.setFont('times', 'italic');
  doc.setFontSize(30);
  setColor(INK);
  doc.text('Ha-yeon Jeon', marginX, y);
  y += 18;
  doc.setFont(BODY_FONT, 'normal');
  doc.setFontSize(10.5);
  setColor(SOFT);
  doc.text('전하연 · Portfolio Digest', marginX, y);
  y += 26;
  paragraph(data.heroDesc, { size: 10.5, lineGap: 16 });
  divider(20, 26);

  /* ---- Work ---- */
  kicker('Selected Work');
  heading('Projects & Research');
  data.work.forEach((p, i) => {
    ensureSpace(24);
    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(12);
    setColor(INK);
    const idxLabel = p.idx ? `${p.idx}  ` : `${String(i + 1).padStart(2, '0')}  `;
    doc.text(idxLabel + p.title, marginX, y);
    y += 15;
    if (p.meta) {
      doc.setFont(BODY_FONT, 'normal');
      doc.setFontSize(9);
      setColor(FAINT);
      doc.text(p.meta, marginX, y);
      y += 14;
    }
    paragraph(p.desc, { size: 10, lineGap: 14.5 });
    if (p.tags.length) {
      ensureSpace(14);
      doc.setFont(BODY_FONT, 'normal');
      doc.setFontSize(8.5);
      setColor(SAGE);
      doc.text(p.tags.join('   '), marginX, y);
      y += 14;
    }
    if (i < data.work.length - 1) divider(10, 16);
  });
  divider(20, 26);

  /* ---- Awards ---- */
  kicker('Recognition');
  heading('Awards & Honors');
  if (data.statLine) {
    paragraph(data.statLine, { size: 10, style: 'normal', font: BODY_FONT, color: INK, lineGap: 16 });
    y += 6;
  }
  data.awards.forEach((a, i) => {
    ensureSpace(20);
    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(10.5);
    setColor(INK);
    const yearLabel = a.year ? `${a.year} — ` : '';
    doc.text(yearLabel + a.title, marginX, y);
    if (a.badge) {
      doc.setFont(BODY_FONT, 'bold');
      doc.setFontSize(8);
      setColor(SAGE);
      doc.text(a.badge.toUpperCase(), pageW - marginX - doc.getTextWidth(a.badge.toUpperCase()), y);
    }
    y += 14;
    if (a.org) {
      doc.setFont(BODY_FONT, 'normal');
      doc.setFontSize(9.5);
      setColor(SOFT);
      doc.text(a.org, marginX, y);
      y += 13;
    }
    paragraph(a.desc, { size: 9.5, lineGap: 13.5, color: FAINT });
    if (i < data.awards.length - 1) y += 8;
  });
  divider(20, 26);

  /* ---- About ---- */
  kicker('Profile');
  heading('About');
  if (data.quote) {
    paragraph(`"${data.quote.replace(/^"|"$/g, '')}"`, { size: 11.5, style: 'normal', font: BODY_FONT, color: INK, lineGap: 17 });
    y += 8;
  }
  data.aboutBody.forEach(p => { paragraph(p, { size: 10, lineGap: 15 }); y += 6; });

  if (data.facts.length) {
    y += 4;
    data.facts.forEach(f => {
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(FAINT);
      doc.text(f.k.toUpperCase() + '  ', marginX, y);
      const kW = doc.getTextWidth(f.k.toUpperCase() + '   ');
      doc.setFont(BODY_FONT, 'normal');
      doc.setFontSize(10);
      setColor(INK);
      doc.text(f.v, marginX + kW, y);
      y += 15;
    });
  }
  if (data.skills) {
    y += 4;
    paragraph(data.skills, { size: 9, color: FAINT, lineGap: 13.5 });
  }
  if (data.edu.length) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(INK);
    ensureSpace(14);
    doc.text('EDUCATION', marginX, y);
    y += 16;
    data.edu.forEach(e => {
      ensureSpace(16);
      doc.setFont(BODY_FONT, 'bold');
      doc.setFontSize(9.5);
      setColor(INK);
      doc.text(e.name, marginX, y);
      doc.setFont(BODY_FONT, 'normal');
      doc.setFontSize(8.5);
      setColor(FAINT);
      doc.text(e.period, pageW - marginX - doc.getTextWidth(e.period), y);
      y += 12;
      if (e.sub) {
        doc.setFont(BODY_FONT, 'normal');
        doc.setFontSize(8.5);
        setColor(SOFT);
        doc.text(e.sub, marginX, y);
        y += 14;
      } else {
        y += 4;
      }
    });
  }
  divider(20, 26);

  /* ---- Contact ---- */
  kicker('Get in touch');
  heading('Contact');
  doc.setFont('times', 'italic');
  doc.setFontSize(15);
  setColor(SAGE);
  ensureSpace(22);
  doc.text(CONTACT_EMAIL, marginX, y);
  y += 20;
  paragraph(data.contactLine, { size: 9.5, color: SOFT, lineGap: 14 });

  /* ---- Footer on every page ---- */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.75);
    doc.line(marginX, pageH - 40, pageW - marginX, pageH - 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(FAINT);
    doc.text('Ha-yeon Jeon · Green Smart City & Landscape Architecture', marginX, pageH - 26);
    const pageLabel = `${i} / ${pageCount}`;
    doc.text(pageLabel, pageW - marginX - doc.getTextWidth(pageLabel), pageH - 26);
  }

  doc.save('Ha-yeon_Jeon_Portfolio.pdf');
}
