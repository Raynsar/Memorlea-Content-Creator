// ── LOADING ──
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hidden'), 800);
});

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

// ── RATE LIMITING ──
const RATE_LIMIT_KEY = 'memorlea_form_ts';
const RATE_LIMIT_MS  = 5 * 60 * 1000;

function isRateLimited() {
  const last = localStorage.getItem(RATE_LIMIT_KEY);
  if (!last) return false;
  const elapsed = Date.now() - parseInt(last);
  if (elapsed >= RATE_LIMIT_MS) {
    localStorage.removeItem(RATE_LIMIT_KEY);
    return false;
  }
  return true;
}

function setRateLimit() {
  localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
}

// ── VALIDATION ──
function showErr(id, show) {
  const el = document.getElementById('err-' + id);
  if (el) el.classList.toggle('show', show);
}

function sanitize(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

function validateForm(data) {
  let valid = true;

  if (!data.couple_name || data.couple_name.length < 2) {
    showErr('couple_name', true); valid = false;
  } else showErr('couple_name', false);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRe.test(data.email)) {
    showErr('email', true); valid = false;
  } else showErr('email', false);

  if (data.phone && !/^(\+?62|0)[0-9]{8,13}$/.test(data.phone.replace(/\s|-/g, ''))) {
    showErr('phone', true); valid = false;
  } else showErr('phone', false);

  if (!data.wedding_date) {
    showErr('wedding_date', true); valid = false;
  } else {
    const d = new Date(data.wedding_date);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) { showErr('wedding_date', true); valid = false; }
    else showErr('wedding_date', false);
  }

  if (!data.package) {
    showErr('package', true); valid = false;
  } else showErr('package', false);

  if (!data.city) {
    showErr('city', true); valid = false;
  } else showErr('city', false);

  if (!data.consent) {
    showErr('consent', true); valid = false;
  } else showErr('consent', false);

  return valid;
}

function showFormError(msg) {
  const el = document.getElementById('form-error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideFormError() {
  const el = document.getElementById('form-error-msg');
  if (el) el.style.display = 'none';
}

// ── FORM SUBMIT ──
document.addEventListener('DOMContentLoaded', () => {
  const rlMsg = document.getElementById('rate-limit-msg');
  if (rlMsg) rlMsg.style.display = 'none';
  hideFormError();

  const dateInput = document.getElementById('wedding_date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (rlMsg) rlMsg.style.display = 'none';
    hideFormError();

    if (isRateLimited()) {
      if (rlMsg) rlMsg.style.display = 'block';
      return;
    }

    const btn = document.getElementById('submit-btn');

    const data = {
      couple_name:  sanitize(document.getElementById('couple_name').value),
      email:        sanitize(document.getElementById('email').value.toLowerCase()),
      phone:        sanitize(document.getElementById('phone').value),
      wedding_date: document.getElementById('wedding_date').value,
      package:      document.getElementById('package').value,
      city:         document.getElementById('city').value,
      venue:        sanitize(document.getElementById('venue').value),
      notes:        sanitize(document.getElementById('notes').value),
      source:       document.getElementById('source').value,
      consent:      document.getElementById('consent').checked,
      status:       'belum_dp',
      created_at:   new Date().toISOString(),
    };

    if (!validateForm(data)) return;

    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const { error } = await db.from('bookings').insert([data]);

      if (error) {
        // Log detail error ke console untuk debugging
        console.error('[Supabase insert error]', {
          message: error.message,
          code:    error.code,
          details: error.details,
          hint:    error.hint,
        });

        // Tampilkan pesan spesifik sesuai jenis error
        let msg = 'Terjadi kesalahan saat menyimpan data.';

        if (error.code === '42501' || error.message?.includes('row-level security')) {
          msg = 'Akses ditolak (RLS). Pastikan policy "public_insert_bookings" sudah aktif di Supabase.';
        } else if (error.code === 'PGRST301') {
          msg = 'Koneksi Supabase bermasalah. Cek URL dan anon key di supabase.js.';
        } else if (error.message?.includes('column') || error.code === '42703') {
          msg = 'Nama kolom tidak cocok. Cek struktur tabel bookings di Supabase.';
        } else if (error.message) {
          msg = `Error: ${error.message}`;
        }

        showFormError(msg);
        btn.disabled = false;
        btn.textContent = 'Dapatkan Pricelist & Konsultasi Gratis';
        return;
      }

      // Sukses
      setRateLimit();
      const token = btoa(data.email + ':' + data.wedding_date + ':' + Date.now());
      sessionStorage.setItem('memorlea_token',   token);
      sessionStorage.setItem('memorlea_name',    data.couple_name);
      sessionStorage.setItem('memorlea_phone',   data.phone    || '');
      sessionStorage.setItem('memorlea_date',    data.wedding_date || '');
      sessionStorage.setItem('memorlea_package', data.package  || '');
      sessionStorage.setItem('memorlea_city',    data.city     || '');
      sessionStorage.setItem('memorlea_venue',   data.venue    || '');
      window.location.href = 'thankyou.html';

    } catch (err) {
      // Log lengkap ke console — buka DevTools F12 untuk lihat detail
      console.error('[Form submit exception]', err);
      console.error('err.name:', err.name);
      console.error('err.message:', err.message);
      console.error('err.stack:', err.stack);

      // Tampilkan error asli di halaman — jangan sembunyikan
      const msg = err.message
        ? `Error: ${err.name} — ${err.message}`
        : 'Terjadi kesalahan tak terduga. Cek Console (F12) untuk detail.';

      showFormError(msg);
      btn.disabled = false;
      btn.textContent = 'Dapatkan Pricelist & Konsultasi Gratis';
    }
  });
});