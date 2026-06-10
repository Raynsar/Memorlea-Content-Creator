const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const SESSION_KEY        = 'memorlea_admin_login_at';

// Cek session yang masih aktif dan belum timeout
db.auth.getSession().then(({ data: { session } }) => {
  if (!session) return;
  const loginAt = localStorage.getItem(SESSION_KEY);
  // Ada session tapi sudah > 8 jam → paksa logout
  if (loginAt && Date.now() - parseInt(loginAt) > SESSION_TIMEOUT_MS) {
    db.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  // Session masih valid → langsung ke dashboard
  window.location.href = 'admin.html';
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Masuk';
  } else {
    // Catat waktu login di device ini
    localStorage.setItem(SESSION_KEY, Date.now().toString());
    window.location.href = 'admin.html';
  }
});