// ─── State ────────────────────────────────────────────────────────────────────
let allBookings = [];
let editingId   = null;
let detailId    = null;
let calYear, calMonth;
let chartMonthly, chartPackages, chartCities, chartMonthly2, chartPackages2, chartCities2;

const STATUS_LABEL = {
  belum_dp: '🔴 Belum DP',
  sudah_dp: '🟡 Sudah DP',
  lunas:    '🟢 Lunas',
  selesai:  '🔵 Selesai',
};
const STATUS_COLOR = {
  belum_dp: '#dc2626',
  sudah_dp: '#ca8a04',
  lunas:    '#16a34a',
  selesai:  '#2563eb',
};
const PACKAGE_LABEL = {
  luxury:     'Luxury Wedding',
  parelta:    'Parelta Package',
  tara:       'Tara Package',
  sean:       'Sean Package',
  prewedding: 'Pre-Wedding',
  nonwedding: 'Non-Wedding',
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'admin-login.html'; return; }
  document.getElementById('admin-email').textContent = session.user.email;

  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  await loadAll();
});

async function loadAll() {
  await Promise.all([loadBookings(), loadStats()]);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function adminLogout() {
  await db.auth.signOut();
  window.location.href = 'admin-login.html';
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function showSection(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('section-title').textContent = {
    dashboard: 'Dashboard', bookings: 'Bookings',
    kalender: 'Kalender', analytics: 'Analytics', stats: 'Stats Counter',
  }[name];
  if (name === 'analytics') renderAnalyticsCharts();
  if (name === 'kalender')  { renderCalendar(); renderAvailStats(); }
}

// ─── Load Bookings ────────────────────────────────────────────────────────────
async function loadBookings() {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[loadBookings]', error);
    document.getElementById('bookings-tbody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:2rem">Error: ${error.message}</td></tr>`;
    return;
  }

  allBookings = data || [];
  renderTable(allBookings);
  populateCityFilter();
  renderSummaryCards();
  renderDashboardCharts();
  updateBadge();
}

// ─── Badge Notifikasi ─────────────────────────────────────────────────────────
function updateBadge() {
  const count = allBookings.filter(b => b.status === 'belum_dp').length;
  const badge = document.getElementById('badge-belum-dp');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function renderSummaryCards() {
  document.getElementById('card-total').textContent = allBookings.length;
  document.getElementById('card-belum').textContent = allBookings.filter(b => b.status === 'belum_dp').length;
  document.getElementById('card-dp').textContent    = allBookings.filter(b => b.status === 'sudah_dp').length;
  document.getElementById('card-lunas').textContent = allBookings.filter(b => b.status === 'lunas' || b.status === 'selesai').length;
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('bookings-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mid);padding:3rem">Tidak ada data booking.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(b => {
    const tgl = b.wedding_date
      ? new Date(b.wedding_date + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
      : '—';
    const color = STATUS_COLOR[b.status] || '#888';
    const pkg   = PACKAGE_LABEL[b.package] || b.package || '—';
    return `
      <tr style="cursor:pointer" onclick="openDetailModal('${b.id}')">
        <td>
          <strong>${esc(b.couple_name)}</strong>
          <div style="font-size:0.75rem;color:var(--mid);margin-top:2px">${esc(b.email||'')}${b.phone ? ' · ' + esc(b.phone) : ''}</div>
        </td>
        <td>${tgl}</td>
        <td style="font-size:0.8rem">${esc(pkg)}</td>
        <td>${esc(b.city||'—')}</td>
        <td>
          <span style="background:${color}18;color:${color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;white-space:nowrap">
            ${STATUS_LABEL[b.status] || b.status}
          </span>
        </td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="action-btn action-edit" onclick="openEditModal('${b.id}')">✏️ Status</button>
            <button class="action-btn" style="background:#fef9c3;color:#92400e" onclick="printInvoice('${b.id}')">🖨️</button>
            <button class="action-btn" style="background:#fef2f2;color:#dc2626" onclick="deleteBooking('${b.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterTable() {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('filter-status').value;
  const city   = document.getElementById('filter-city').value;
  const filtered = allBookings.filter(b => {
    const matchQ = !q || [b.couple_name, b.city, b.email, b.phone].some(v => v?.toLowerCase().includes(q));
    return matchQ && (!status || b.status === status) && (!city || b.city === city);
  });
  renderTable(filtered);
}

function populateCityFilter() {
  const cities = [...new Set(allBookings.map(b => b.city).filter(Boolean))].sort();
  const sel = document.getElementById('filter-city');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua Kota</option>' + cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = cur;
}

// ─── FITUR 1: Detail Booking Modal ───────────────────────────────────────────
function openDetailModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  detailId = id;

  const color = STATUS_COLOR[b.status] || '#888';
  const pkg   = PACKAGE_LABEL[b.package] || b.package || '—';
  const tgl   = b.wedding_date
    ? new Date(b.wedding_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : '—';
  const created = b.created_at
    ? new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';

  document.getElementById('detail-couple-name').textContent = b.couple_name;
  document.getElementById('detail-status-badge').innerHTML =
    `<span style="background:${color}18;color:${color};padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:600">${STATUS_LABEL[b.status] || b.status}</span>`;

  document.getElementById('d-email').textContent   = b.email   || '—';
  document.getElementById('d-phone').textContent   = b.phone   || '—';
  document.getElementById('d-date').textContent    = tgl;
  document.getElementById('d-package').textContent = pkg;
  document.getElementById('d-city').textContent    = b.city    || '—';
  document.getElementById('d-venue').textContent   = b.venue   || '—';
  document.getElementById('d-source').textContent  = b.source  || '—';
  document.getElementById('d-created').textContent = created;
  document.getElementById('d-notes').textContent   = b.notes   || 'Tidak ada catatan.';

  // Link WA langsung ke nomor klien
  const waLink = document.getElementById('d-wa-link');
  if (b.phone) {
    const num = b.phone.replace(/\D/g, '').replace(/^0/, '62');
    waLink.href = `https://wa.me/${num}`;
    waLink.style.display = 'inline-flex';
  } else {
    waLink.style.display = 'none';
  }

  document.getElementById('detail-modal').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
  detailId = null;
}

function openEditFromDetail() {
  closeDetailModal();
  if (detailId) openEditModal(detailId);
  // detailId sudah di-clear, ambil dari last
}

function printInvoiceFromDetail() {
  if (detailId) printInvoice(detailId);
}

// ─── Edit Status Modal ────────────────────────────────────────────────────────
function openEditModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('modal-name').textContent   = b.couple_name;
  document.getElementById('modal-status').value       = b.status || 'belum_dp';
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editingId = null;
}

async function saveStatus() {
  if (!editingId) return;
  const status = document.getElementById('modal-status').value;
  const { error } = await db.from('bookings').update({ status }).eq('id', editingId);
  if (error) { showToast('Gagal update status', 'error'); return; }

  const idx = allBookings.findIndex(b => b.id === editingId);
  if (idx !== -1) allBookings[idx].status = status;

  closeModal();
  filterTable();
  renderSummaryCards();
  renderDashboardCharts();
  renderCalendar();
  updateBadge();
  showToast('Status berhasil diupdate!');
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteBooking(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b || !confirm(`Hapus booking "${b.couple_name}"?`)) return;
  const { error } = await db.from('bookings').delete().eq('id', id);
  if (error) { showToast('Gagal hapus', 'error'); return; }
  allBookings = allBookings.filter(b => b.id !== id);
  filterTable(); populateCityFilter(); renderSummaryCards(); renderDashboardCharts(); updateBadge();
  showToast('Booking dihapus.');
}

// ─── Archive ──────────────────────────────────────────────────────────────────
function confirmArchive()   { document.getElementById('archive-modal').classList.add('open'); }
function closeArchiveModal(){ document.getElementById('archive-modal').classList.remove('open'); }

async function archiveAll() {
  const ids = allBookings.map(b => b.id);
  if (!ids.length) { closeArchiveModal(); return; }
  const { error } = await db.from('bookings').update({ archived: true }).in('id', ids);
  if (error) { showToast('Gagal archive', 'error'); return; }
  allBookings = [];
  renderTable([]); renderSummaryCards(); renderDashboardCharts(); updateBadge();
  closeArchiveModal();
  showToast('Semua data berhasil di-archive!');
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportToSheets() {
  if (!allBookings.length) { showToast('Tidak ada data.'); return; }
  const headers = ['Nama Pengantin','Email','No. HP','Tanggal Wedding','Paket','Kota','Venue','Catatan','Status','Tanggal Booking'];
  const rows = allBookings.map(b => [
    b.couple_name||'', b.email||'', b.phone||'', b.wedding_date||'',
    PACKAGE_LABEL[b.package]||b.package||'', b.city||'', b.venue||'', b.notes||'',
    STATUS_LABEL[b.status]||b.status||'',
    b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'})),
    download: `memorlea-bookings-${new Date().toISOString().slice(0,10)}.csv`
  });
  a.click();
  showToast('Export CSV berhasil!');
}

// ─── Invoice Print ────────────────────────────────────────────────────────────
function printInvoice(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  const tgl     = b.wedding_date ? new Date(b.wedding_date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—';
  const booked  = b.created_at   ? new Date(b.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—';
  const pkg     = PACKAGE_LABEL[b.package] || b.package || '—';

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
<title>Invoice – ${b.couple_name}</title>
<style>
body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#2E1530;padding:0 20px}
.header{text-align:center;border-bottom:2px solid #4A2545;padding-bottom:20px;margin-bottom:30px}
.brand{font-size:2rem;font-style:italic;color:#4A2545;letter-spacing:2px}
.brand span{font-size:0.8rem;display:block;font-style:normal;letter-spacing:4px;color:#C9A96E;margin-top:4px}
h2{font-size:1rem;font-weight:normal;letter-spacing:3px;text-transform:uppercase;color:#888;margin:0 0 20px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
td{padding:10px 0;border-bottom:1px solid #f0e8f8;font-size:0.9rem}
td:first-child{color:#888;width:40%}
.footer{text-align:center;margin-top:40px;font-size:0.8rem;color:#aaa}
</style></head><body>
<div class="header"><div class="brand">Memorléa<span>WEDDING CONTENT CREATOR</span></div><h2>Invoice Booking</h2></div>
<table>
<tr><td>Nama Pengantin</td><td><strong>${esc(b.couple_name)}</strong></td></tr>
<tr><td>Email</td><td>${esc(b.email||'—')}</td></tr>
<tr><td>No. HP</td><td>${esc(b.phone||'—')}</td></tr>
<tr><td>Tanggal Wedding</td><td>${tgl}</td></tr>
<tr><td>Paket</td><td><strong>${esc(pkg)}</strong></td></tr>
<tr><td>Kota</td><td>${esc(b.city||'—')}</td></tr>
<tr><td>Venue</td><td>${esc(b.venue||'—')}</td></tr>
<tr><td>Catatan</td><td>${esc(b.notes||'—')}</td></tr>
<tr><td>Status</td><td>${STATUS_LABEL[b.status]||b.status}</td></tr>
<tr><td>Tanggal Booking</td><td>${booked}</td></tr>
</table>
<div class="footer"><p>Terima kasih telah mempercayakan momen spesial Anda kepada Memorléa ✨</p><p>@memorlea · wa.me/6285121148620</p></div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`);
  w.document.close();
}

// ─── FITUR 2: Kalender Booking ────────────────────────────────────────────────
function renderCalendar() {
  const grid  = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid) return;

  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  label.textContent = `${monthNames[calMonth]} ${calYear}`;

  // Buat map tanggal wedding → bookings
  const bookingMap = {};
  allBookings.forEach(b => {
    if (!b.wedding_date) return;
    const key = b.wedding_date; // format YYYY-MM-DD
    if (!bookingMap[key]) bookingMap[key] = [];
    bookingMap[key].push(b);
  });

  // Header hari
  const dayLabels = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  let html = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  const firstDay  = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Hari dari bulan sebelumnya
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${daysInPrev - i}</span></div>`;
  }

  // Hari bulan ini
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayBookings = bookingMap[dateStr] || [];
    const isToday = dateStr === todayStr;
    const hasBooking = dayBookings.length > 0;

    let chips = '';
    dayBookings.slice(0, 2).forEach(b => {
      const name = b.couple_name?.split('&')[0]?.trim() || b.couple_name;
      chips += `<div class="cal-booking-chip chip-${b.status}">${esc(name)}</div>`;
    });
    if (dayBookings.length > 2) {
      chips += `<div class="cal-booking-chip" style="background:#f3f4f6;color:#6b7280">+${dayBookings.length-2} lagi</div>`;
    }

    const classes = ['cal-day', isToday?'today':'', hasBooking?'has-booking':''].filter(Boolean).join(' ');
    const onclick = hasBooking ? `onclick="openCalModal('${dateStr}')"` : '';

    html += `<div class="${classes}" ${onclick}>
      <span class="cal-day-num">${d}</span>
      ${chips ? `<div class="cal-booking-dot">${chips}</div>` : ''}
    </div>`;
  }

  // Hari bulan berikutnya
  const totalCells = firstDay + daysInMonth;
  const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${d}</span></div>`;
  }

  grid.innerHTML = html;
}

function prevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function nextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function goToday() {
  const now = new Date();
  calYear = now.getFullYear(); calMonth = now.getMonth();
  renderCalendar();
}

function openCalModal(dateStr) {
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('cal-modal-date').textContent =
    `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

  const dayBookings = allBookings.filter(b => b.wedding_date === dateStr);
  document.getElementById('cal-modal-list').innerHTML = dayBookings.map(b => {
    const color = STATUS_COLOR[b.status] || '#888';
    const pkg   = PACKAGE_LABEL[b.package] || b.package || '—';
    return `
      <div style="padding:1rem;border:1px solid #f0f0f0;border-radius:10px;margin-bottom:0.75rem;cursor:pointer"
           onclick="closeCalModal();openDetailModal('${b.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <strong style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--plum)">${esc(b.couple_name)}</strong>
          <span style="background:${color}18;color:${color};padding:2px 10px;border-radius:20px;font-size:0.73rem;font-weight:600">${STATUS_LABEL[b.status]||b.status}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--mid);margin-top:5px">${esc(pkg)} · ${esc(b.city||'—')}</div>
        ${b.venue ? `<div style="font-size:0.8rem;color:var(--mid)">📍 ${esc(b.venue)}</div>` : ''}
      </div>`;
  }).join('');

  document.getElementById('cal-modal').classList.add('open');
}

function closeCalModal() { document.getElementById('cal-modal').classList.remove('open'); }

// ─── FITUR 3: Availability Stats ─────────────────────────────────────────────
function renderAvailStats() {
  const now    = new Date();
  const thisM  = now.getMonth();
  const thisY  = now.getFullYear();
  const nextM  = (thisM + 1) % 12;
  const nextY  = thisM === 11 ? thisY + 1 : thisY;

  const pad = n => String(n).padStart(2,'0');

  const bulanIni = allBookings.filter(b => {
    if (!b.wedding_date) return false;
    const [y, m] = b.wedding_date.split('-').map(Number);
    return y === thisY && m - 1 === thisM;
  }).length;

  const bulanDepan = allBookings.filter(b => {
    if (!b.wedding_date) return false;
    const [y, m] = b.wedding_date.split('-').map(Number);
    return y === nextY && m - 1 === nextM;
  }).length;

  const mendatang = allBookings.filter(b => {
    if (!b.wedding_date) return false;
    return new Date(b.wedding_date + 'T00:00:00') >= now;
  }).length;

  document.getElementById('avail-bulan-ini').textContent    = bulanIni;
  document.getElementById('avail-bulan-depan').textContent  = bulanDepan;
  document.getElementById('avail-total-mendatang').textContent = mendatang;
}

// ─── Stats Counter ────────────────────────────────────────────────────────────
async function loadStats() {
  const { data } = await db.from('stats').select('*').limit(1).single();
  if (!data) return;
  ['clients','vendors','cities','crew'].forEach(k => {
    const el = document.getElementById('stat-' + k);
    if (el) el.value = data[k] || 0;
  });
}

async function saveStats() {
  const payload = {
    clients: parseInt(document.getElementById('stat-clients').value)||0,
    vendors: parseInt(document.getElementById('stat-vendors').value)||0,
    cities:  parseInt(document.getElementById('stat-cities').value)||0,
    crew:    parseInt(document.getElementById('stat-crew').value)||0,
  };
  const { data: ex } = await db.from('stats').select('id').limit(1).single();
  const { error } = ex
    ? await db.from('stats').update(payload).eq('id', ex.id)
    : await db.from('stats').insert([payload]);
  if (error) { showToast('Gagal simpan stats', 'error'); return; }
  const msg = document.getElementById('stats-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
  showToast('Stats disimpan!');
}

// ─── Charts ───────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#4A2545','#C9A96E','#C9B8D8','#7c3aed','#2563eb','#16a34a','#dc2626','#ea580c'];

function getMonthlyData() {
  const map = {};
  allBookings.forEach(b => {
    if (!b.created_at) return;
    const key = new Date(b.created_at).toLocaleDateString('id-ID',{month:'short',year:'numeric'});
    map[key] = (map[key]||0) + 1;
  });
  const s = Object.entries(map).sort((a,b) => new Date('1 '+a[0]) - new Date('1 '+b[0]));
  return { labels: s.map(e=>e[0]), values: s.map(e=>e[1]) };
}
function getPackageData() {
  const map = {};
  allBookings.forEach(b => { if (b.package) { const l = PACKAGE_LABEL[b.package]||b.package; map[l]=(map[l]||0)+1; }});
  return { labels: Object.keys(map), values: Object.values(map) };
}
function getCityData() {
  const map = {};
  allBookings.forEach(b => { if (b.city) map[b.city]=(map[b.city]||0)+1; });
  const top = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return { labels: top.map(e=>e[0]), values: top.map(e=>e[1]) };
}

function renderDashboardCharts() {
  const m = getMonthlyData(), p = getPackageData(), c = getCityData();
  if (chartMonthly)  chartMonthly.destroy();
  if (chartPackages) chartPackages.destroy();
  if (chartCities)   chartCities.destroy();
  chartMonthly  = new Chart(document.getElementById('chart-monthly'),  { type:'bar',    data:{labels:m.labels,datasets:[{label:'Booking',data:m.values,backgroundColor:'#4A254580',borderColor:'#4A2545',borderWidth:2,borderRadius:6}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
  chartPackages = new Chart(document.getElementById('chart-packages'), { type:'doughnut',data:{labels:p.labels,datasets:[{data:p.values,backgroundColor:CHART_COLORS}]}, options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}}});
  chartCities   = new Chart(document.getElementById('chart-cities'),   { type:'bar',    data:{labels:c.labels,datasets:[{data:c.values,backgroundColor:'#C9A96E80',borderColor:'#C9A96E',borderWidth:2,borderRadius:4}]}, options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{stepSize:1}}}}});
}
function renderAnalyticsCharts() {
  const m = getMonthlyData(), p = getPackageData(), c = getCityData();
  if (chartMonthly2)  chartMonthly2.destroy();
  if (chartPackages2) chartPackages2.destroy();
  if (chartCities2)   chartCities2.destroy();
  chartMonthly2  = new Chart(document.getElementById('chart-monthly-2'),  { type:'line',   data:{labels:m.labels,datasets:[{label:'Booking',data:m.values,borderColor:'#4A2545',backgroundColor:'#4A254520',fill:true,tension:0.4,pointBackgroundColor:'#4A2545'}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
  chartPackages2 = new Chart(document.getElementById('chart-packages-2'), { type:'pie',    data:{labels:p.labels,datasets:[{data:p.values,backgroundColor:CHART_COLORS}]}, options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}}});
  chartCities2   = new Chart(document.getElementById('chart-cities-2'),   { type:'bar',    data:{labels:c.labels,datasets:[{data:c.values,backgroundColor:CHART_COLORS}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#dc2626' : '#4A2545';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Detail modal dari open edit - simpan detailId sebelum close
function openEditModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('modal-name').textContent = b.couple_name;
  document.getElementById('modal-status').value     = b.status || 'belum_dp';
  document.getElementById('edit-modal').classList.add('open');
}
function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editingId = null;
}

// Overlay click close
['detail-modal','edit-modal','archive-modal','cal-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) document.getElementById(id).classList.remove('open');
  });
});