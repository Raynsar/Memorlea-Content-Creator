// cek jika sudah login
db.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.href = 'admin.html';
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
    window.location.href = 'admin.html';
  }
});