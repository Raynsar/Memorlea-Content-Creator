// ── LOADING - FIX: pastikan loading screen hilang ──
window.addEventListener('load', () => {
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.classList.add('hidden');
  }, 800);
});

// ── NAVBAR ──
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 60));
}
function toggleMenu() { document.getElementById('navbar-links')?.classList.toggle('open'); }

// ── PAGE TRANSITION ──
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http')) return;
  link.addEventListener('click', e => {
    e.preventDefault();
    const pt = document.getElementById('page-transition');
    if (pt) { pt.classList.add('in'); setTimeout(() => { window.location.href = href; }, 450); }
    else window.location.href = href;
  });
});

// ── REVEAL ──
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });

// ── FAQ DATA ──
const FAQ_DATA = [
  {
    q: 'Kenapa harus hire Memorléa Content Creator?',
    a: 'Banyak momen berharga yang terjadi di belakang panggung dan sering kali terlewat begitu saja tanpa sempat diabadikan. Memorléa Content Creator hadir untuk menangkap momen-momen candid dan tulus itu secara profesional. Setiap emosi dan momen yang terekam bersifat sangat personal, menciptakan kisah hangat yang terasa lebih nyata dan dekat di hati.'
  },
  {
    q: 'Apakah semua video diambil menggunakan handphone?',
    a: 'Betul sekali! Memorléa Content Creator menggunakan perangkat handphone untuk merekam seluruh momen acaramu. Hasilnya tetap berkualitas tinggi namun terasa autentik dan personal. Perangkat yang kami gunakan adalah iPhone seri 13 ke atas untuk memastikan kualitas terbaik.'
  },
  {
    q: 'Apakah Memorléa bisa ke seluruh Indonesia?',
    a: 'Tentu saja bisa! Meskipun Memorléa Content Creator saat ini berdomisili di Jabodetabek, hal itu bukan hambatan. Ke mana pun lokasi acaramu, kami siap hadir. Tim admin kami akan membantu menghitung estimasi biaya transportasi dan akomodasi yang dibutuhkan.'
  },
  {
    q: 'Bagaimana cara kerja Instagram takeover oleh Memorléa?',
    a: 'Caranya sangat mudah — Vendor cukup memberikan username dan password Instagram untuk kami gunakan di perangkat Memorléa. Jika kurang nyaman, Tim Vendor juga bisa mengetikkan password secara langsung, dan kami yang akan mengelola serta memposting konten secara real-time selama acara berlangsung. Setelah acara selesai, Vendor bebas mengganti password kembali seperti semula. Praktis, aman, dan tidak ribet!'
  },
  {
    q: 'Apakah Vendor bisa menyerahkan handphone-nya ke Memorléa?',
    a: 'Tentu bisa! Vendor cukup menyerahkan handphone-nya kepada tim Memorléa Content Creator. Tidak perlu khawatir — kami hanya akan menggunakan fitur kamera dan Instagram saja. Keuntungannya jelas: tidak perlu repot login akun di perangkat kami, dan semua file video langsung tersimpan di handphone Vendor tanpa perlu proses unduh. Kami menyarankan penggunaan iPhone seri 13 ke atas demi menjaga kualitas video yang optimal.'
  },
];

// ── RENDER FAQ ──
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('faq-list');
  if (!container) return;

  container.innerHTML = FAQ_DATA.map((item, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-question" onclick="toggleFaq(${i})" aria-expanded="false">
        <span>${item.q}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer">
        <p>${item.a}</p>
      </div>
    </div>
  `).join('');

  // Observe reveal elements setelah render
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});

function toggleFaq(i) {
  const item = document.getElementById('faq-' + i);
  if (!item) return;
  const btn  = item.querySelector('.faq-question');
  const icon = item.querySelector('.faq-icon');
  const open = item.classList.contains('open');

  document.querySelectorAll('.faq-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
    const ic = el.querySelector('.faq-icon');
    if (ic) ic.textContent = '+';
  });

  if (!open) {
    item.classList.add('open');
    btn?.setAttribute('aria-expanded', 'true');
    if (icon) icon.textContent = '−';
  }
}