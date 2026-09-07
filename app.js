/**
 * HA-YEON JEON | Landscape Architecture & Green Smart City
 * Minimalist Studio Portfolio JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initProjectFilter();
  initMediaModal();
  initCertificateModal();
  initActions();
  initCoverParticles();
});

/* ==========================================================================
   1. Left Sidebar Navigation & ScrollSpy
   ========================================================================== */
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.cover-hero-section, .content-section');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');

  // Smooth click scroll
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        window.scrollTo({
          top: targetSection.offsetTop - 30,
          behavior: 'smooth'
        });
      }

      // Close mobile drawer if open
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  });

  // ScrollSpy
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 150;

    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop) {
        current = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === current) {
        link.classList.add('active');
      }
    });
  });

  // Mobile menu toggle
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

/* ==========================================================================
   2. Project Filtering
   ========================================================================== */
function initProjectFilter() {
  const filterBtns = document.querySelectorAll('.filter-item');
  const workItems = document.querySelectorAll('.work-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      workItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filterVal === 'all' || filterVal === cat) {
          item.style.display = 'flex';
          setTimeout(() => {
            item.style.opacity = '1';
          }, 40);
        } else {
          item.style.opacity = '0';
          setTimeout(() => {
            item.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

/* ==========================================================================
   3. Architectural Media Lightbox Modal
   ========================================================================== */
function initMediaModal() {
  const modal = document.getElementById('media-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalClose = document.getElementById('modal-close-btn');
  const modalMeta = document.getElementById('modal-meta');
  const modalTitle = document.getElementById('modal-title');
  const modalArea = document.getElementById('modal-content-area');

  if (!modal) return;

  function openModal(type, src, title, meta) {
    modalMeta.textContent = meta || 'Project Documentation';
    modalTitle.textContent = title || 'Work Preview';
    modalArea.innerHTML = '';

    if (type === 'image') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = title;
      modalArea.appendChild(img);
    } else if (type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      modalArea.appendChild(video);
    } else if (type === 'research') {
      modalArea.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 40px 20px;">
          <span style="font-size: 0.75rem; letter-spacing: 0.12em; color: #8C6D37; font-weight: 600; text-transform: uppercase;">Grand Prize / 춘계학술포스터 대상</span>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin: 12px 0 8px; color: #121212;">2026 인간환경학회 춘계학술포스터 대상 연구</h3>
          <p style="font-size: 0.88rem; color: #666; margin-bottom: 24px;">사단법인 한국인간환경학회 (Korean Society for People, Plants and Environment)</p>
          <p style="font-size: 0.92rem; line-height: 1.8; color: #333; text-align: left; background: #fff; padding: 24px; border: 1px solid #E8E7E3;">
            인간과 환경의 상호작용 및 공간 쾌적도 증진을 주제로 한 학술 연구로, 녹지 접근성과 공간 미기후 데이터가 이용자의 심리적 안정에 미치는 영향을 정량 분석하여 학술대회 최우수 대상을 수상하였습니다.
          </p>
        </div>
      `;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalArea.innerHTML = '';
  }

  document.querySelectorAll('.work-media-container').forEach(container => {
    container.addEventListener('click', () => {
      const type = container.getAttribute('data-type');
      const src = container.getAttribute('data-src');
      const title = container.getAttribute('data-title');
      const meta = container.getAttribute('data-meta');
      openModal(type, src, title, meta);
    });
  });

  modalClose?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

/* ==========================================================================
   4. Certificate Verification Modal
   ========================================================================== */
function initCertificateModal() {
  const certModal = document.getElementById('cert-modal');
  const certBackdrop = document.getElementById('cert-backdrop');
  const certClose = document.getElementById('cert-close-btn');

  if (!certModal) return;

  function openCert() {
    certModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCert() {
    certModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('#btn-cert-open, #btn-cert-contact').forEach(btn => {
    btn.addEventListener('click', openCert);
  });

  certClose?.addEventListener('click', closeCert);
  certBackdrop?.addEventListener('click', closeCert);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal.classList.contains('active')) {
      closeCert();
    }
  });
}

/* ==========================================================================
   5. Copy & Print Actions
   ========================================================================== */
function initActions() {
  // Print PDF
  const printBtn = document.getElementById('btn-print-action');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Copy Email from Contact Card
  const emailCard = document.getElementById('contact-email-card');
  if (emailCard) {
    emailCard.addEventListener('click', () => {
      copyToClipboard('iris050705@naver.com', '이메일 주소(iris050705@naver.com)');
    });
  }
}

function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showMinimalToast(`${label || text}가 복사되었습니다.`);
  }).catch(() => {
    showMinimalToast(`${label || text}가 복사되었습니다.`);
  });
}

function showMinimalToast(msg) {
  const toast = document.getElementById('minimal-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

/* ==========================================================================
   6. Cover Hero Botanical Particle & Light Leak Animation
   ========================================================================== */
function initCoverParticles() {
  const canvas = document.getElementById('cover-particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width, height;
  let particles = [];
  const particleCount = 28;

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    width = canvas.width = parent.offsetWidth;
    height = canvas.height = parent.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class BotanicalParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * (width || 800);
      this.y = initial ? Math.random() * (height || 500) : (height || 500) + 10;
      this.radius = Math.random() * 2.2 + 0.8;
      this.speedY = Math.random() * 0.45 + 0.2;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.fadeSpeed = Math.random() * 0.005 + 0.003;
      this.isGlowing = Math.random() > 0.4;
      this.color = this.isGlowing ? '200, 240, 220' : '62, 180, 137';
      this.waveAngle = Math.random() * Math.PI * 2;
      this.waveSpeed = Math.random() * 0.02 + 0.01;
    }

    update() {
      this.y -= this.speedY;
      this.waveAngle += this.waveSpeed;
      this.x += Math.sin(this.waveAngle) * 0.4 + this.speedX;

      if (this.y < -10 || this.x < -20 || this.x > width + 20) {
        this.reset(false);
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.shadowBlur = this.isGlowing ? 10 : 4;
      ctx.shadowColor = `rgba(${this.color}, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new BotanicalParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();
}
