// ── LOADING SCREEN ──
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 1200);
});

// ── NAVBAR SCROLL ──
const navbar = document.getElementById('navbar');

function updateNavbar() {
  // Di index.html, navbar transparan di atas hero foto
  // Begitu hero mulai keluar dari viewport, langsung tambah scrolled
  const hero = document.getElementById('hero');
  if (hero) {
    const heroBottom = hero.getBoundingClientRect().bottom;
    navbar.classList.toggle('scrolled', heroBottom <= 80);
  } else {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
}

window.addEventListener('scroll', updateNavbar);
// Jalankan sekali saat load untuk handle reload di tengah halaman
updateNavbar();

// ── HAMBURGER ──
function toggleMenu() {
  document.getElementById('navbar-links').classList.toggle('open');
}


// ── HERO CAROUSEL ──
const slides = document.querySelectorAll('.hero-slide');
const dotsContainer = document.getElementById('hero-dots');
let currentSlide = 0, carouselTimer;

slides.forEach((_, i) => {
  const dot = document.createElement('div');
  dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
});

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dotsContainer.children[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dotsContainer.children[currentSlide].classList.add('active');
}

function startCarousel() {
  carouselTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
}
startCarousel();

// ── REVEAL ON SCROLL ──
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── COUNTER ANIMATION ──
function animateCounter(el, target) {
  let start = 0;
  const duration = 1800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

async function loadStats() {
  try {
    const { data, error } = await db.from('stats').select('*').single();
    if (error || !data) {
      // fallback values
      updateStats({ clients: 6, vendors: 5, cities: 8, crew: 3 });
      return;
    }
    updateStats(data);
  } catch {
    updateStats({ clients: 6, vendors: 5, cities: 8, crew: 3 });
  }
}

function updateStats(data) {
  document.querySelectorAll('.counter').forEach(el => {
    const key = el.dataset.key;
    const target = parseInt(data[key] || 0);
    el.dataset.target = target;
  });

  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.counter').forEach(el => {
          animateCounter(el, parseInt(el.dataset.target));
        });
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });
  const statsSection = document.querySelector('.stats-section');
  if (statsSection) statsObserver.observe(statsSection);
}

// ── PORTFOLIO PREVIEW ──
const portfolioData = [
  { name: 'Tiesa & Neo', img: 'assets/images/hero4.jpg' },
  { name: 'Chika & Bayu', img: 'assets/images/hero5.jpg' },
  { name: 'Nadia & Rigel', img: 'assets/images/hero3.jpg' },
  { name: 'Ruth & Christ', img: 'assets/images/hero4.jpg' },
  { name: 'Arli & Alingga', img: 'assets/images/hero1.jpg' },
  { name: 'Nada & Subhan', img: 'assets/images/hero2.jpg' },
];

function renderPortfolioPreview() {
  const grid = document.getElementById('portfolio-preview');
  if (!grid) return;
  grid.innerHTML = portfolioData.map(p => `
    <div class="portfolio-card reveal">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="portfolio-card-overlay">
        <span class="portfolio-card-name">${p.name}</span>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ── TESTIMONIALS ──
const testimonialsData = [
  { text: 'Memorléa luar biasa! Kontennya langsung tayang pas hari H, semua tamu takjub lihat story Instagram kami update real-time. Hasilnya candid tapi tetap indah.', name: 'Tiesa & Neo', event: 'Akad & Resepsi · Jakarta' },
  { text: 'Pelayanannya sangat profesional dan ramah. Tim Memorléa paham betul cara mengabadikan momen paling natural tanpa bikin kita kaku di depan kamera.', name: 'Nadia & Rigel', event: 'Pemberkatan · Jakarta' },
  { text: 'Sudah pakai Memorléa 2x, untuk siraman dan akad. Hasilnya selalu memuaskan! File raw-nya juga cepat dikirim, tidak perlu nunggu lama.', name: 'Ruth & Christ', event: 'Akad Adat Batak · Jakarta' },
  { text: 'Worth it banget! Banyak momen behind the scenes yang terlewat kalau tidak ada WCC. Berkat Memorléa, semua keabadikan dengan cantik.', name: 'Arli & Alingga', event: 'Resepsi Adat Sunda · Bandung' },
  { text: 'Instagram takeover-nya berjalan lancar, kami tidak perlu khawatir soal keamanan akun. Tim Memorléa sangat bisa dipercaya.', name: 'Chika & Bayu', event: 'Akad & Resepsi · Cilacap' },
];

let testimonialCurrent = 0;

function renderTestimonials() {
  const inner = document.getElementById('testimonials-inner');
  const nav = document.getElementById('testimonial-nav');
  if (!inner || !nav) return;

  inner.innerHTML = testimonialsData.map(t => `
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

  nav.innerHTML = testimonialsData.map((_, i) =>
    `<div class="testimonial-dot${i === 0 ? ' active' : ''}" onclick="goTestimonial(${i})"></div>`
  ).join('');
}

function goTestimonial(n) {
  testimonialCurrent = n;
  const inner = document.getElementById('testimonials-inner');
  const isMobile = window.innerWidth <= 768;
  const perView = isMobile ? 1 : 3;
  const cardWidth = inner.children[0]?.offsetWidth + 32 || 0;
  const maxShift = Math.max(0, testimonialsData.length - perView);
  const shift = Math.min(n, maxShift);
  inner.style.transform = `translateX(-${shift * cardWidth}px)`;
  document.querySelectorAll('.testimonial-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

setInterval(() => {
  const next = (testimonialCurrent + 1) % testimonialsData.length;
  goTestimonial(next);
}, 6000);

// ── FAQ PREVIEW ──
const faqData = [
  { q: 'Kenapa harus hire Memorléa content creators?', a: 'Banyak momen berharga yang terjadi di belakang panggung dan sering kali terlewat begitu saja tanpa sempat diabadikan. Memorléa hadir untuk menangkap momen-momen candid dan tulus itu secara profesional. Setiap emosi dan momen yang terekam bersifat sangat personal, menciptakan kisah hangat yang terasa lebih nyata dan dekat di hati.' },
  { q: 'Apakah semua video diambil dengan handphone?', a: 'Betul sekali! Memorléa menggunakan perangkat handphone untuk merekam seluruh momen acaramu. Hasilnya tetap berkualitas tinggi namun terasa autentik dan personal. Perangkat yang kami gunakan adalah iPhone seri 13 ke atas untuk memastikan kualitas terbaik.' },
  { q: 'Apakah bisa ke seluruh Indonesia?', a: 'Tentu saja bisa! Meskipun Memorléa saat ini berdomisili di Jabodetabek, hal itu bukan hambatan. Ke mana pun lokasi acaramu, kami siap hadir. Tim admin kami akan membantu menghitung estimasi biaya transportasi dan akomodasi yang dibutuhkan.' },
  { q: 'Gimana Instagram takeovers bekerja?', a: 'Caranya sangat mudah — vendor cukup memberikan username dan password Instagram untuk kami gunakan di perangkat Memorléa. Jika kurang nyaman, tim vendor juga bisa mengetikkan password secara langsung. Setelah acara selesai, vendor bebas mengganti password kembali. Praktis, aman, dan tidak ribet!' },
  { q: 'Apakah bisa takeovers handphone Vendor?', a: 'Tentu bisa! Vendor cukup menyerahkan handphone-nya kepada tim Memorléa. Tidak perlu khawatir — kami hanya akan menggunakan fitur kamera dan Instagram saja. Semua file video langsung tersimpan di handphone vendor tanpa perlu proses unduh. Kami menyarankan iPhone seri 13 ke atas demi menjaga kualitas video yang optimal.' },
];

function renderFAQPreview() {
  const container = document.getElementById('faq-preview');
  if (!container) return;
  container.innerHTML = faqData.slice(0, 3).map((item, i) => `
    <div class="faq-item">
      <button class="faq-question" onclick="toggleFAQ(${i})">
        ${item.q}
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer"><p>${item.a}</p></div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item, idx) => {
    if (idx === i) item.classList.toggle('open');
    else item.classList.remove('open');
  });
}

// ── TOAST ──
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  renderPortfolioPreview();
  renderTestimonials();
  renderFAQPreview();
});