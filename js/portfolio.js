window.addEventListener('load', () => setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 800));
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 60));
function toggleMenu() { document.getElementById('navbar-links').classList.toggle('open'); }

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }});
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http')) return;
  link.addEventListener('click', e => {
    e.preventDefault();
    const pt = document.getElementById('page-transition');
    pt.classList.add('in');
    setTimeout(() => { window.location.href = href; }, 450);
  });
});

const portfolioItems = [
  { name: 'Tiesa & Neo',    img: 'assets/images/hero4.jpg',  tag: 'adat',        desc: 'Akad & Resepsi Adat Jawa' },
  { name: 'Chika & Bayu',   img: 'assets/images/hero5.jpg',  tag: 'pemberkatan', desc: 'Pemberkatan Gereja · Cilacap' },
  { name: 'Nadia & Rigel',  img: 'assets/images/hero3.jpg',  tag: 'pemberkatan', desc: 'Pemberkatan Gereja · Jakarta' },
  { name: 'Ruth & Christ',  img: 'assets/images/hero4.jpg',  tag: 'adat',        desc: 'Pernikahan Adat Batak' },
  { name: 'Arli & Alingga', img: 'assets/images/hero1.jpg',  tag: 'resepsi',     desc: 'Resepsi Adat Sunda · Bandung' },
  { name: 'Nada & Subhan',  img: 'assets/images/hero2.jpg',  tag: 'akad',        desc: 'Akad & Resepsi · Jakarta' },
];

function renderPortfolio(filter = 'all') {
  const grid = document.getElementById('portfolio-grid');
  const items = filter === 'all' ? portfolioItems : portfolioItems.filter(p => p.tag === filter);
  grid.innerHTML = items.map(p => `
    <div class="portfolio-card reveal">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="portfolio-card-overlay">
        <div>
          <p class="portfolio-card-name">${p.name}</p>
          <p style="font-size:0.75rem;color:var(--gold-lt);margin-top:0.2rem">${p.desc}</p>
        </div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

function filterPortfolio(tag, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPortfolio(tag);
}

renderPortfolio();
