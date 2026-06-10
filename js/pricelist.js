// ── SESSION GATE ──
const token = sessionStorage.getItem('memorlea_token');
const gate  = document.getElementById('gate-overlay');
const main  = document.getElementById('pricelist-content');

if (!token) {
  gate.style.display = 'flex';
  main.style.display = 'none';
} else {
  gate.style.display = 'none';
  main.style.display = 'block';
  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hidden'), 800);
  buildWALink();
}

// ── NAVBAR ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 60));
function toggleMenu() { document.getElementById('navbar-links')?.classList.toggle('open'); }

// ── PAGE TRANSITION ──
document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || link.hasAttribute('download')) return;
  e.preventDefault();
  const pt = document.getElementById('page-transition');
  if (pt) pt.classList.add('in');
  setTimeout(() => { window.location.href = href; }, 450);
});

// ── BUILD TEMPLATE WA ──
function buildWALink() {
  const PACKAGE_LABEL = {
    luxury:     'Luxury Wedding - Rp1.750.000',
    parelta:    'Parelta Package - Rp1.000.000',
    tara:       'Tara Package - Rp725.000',
    sean:       'Sean Package - Rp575.000',
    prewedding: 'Pre-Wedding - Rp450.000',
    nonwedding: 'Non-Wedding - Rp400.000',
  };

  const name  = sessionStorage.getItem('memorlea_name')    || '';
  const phone = sessionStorage.getItem('memorlea_phone')   || '';
  const date  = sessionStorage.getItem('memorlea_date')    || '';
  const pkg   = sessionStorage.getItem('memorlea_package') || '';
  const city  = sessionStorage.getItem('memorlea_city')    || '';
  const venue = sessionStorage.getItem('memorlea_venue')   || '';

  // Format tanggal
  let tgl = '';
  if (date) {
    try {
      tgl = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch(e) { tgl = date; }
  }

  const pkgLabel = PACKAGE_LABEL[pkg] || pkg;

  // Bangun baris detail - hanya tampilkan yang ada isinya
  const details = [];
  if (name)     details.push('- Nama Pengantin : ' + name);
  if (phone)    details.push('- No. HP/WA      : ' + phone);
  if (tgl)      details.push('- Tanggal Wedding: ' + tgl);
  if (pkgLabel) details.push('- Paket Diminati : ' + pkgLabel);
  if (city)     details.push('- Kota           : ' + city);
  if (venue)    details.push('- Venue          : ' + venue);

  const template =
    'Halo Memorlea!\n\n' +
    'Saya sudah mengisi formulir konsultasi dan ingin mengetahui lebih lanjut mengenai layanan Wedding Content Creator.\n\n' +
    'Detail Acara:\n' +
    details.join('\n') + '\n\n' +
    'Mohon informasi lebih lanjut mengenai ketersediaan dan proses booking. Terima kasih!';

  const waUrl = 'https://wa.me/6285121148620?text=' + encodeURIComponent(template);

  const waBtn = document.getElementById('wa-contact-btn');
  if (waBtn) waBtn.href = waUrl;

  const waFloat = document.querySelector('.wa-float');
  if (waFloat) waFloat.href = waUrl;
}