window.addEventListener('load', () => setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 800));
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 60));
function toggleMenu() { document.getElementById('navbar-links').classList.toggle('open'); }

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || link.hasAttribute('download')) return;
  e.preventDefault();  setTimeout(() => { window.location.href = href; }, 450);
});

const testimonialsData = [
  { text: 'Memorléa luar biasa! Kontennya langsung tayang pas hari H, semua tamu takjub lihat story Instagram kami update real-time. Hasilnya candid tapi tetap indah.', name: 'Tiesa & Neo', event: 'Akad & Resepsi · Jakarta' },
  { text: 'Pelayanannya sangat profesional dan ramah. Tim Memorléa paham betul cara mengabadikan momen paling natural tanpa bikin kita kaku di depan kamera.', name: 'Nadia & Rigel', event: 'Pemberkatan · Jakarta' },
  { text: 'Worth it banget! Berkat Memorléa, semua momen behind the scenes keabadikan dengan cantik.', name: 'Arli & Alingga', event: 'Resepsi Adat Sunda · Bandung' },
];

let tc = 0;
function renderTestimonials() {
  const inner = document.getElementById('testimonials-inner');
  const nav   = document.getElementById('testimonial-nav');
  if (!inner) return;
  inner.innerHTML = testimonialsData.map(t => `
    <div class="testimonial-card">
      <p class="testimonial-text">${t.text}</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${t.name.charAt(0)}</div>
        <div><p class="testimonial-name">${t.name}</p><p class="testimonial-event">${t.event}</p></div>
      </div>
    </div>`).join('');
  nav.innerHTML = testimonialsData.map((_, i) =>
    `<div class="testimonial-dot${i===0?' active':''}" onclick="goT(${i})"></div>`).join('');
}
function goT(n) {
  tc = n;
  const inner = document.getElementById('testimonials-inner');
  const w = (inner.children[0]?.offsetWidth || 0) + 32;
  inner.style.transform = `translateX(-${n * w}px)`;
  document.querySelectorAll('.testimonial-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}
setInterval(() => goT((tc + 1) % testimonialsData.length), 6000);
renderTestimonials();