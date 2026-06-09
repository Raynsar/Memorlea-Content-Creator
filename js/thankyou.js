// tampilkan nama kalau ada
const name = sessionStorage.getItem('memorlea_name');
if (name) {
  document.getElementById('thankyou-msg').innerHTML =
    `Halo <strong>${name}</strong>! Formulirmu telah kami terima.<br/>Tim Memorléa akan segera menghubungimu. ✨`;
}

// progress bar
const bar = document.getElementById('progress-bar');
const countEl = document.getElementById('countdown');
let count = 3;

setTimeout(() => { bar.style.width = '100%'; }, 100);

const timer = setInterval(() => {
  count--;
  if (countEl) countEl.textContent = count;
  if (count <= 0) {
    clearInterval(timer);
    // verifikasi token sebelum redirect
    const token = sessionStorage.getItem('memorlea_token');
    if (token) {
      window.location.href = 'pricelist.html';
    } else {
      window.location.href = 'index.html';
    }
  }
}, 1000);
