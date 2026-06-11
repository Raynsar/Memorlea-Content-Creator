/**
 * main.js — Memorléa Landing Page
 * Handles: loading · navbar · hero carousel · stats counter
 *          portfolio preview · testimonials · FAQ preview
 */

// ─── Loading Screen ───────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hidden'), 1200);
});

// ─── Navbar ───────────────────────────────────────────────────────────────────

const navbar = document.getElementById('navbar');

function updateNavbar() {
  const hero = document.getElementById('hero');
  const threshold = hero ? hero.getBoundingClientRect().bottom <= 80 : window.scrollY > 60;
  navbar.classList.toggle('scrolled', threshold);
}

window.addEventListener('scroll', updateNavbar);
updateNavbar();

function toggleMenu() {
  document.getElementById('navbar-links')?.classList.toggle('open');
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

const slides       = document.querySelectorAll('.hero-slide');
const dotsContainer = document.getElementById('hero-dots');
let currentSlide   = 0;

slides.forEach((_, i) => {
  const dot = document.createElement('div');
  dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer?.appendChild(dot);
});

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dotsContainer?.children[currentSlide]?.classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dotsContainer?.children[currentSlide]?.classList.add('active');
}

setInterval(() => goToSlide(currentSlide + 1), 5000);



// ─── Scroll Reveal ────────────────────────────────────────────────────────────

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

function observeReveal() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ─── Stats Counter ────────────────────────────────────────────────────────────

function animateCounter(el, target) {
  let start;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / 1800, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

async function loadStats() {
  let data = { clients: 6, vendors: 5, cities: 8, crew: 3 };

  try {
    const res = await db.from('stats').select('*').single();
    if (!res.error && res.data) data = res.data;
  } catch (_) {}

  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  document.querySelectorAll('.counter').forEach(el => {
    el.dataset.target = data[el.dataset.key] || 0;
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.counter').forEach(el => {
          animateCounter(el, parseInt(el.dataset.target));
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  observer.observe(statsSection);
}

// ─── Portfolio Preview ────────────────────────────────────────────────────────

const PORTFOLIO_DATA = [
  { name: 'Tiesa & Neo',    img: 'assets/images/hero4.jpg' },
  { name: 'Chika & Bayu',   img: 'assets/images/hero5.jpg' },
  { name: 'Nadia & Rigel',  img: 'assets/images/hero3.jpg' },
  { name: 'Ruth & Christ',  img: 'assets/images/hero4.jpg' },
  { name: 'Arli & Alingga', img: 'assets/images/hero1.jpg' },
  { name: 'Nada & Subhan',  img: 'assets/images/hero2.jpg' },
];

function renderPortfolioPreview() {
  const grid = document.getElementById('portfolio-preview');
  if (!grid) return;

  grid.innerHTML = PORTFOLIO_DATA.map(p => `
    <div class="portfolio-card reveal">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="portfolio-card-overlay">
        <span class="portfolio-card-name">${p.name}</span>
      </div>
    </div>
  `).join('');

  observeReveal();
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { text: 'Memorléa luar biasa! Kontennya langsung tayang pas hari H, semua tamu takjub lihat story Instagram kami update real-time. Hasilnya candid tapi tetap indah.', name: 'Tiesa & Neo',    event: 'Akad & Resepsi · Jakarta' },
  { text: 'Pelayanannya sangat profesional dan ramah. Tim Memorléa paham betul cara mengabadikan momen paling natural tanpa bikin kita kaku di depan kamera.',            name: 'Nadia & Rigel',  event: 'Pemberkatan · Jakarta' },
  { text: 'Sudah pakai Memorléa 2x, untuk siraman dan akad. Hasilnya selalu memuaskan! File raw-nya juga cepat dikirim.',                                                  name: 'Ruth & Christ',  event: 'Akad Adat Batak · Jakarta' },
  { text: 'Worth it banget! Banyak momen behind the scenes yang terlewat kalau tidak ada WCC. Berkat Memorléa, semua keabadikan dengan cantik.',                           name: 'Arli & Alingga', event: 'Resepsi Adat Sunda · Bandung' },
  { text: 'Instagram takeover-nya berjalan lancar, kami tidak perlu khawatir soal keamanan akun. Tim Memorléa sangat bisa dipercaya.',                                     name: 'Chika & Bayu',   event: 'Akad & Resepsi · Cilacap' },
];

let testimonialCurrent = 0;

function renderTestimonials() {
  const inner = document.getElementById('testimonials-inner');
  const nav   = document.getElementById('testimonial-nav');
  if (!inner) return;

  inner.innerHTML = TESTIMONIALS.map(t => `
    <div class="testimonial-card">
      <p class="testimonial-text">${t.text}</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${t.name.charAt(0)}</div>
        <div>
          <p class="testimonial-name">${t.name}</p>
          <p class="testimonial-event">${t.event}</p>
        </div>
      </div>
    </div>
  `).join('');

  if (nav) {
    nav.innerHTML = TESTIMONIALS.map((_, i) =>
      `<div class="testimonial-dot${i === 0 ? ' active' : ''}" onclick="goTestimonial(${i})"></div>`
    ).join('');
  }
}

function goTestimonial(n) {
  testimonialCurrent = n;
  const inner  = document.getElementById('testimonials-inner');
  const isMobile = window.innerWidth <= 768;
  const perView  = isMobile ? 1 : 3;
  const cardW    = (inner.children[0]?.offsetWidth || 0) + 32;
  const shift    = Math.min(n, Math.max(0, TESTIMONIALS.length - perView));
  inner.style.transform = `translateX(-${shift * cardW}px)`;
  document.querySelectorAll('.testimonial-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

setInterval(() => goTestimonial((testimonialCurrent + 1) % TESTIMONIALS.length), 6000);

// ─── FAQ Preview ──────────────────────────────────────────────────────────────

const FAQ_DATA = [
  { q: 'Kenapa harus hire Memorléa content creators?',       a: 'Banyak momen berharga yang terjadi di belakang panggung dan sering kali terlewat begitu saja tanpa sempat diabadikan. Memorléa Content Creator hadir untuk menangkap momen-momen candid dan tulus itu secara profesional. Setiap emosi dan momen yang terekam bersifat sangat personal, menciptakan kisah hangat yang terasa lebih nyata dan dekat di hati.' },
  { q: 'Apakah semua video diambil dengan handphone?',        a: 'Betul sekali! Memorléa Content Creator menggunakan perangkat handphone untuk merekam seluruh momen acaramu. Hasilnya tetap berkualitas tinggi namun terasa autentik dan personal. Perangkat yang kami gunakan adalah iPhone seri 13 ke atas untuk memastikan kualitas terbaik.' },
  { q: 'Apakah bisa ke seluruh Indonesia?',                   a: 'Tentu saja bisa! Meskipun Memorléa Content Creator saat ini berdomisili di Jabodetabek, hal itu bukan hambatan. Ke mana pun lokasi acaramu, kami siap hadir. Tim admin kami akan membantu menghitung estimasi biaya transportasi dan akomodasi yang dibutuhkan.' },
];

function renderFAQPreview() {
  const container = document.getElementById('faq-preview');
  if (!container) return;

  container.innerHTML = FAQ_DATA.map((item, i) => `
    <div class="faq-item" id="faq-prev-${i}">
      <button class="faq-question" onclick="toggleFAQPreview(${i})">
        <span>${item.q}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer"><p>${item.a}</p></div>
    </div>
  `).join('');
}

function toggleFAQPreview(i) {
  document.querySelectorAll('[id^="faq-prev-"]').forEach((item, idx) => {
    const icon = item.querySelector('.faq-icon');
    if (idx === i) {
      item.classList.toggle('open');
      if (icon) icon.textContent = item.classList.contains('open') ? '−' : '+';
    } else {
      item.classList.remove('open');
      if (icon) icon.textContent = '+';
    }
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  renderPortfolioPreview();
  renderTestimonials();
  renderFAQPreview();
  observeReveal();
});