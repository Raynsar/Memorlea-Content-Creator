/**
 * admin.js — Memorléa Dashboard
 * Sections: Config · Auth · Navigation · Bookings · Detail · Status
 *           Calendar · Charts · Stats · Reminder · Admin Notes
 *           Status Log · WA Templates · Utilities
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const SESSION_KEY        = 'memorlea_admin_login_at';
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 jam
const REMINDER_DAYS      = 3;

const STATUS = {
  label: {
    belum_dp: '🔴 Belum DP',
    sudah_dp: '🟡 Sudah DP',
    lunas:    '🟢 Lunas',
    selesai:  '🔵 Selesai',
  },
  color: {
    belum_dp: '#dc2626',
    sudah_dp: '#ca8a04',
    lunas:    '#16a34a',
    selesai:  '#2563eb',
  },
};

const PACKAGE = {
  luxury:     'Luxury Wedding',
  parelta:    'Parelta Package',
  tara:       'Tara Package',
  sean:       'Sean Package',
  prewedding: 'Pre-Wedding',
  nonwedding: 'Non-Wedding',
};

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const CHART_COLORS = [
  '#4A2545','#C9A96E','#C9B8D8','#7c3aed',
  '#2563eb','#16a34a','#dc2626','#ea580c',
];

// ─── State ────────────────────────────────────────────────────────────────────

let allBookings = [];
let editingId   = null;
let detailId    = null;
let calYear, calMonth;
let waTargetId  = null;

let charts = {};

// ─── Auth ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    clearSession();
    return redirect('admin-login.html');
  }

  const loginAt = localStorage.getItem(SESSION_KEY);

  if (loginAt && Date.now() - parseInt(loginAt) > SESSION_TIMEOUT_MS) {
    await db.auth.signOut();
    clearSession();
    return redirect('admin-login.html');
  }

  if (!loginAt) setSession();

  document.getElementById('admin-email').textContent = session.user.email;

  const now = new Date();
  calYear   = now.getFullYear();
  calMonth  = now.getMonth();

  scheduleAutoLogout(loginAt);
  await loadAll();
});

function setSession()   { localStorage.setItem(SESSION_KEY, Date.now().toString()); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function redirect(url)  { window.location.href = url; }

function scheduleAutoLogout(loginAt) {
  const elapsed   = loginAt ? Date.now() - parseInt(loginAt) : 0;
  const remaining = SESSION_TIMEOUT_MS - elapsed;
  if (remaining <= 0) return;
  setTimeout(async () => {
    await db.auth.signOut();
    clearSession();
    alert('Sesi habis. Silakan login kembali.');
    redirect('admin-login.html');
  }, remaining);
}

async function adminLogout() {
  await db.auth.signOut();
  clearSession();
  redirect('admin-login.html');
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function showSection(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));

  document.getElementById('sec-' + name).classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', bookings:  'Bookings',
    kalender:  'Kalender',  analytics: 'Analytics', stats: 'Stats Counter',
  };
  document.getElementById('section-title').textContent = titles[name] || name;

  if (name === 'analytics') renderAnalyticsCharts();
  if (name === 'kalender')  { renderCalendar(); renderAvailStats(); }
  if (name === 'kru')       loadKru();
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadAll() {
  await Promise.all([loadBookings(), loadStats(), loadKru()]);
}

async function loadBookings() {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[loadBookings]', error);
    setTableError(error.message);
    return;
  }

  allBookings = data || [];

  renderTable(allBookings);
  populateCityFilter();
  renderSummaryCards();
  renderDashboardCharts();
  updateBadge();
  renderReminders();
}

function setTableError(msg) {
  document.getElementById('bookings-tbody').innerHTML =
    `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:2rem">Error: ${msg}</td></tr>`;
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function renderSummaryCards() {
  const count = (status) => allBookings.filter(b => b.status === status).length;
  setText('card-total', allBookings.length);
  setText('card-belum', count('belum_dp'));
  setText('card-dp',    count('sudah_dp'));
  setText('card-lunas', count('lunas') + count('selesai'));
}

function updateBadge() {
  const n     = allBookings.filter(b => b.status === 'belum_dp').length;
  const badge = document.getElementById('badge-belum-dp');
  if (!badge) return;
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);
}

// ─── Bookings Table ───────────────────────────────────────────────────────────

function renderTable(data) {
  const tbody = document.getElementById('bookings-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--mid);padding:3rem">Tidak ada data booking.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(bookingRow).join('');
}

function bookingRow(b) {
  const tgl   = formatDate(b.wedding_date, { day:'numeric', month:'short', year:'numeric' });
  const color = STATUS.color[b.status] || '#888';
  const pkg   = PACKAGE[b.package] || b.package || '—';

  return `
    <tr style="cursor:pointer" onclick="openDetailModal('${b.id}')">
      <td>
        <strong>${esc(b.couple_name)}</strong>
        <div class="row-sub">${esc(b.email || '')}${b.phone ? ' · ' + esc(b.phone) : ''}</div>
      </td>
      <td>${tgl}</td>
      <td class="row-sub">${esc(pkg)}</td>
      <td>${esc(b.city || '—')}</td>
      <td>
        <span class="status-pill" style="background:${color}18;color:${color}">
          ${STATUS.label[b.status] || b.status}
        </span>
      </td>
      <td onclick="event.stopPropagation()">
        <div class="row-actions">
          <button class="action-btn action-edit" onclick="openEditModal('${b.id}')">✏️ Status</button>
          <button class="action-btn action-print" onclick="printInvoice('${b.id}')">🖨️</button>
          <button class="action-btn action-delete" onclick="deleteBooking('${b.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
}

function filterTable() {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('filter-status').value;
  const city   = document.getElementById('filter-city').value;
  const month  = document.getElementById('filter-month')?.value || '';

  const result = allBookings.filter(b => {
    const matchQ = !q || [b.couple_name, b.city, b.email, b.phone].some(v => v?.toLowerCase().includes(q));
    const matchS = !status || b.status === status;
    const matchC = !city   || b.city   === city;
    const matchM = !month  || b.wedding_date?.startsWith(month);
    return matchQ && matchS && matchC && matchM;
  });

  renderTable(result);
}

function populateCityFilter() {
  const cities = [...new Set(allBookings.map(b => b.city).filter(Boolean))].sort();
  const sel    = document.getElementById('filter-city');
  const cur    = sel.value;
  sel.innerHTML = `<option value="">Semua Kota</option>` +
    cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = cur;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function openDetailModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  detailId = id;

  const color   = STATUS.color[b.status] || '#888';
  const pkg     = PACKAGE[b.package] || b.package || '—';
  const tgl     = formatDate(b.wedding_date, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const created = b.created_at
    ? new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';

  setText('detail-couple-name', b.couple_name);
  document.getElementById('detail-status-badge').innerHTML =
    `<span class="status-pill" style="background:${color}18;color:${color}">${STATUS.label[b.status] || b.status}</span>`;

  setText('d-email',   b.email   || '—');
  setText('d-phone',   b.phone   || '—');
  setText('d-date',    tgl);
  setText('d-package', pkg);
  setText('d-city',    b.city    || '—');
  setText('d-venue',   b.venue   || '—');
  setText('d-source',  b.source  || '—');
  setText('d-created', created);
  setText('d-notes',   b.notes   || 'Tidak ada catatan.');

  const waLink = document.getElementById('d-wa-link');
  if (b.phone) {
    waLink.href         = `https://wa.me/${toWANumber(b.phone)}`;
    waLink.style.display = 'inline-flex';
  } else {
    waLink.style.display = 'none';
  }

  const adminNotesEl = document.getElementById('d-admin-notes');
  if (adminNotesEl) adminNotesEl.value = b.admin_notes || '';
  hideEl('admin-notes-saved');

  renderStatusLog(b.status_log || []);
  renderAssignedKru(id);
  openModal('detail-modal');
}

function closeDetailModal()      { closeModal('detail-modal'); detailId = null; }
function openEditFromDetail()    { const id = detailId; closeDetailModal(); openEditModal(id); }
function printInvoiceFromDetail(){ printInvoice(detailId); }

// ─── Edit Status Modal ────────────────────────────────────────────────────────

function openEditModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  setText('modal-name', b.couple_name);
  document.getElementById('modal-status').value = b.status || 'belum_dp';
  openModal('edit-modal');
}

function closeModal(id = 'edit-modal') {
  document.getElementById(id)?.classList.remove('open');
  if (id === 'edit-modal') editingId = null;
}

async function saveStatus() {
  if (!editingId) return;

  const newStatus = document.getElementById('modal-status').value;
  const b         = allBookings.find(b => b.id === editingId);
  if (!b) return;

  const logEntry = { from: b.status, to: newStatus, at: new Date().toISOString() };
  const newLog   = [...(b.status_log || []), logEntry];

  const { error } = await db
    .from('bookings')
    .update({ status: newStatus, status_log: newLog })
    .eq('id', editingId);

  if (error) { showToast('Gagal update status', 'error'); return; }

  const idx = allBookings.findIndex(b => b.id === editingId);
  if (idx !== -1) {
    allBookings[idx].status     = newStatus;
    allBookings[idx].status_log = newLog;
  }

  closeModal();
  filterTable();
  renderSummaryCards();
  renderDashboardCharts();
  renderCalendar();
  updateBadge();
  renderReminders();
  showToast('Status berhasil diupdate!');
}

// ─── Delete & Archive ─────────────────────────────────────────────────────────

async function deleteBooking(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b || !confirm(`Hapus booking "${b.couple_name}"?`)) return;

  const { error } = await db.from('bookings').delete().eq('id', id);
  if (error) { showToast('Gagal hapus', 'error'); return; }

  allBookings = allBookings.filter(b => b.id !== id);
  filterTable();
  populateCityFilter();
  renderSummaryCards();
  renderDashboardCharts();
  updateBadge();
  showToast('Booking dihapus.');
}

function confirmArchive()    { openModal('archive-modal'); }
function closeArchiveModal() { closeModal('archive-modal'); }

async function archiveAll() {
  const ids = allBookings.map(b => b.id);
  if (!ids.length) { closeArchiveModal(); return; }

  const { error } = await db.from('bookings').update({ archived: true }).in('id', ids);
  if (error) { showToast('Gagal archive', 'error'); return; }

  allBookings = [];
  renderTable([]);
  renderSummaryCards();
  renderDashboardCharts();
  updateBadge();
  closeArchiveModal();
  showToast('Semua data berhasil di-archive!');
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportToSheets() {
  if (!allBookings.length) { showToast('Tidak ada data.'); return; }

  const headers = ['Nama Pengantin','Email','No. HP','Tanggal Wedding','Paket','Kota','Venue','Catatan','Status','Tanggal Booking'];
  const rows    = allBookings.map(b => [
    b.couple_name || '', b.email || '', b.phone || '', b.wedding_date || '',
    PACKAGE[b.package] || b.package || '', b.city || '', b.venue || '', b.notes || '',
    STATUS.label[b.status] || b.status || '',
    b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : '',
  ]);

  const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const link = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })),
    download: `memorlea-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  link.click();
  showToast('Export CSV berhasil!');
}

// ─── Invoice Print ────────────────────────────────────────────────────────────

function printInvoice(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;

  const tgl    = formatDate(b.wedding_date, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const booked = b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '—';
  const pkg    = PACKAGE[b.package] || b.package || '—';

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
<title>Invoice – ${b.couple_name}</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #2E1530; padding: 0 20px; }
  .header { text-align: center; border-bottom: 2px solid #4A2545; padding-bottom: 20px; margin-bottom: 30px; }
  .brand { font-size: 2rem; font-style: italic; color: #4A2545; letter-spacing: 2px; }
  .brand span { font-size: 0.8rem; display: block; font-style: normal; letter-spacing: 4px; color: #C9A96E; margin-top: 4px; }
  h2 { font-size: 1rem; font-weight: normal; letter-spacing: 3px; text-transform: uppercase; color: #888; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  td { padding: 10px 0; border-bottom: 1px solid #f0e8f8; font-size: 0.9rem; }
  td:first-child { color: #888; width: 40%; }
  .footer { text-align: center; margin-top: 40px; font-size: 0.8rem; color: #aaa; }
</style></head><body>
<div class="header">
  <div class="brand">Memorléa<span>WEDDING CONTENT CREATOR</span></div>
  <h2>Invoice Booking</h2>
</div>
<table>
  <tr><td>Nama Pengantin</td><td><strong>${esc(b.couple_name)}</strong></td></tr>
  <tr><td>Email</td><td>${esc(b.email || '—')}</td></tr>
  <tr><td>No. HP</td><td>${esc(b.phone || '—')}</td></tr>
  <tr><td>Tanggal Wedding</td><td>${tgl}</td></tr>
  <tr><td>Paket</td><td><strong>${esc(pkg)}</strong></td></tr>
  <tr><td>Kota</td><td>${esc(b.city || '—')}</td></tr>
  <tr><td>Venue</td><td>${esc(b.venue || '—')}</td></tr>
  <tr><td>Catatan</td><td>${esc(b.notes || '—')}</td></tr>
  <tr><td>Status</td><td>${STATUS.label[b.status] || b.status}</td></tr>
  <tr><td>Tanggal Booking</td><td>${booked}</td></tr>
</table>
<div class="footer">
  <p>Terima kasih telah mempercayakan momen spesial Anda kepada Memorléa ✨</p>
  <p>@memorlea · wa.me/6285121148620</p>
</div>
<script>window.onload = () => window.print()<\/script>
</body></html>`);
  w.document.close();
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendar() {
  const grid  = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid) return;

  label.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

  // Map tanggal → bookings
  const bookingMap = {};
  allBookings.forEach(b => {
    if (!b.wedding_date) return;
    if (!bookingMap[b.wedding_date]) bookingMap[b.wedding_date] = [];
    bookingMap[b.wedding_date].push(b);
  });

  const DAY_LABELS   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const firstDay     = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev   = new Date(calYear, calMonth, 0).getDate();
  const todayStr     = toDateStr(new Date());

  let html = DAY_LABELS.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  // Hari bulan lalu
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${daysInPrev - i}</span></div>`;
  }

  // Hari bulan ini
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr    = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
    const dayBooks   = bookingMap[dateStr] || [];
    const isToday    = dateStr === todayStr;
    const hasBooking = dayBooks.length > 0;

    const chips = dayBooks.slice(0, 2).map(b => {
      const name = b.couple_name?.split('&')[0]?.trim() || b.couple_name;
      return `<div class="cal-booking-chip chip-${b.status}">${esc(name)}</div>`;
    }).join('') + (dayBooks.length > 2
      ? `<div class="cal-booking-chip chip-more">+${dayBooks.length - 2}</div>`
      : '');

    const cls     = ['cal-day', isToday ? 'today' : '', hasBooking ? 'has-booking' : ''].filter(Boolean).join(' ');
    const onclick = hasBooking ? `onclick="openCalModal('${dateStr}')"` : '';

    html += `<div class="${cls}" ${onclick}>
      <span class="cal-day-num">${d}</span>
      ${chips ? `<div class="cal-booking-dot">${chips}</div>` : ''}
    </div>`;
  }

  // Hari bulan depan
  const total     = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
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
  calYear   = now.getFullYear();
  calMonth  = now.getMonth();
  renderCalendar();
}

function openCalModal(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  setText('cal-modal-date', `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);

  const dayBooks = allBookings.filter(b => b.wedding_date === dateStr);
  document.getElementById('cal-modal-list').innerHTML = dayBooks.map(b => {
    const color = STATUS.color[b.status] || '#888';
    const pkg   = PACKAGE[b.package] || b.package || '—';
    return `
      <div class="cal-modal-item" onclick="closeCalModal(); openDetailModal('${b.id}')">
        <div class="cal-modal-item-header">
          <strong class="cal-modal-name">${esc(b.couple_name)}</strong>
          <span class="status-pill" style="background:${color}18;color:${color}">${STATUS.label[b.status] || b.status}</span>
        </div>
        <div class="cal-modal-sub">${esc(pkg)} · ${esc(b.city || '—')}</div>
        ${b.venue ? `<div class="cal-modal-sub">📍 ${esc(b.venue)}</div>` : ''}
      </div>`;
  }).join('');

  openModal('cal-modal');
}

function closeCalModal() { closeModal('cal-modal'); }

// ─── Availability Stats ───────────────────────────────────────────────────────

function renderAvailStats() {
  const now   = new Date();
  const thisM = now.getMonth();
  const thisY = now.getFullYear();
  const nextM = (thisM + 1) % 12;
  const nextY = thisM === 11 ? thisY + 1 : thisY;

  const countMonth = (y, m) => allBookings.filter(b => {
    if (!b.wedding_date) return false;
    const [by, bm] = b.wedding_date.split('-').map(Number);
    return by === y && bm - 1 === m;
  }).length;

  const upcoming = allBookings.filter(b =>
    b.wedding_date && new Date(b.wedding_date + 'T00:00:00') >= now
  ).length;

  setText('avail-bulan-ini',       countMonth(thisY, thisM));
  setText('avail-bulan-depan',     countMonth(nextY, nextM));
  setText('avail-total-mendatang', upcoming);
}

// ─── Stats Counter ────────────────────────────────────────────────────────────

async function loadStats() {
  const { data } = await db.from('stats').select('*').limit(1).single();
  if (!data) return;
  ['clients', 'vendors', 'cities', 'crew'].forEach(k => {
    const el = document.getElementById('stat-' + k);
    if (el) el.value = data[k] || 0;
  });
}

async function saveStats() {
  const payload = {
    clients: parseInt(document.getElementById('stat-clients').value) || 0,
    vendors: parseInt(document.getElementById('stat-vendors').value) || 0,
    cities:  parseInt(document.getElementById('stat-cities').value)  || 0,
    crew:    parseInt(document.getElementById('stat-crew').value)    || 0,
  };

  const { data: existing } = await db.from('stats').select('id').limit(1).single();
  const { error } = existing
    ? await db.from('stats').update(payload).eq('id', existing.id)
    : await db.from('stats').insert([payload]);

  if (error) { showToast('Gagal simpan stats', 'error'); return; }

  const msg = document.getElementById('stats-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
  showToast('Stats disimpan!');
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function getMonthlyData() {
  const map = {};
  allBookings.forEach(b => {
    if (!b.created_at) return;
    const key = new Date(b.created_at).toLocaleDateString('id-ID', { month:'short', year:'numeric' });
    map[key] = (map[key] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => new Date('1 ' + a[0]) - new Date('1 ' + b[0]));
  return { labels: sorted.map(e => e[0]), values: sorted.map(e => e[1]) };
}

function getPackageData() {
  const map = {};
  allBookings.forEach(b => {
    if (!b.package) return;
    const label = PACKAGE[b.package] || b.package;
    map[label] = (map[label] || 0) + 1;
  });
  return { labels: Object.keys(map), values: Object.values(map) };
}

function getCityData() {
  const map = {};
  allBookings.forEach(b => { if (b.city) map[b.city] = (map[b.city] || 0) + 1; });
  const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { labels: top.map(e => e[0]), values: top.map(e => e[1]) };
}

function makeChart(id, type, data, options = {}) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), { type, data, options });
}

function renderDashboardCharts() {
  const m = getMonthlyData();
  const p = getPackageData();
  const c = getCityData();

  makeChart('chart-monthly', 'bar', {
    labels:   m.labels,
    datasets: [{ label: 'Booking', data: m.values, backgroundColor: '#4A254580', borderColor: '#4A2545', borderWidth: 2, borderRadius: 6 }],
  }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

  makeChart('chart-packages', 'doughnut', {
    labels:   p.labels,
    datasets: [{ data: p.values, backgroundColor: CHART_COLORS }],
  }, { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });

  makeChart('chart-cities', 'bar', {
    labels:   c.labels,
    datasets: [{ data: c.values, backgroundColor: '#C9A96E80', borderColor: '#C9A96E', borderWidth: 2, borderRadius: 4 }],
  }, { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } });
}

function renderAnalyticsCharts() {
  const m = getMonthlyData();
  const p = getPackageData();
  const c = getCityData();

  makeChart('chart-monthly-2', 'line', {
    labels:   m.labels,
    datasets: [{ label: 'Booking', data: m.values, borderColor: '#4A2545', backgroundColor: '#4A254520', fill: true, tension: 0.4, pointBackgroundColor: '#4A2545' }],
  }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

  makeChart('chart-packages-2', 'pie', {
    labels:   p.labels,
    datasets: [{ data: p.values, backgroundColor: CHART_COLORS }],
  }, { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });

  makeChart('chart-cities-2', 'bar', {
    labels:   c.labels,
    datasets: [{ data: c.values, backgroundColor: CHART_COLORS }],
  }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });
}

// ─── Reminder ─────────────────────────────────────────────────────────────────

function renderReminders() {
  const wrap = document.getElementById('reminder-wrap');
  const list = document.getElementById('reminder-list');
  if (!wrap || !list) return;

  const cutoff  = REMINDER_DAYS * 24 * 60 * 60 * 1000;
  const overdue = allBookings.filter(b =>
    b.status === 'belum_dp' && b.created_at &&
    Date.now() - new Date(b.created_at).getTime() > cutoff
  );

  wrap.style.display = overdue.length ? 'block' : 'none';
  if (!overdue.length) return;

  list.innerHTML = overdue.map(b => {
    const days = Math.floor((Date.now() - new Date(b.created_at).getTime()) / (24 * 60 * 60 * 1000));
    const tgl  = formatDate(b.wedding_date, { day:'numeric', month:'short', year:'numeric' });
    const wa   = b.phone ? toWANumber(b.phone) : null;

    return `
      <div class="reminder-item">
        <div>
          <strong class="reminder-name">${esc(b.couple_name)}</strong>
          <span class="reminder-days">${days} hari lalu</span>
          <div class="reminder-sub">Wedding: ${tgl} · ${esc(b.city || '—')}</div>
        </div>
        <div class="reminder-actions">
          ${wa ? `<a href="https://wa.me/${wa}" target="_blank" class="action-btn action-wa">💬 WA</a>` : ''}
          <button class="action-btn action-edit" onclick="openDetailModal('${b.id}')">Detail</button>
        </div>
      </div>`;
  }).join('');
}

// ─── Admin Notes ──────────────────────────────────────────────────────────────

async function saveAdminNotes() {
  if (!detailId) return;

  const notes   = document.getElementById('d-admin-notes').value;
  const { error } = await db.from('bookings').update({ admin_notes: notes }).eq('id', detailId);

  if (error) { showToast('Gagal simpan catatan', 'error'); return; }

  const idx = allBookings.findIndex(b => b.id === detailId);
  if (idx !== -1) allBookings[idx].admin_notes = notes;

  showEl('admin-notes-saved');
  setTimeout(() => hideEl('admin-notes-saved'), 2500);
}

// ─── Status Log ───────────────────────────────────────────────────────────────

function renderStatusLog(log) {
  const el = document.getElementById('d-status-log');
  if (!el) return;

  if (!log?.length) {
    el.innerHTML = '<span class="log-empty">Belum ada riwayat perubahan status.</span>';
    return;
  }

  el.innerHTML = [...log].reverse().map(entry => {
    const time      = new Date(entry.at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const fromColor = STATUS.color[entry.from] || '#888';
    const toColor   = STATUS.color[entry.to]   || '#888';

    return `
      <div class="log-entry">
        <span class="status-pill sm" style="background:${fromColor}18;color:${fromColor}">${STATUS.label[entry.from] || entry.from}</span>
        <span class="log-arrow">→</span>
        <span class="status-pill sm" style="background:${toColor}18;color:${toColor}">${STATUS.label[entry.to] || entry.to}</span>
        <span class="log-time">${time}</span>
      </div>`;
  }).join('');
}

// ─── WA Templates ─────────────────────────────────────────────────────────────

function openWATemplate() {
  waTargetId = detailId;
  const b    = allBookings.find(b => b.id === detailId);
  if (!b) return;

  if (b.phone) {
    document.getElementById('wa-template-send').href = `https://wa.me/${toWANumber(b.phone)}`;
  }

  document.getElementById('wa-template-text').value = '';
  openModal('wa-template-modal');
}

function closeWATemplate() { closeModal('wa-template-modal'); }

function fillTemplate(type) {
  const b = allBookings.find(b => b.id === waTargetId);
  if (!b) return;

  const nama  = b.couple_name || '';
  const tgl   = formatDate(b.wedding_date, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const paket = PACKAGE[b.package] || b.package || '—';

  const templates = {
    konfirmasi_dp:
`Halo ${nama}!

Terima kasih sudah menghubungi Memorlea Wedding Content Creator.

Untuk konfirmasi booking, mohon melakukan pembayaran DP 50% ke:
Bank BCA: XXXX-XXXX-XXXX
a.n. Alia Rahmah

Detail booking:
- Paket   : ${paket}
- Tanggal : ${tgl}

Setelah transfer, mohon kirim bukti pembayaran ke sini ya.

Sampai jumpa di hari istimewa kalian!`,

    pelunasan:
`Halo ${nama}!

Mengingatkan bahwa pelunasan biaya layanan Memorlea belum kami terima.

Detail:
- Paket   : ${paket}
- Wedding : ${tgl}

Mohon pelunasan dilakukan maksimal H-3 sebelum acara ya.

Terima kasih!`,

    reminder_h7:
`Halo ${nama}!

Tinggal 7 hari lagi menuju hari bahagia kalian!

Mohon kirimkan:
1. Rundown acara final
2. Referensi konten yang diinginkan
3. Konfirmasi vendor/WO terkait

Sampai jumpa ${tgl}!`,

    terimakasih:
`Halo ${nama}!

Terima kasih sudah mempercayakan momen spesial kalian kepada Memorlea.

Semua file unedited akan dikirim via Google Drive dalam 48 jam ya.

Jika puas dengan layanan kami, boleh share pengalaman kalian di IG story?

Selamat menempuh hidup baru! @memorlea`,
  };

  const text = templates[type] || '';
  document.getElementById('wa-template-text').value = text;

  const num = b.phone ? toWANumber(b.phone) : '6285121148620';
  document.getElementById('wa-template-send').href = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

async function copyWATemplate() {
  const text = document.getElementById('wa-template-text').value;
  if (!text) { showToast('Template kosong'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Template berhasil di-copy!');
  } catch {
    showToast('Copy gagal, coba manual', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('wa-template-text');
  if (!ta) return;
  ta.addEventListener('input', () => {
    const b   = allBookings.find(b => b.id === waTargetId);
    const num = b?.phone ? toWANumber(b.phone) : '6285121148620';
    document.getElementById('wa-template-send').href = `https://wa.me/${num}?text=${encodeURIComponent(ta.value)}`;
  });
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showEl(id) { const el = document.getElementById(id); if (el) el.style.display = 'inline'; }
function hideEl(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }

function formatDate(dateStr, opts) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', opts);
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(n)         { return String(n).padStart(2, '0'); }
function toWANumber(ph) { return ph.replace(/\D/g, '').replace(/^0/, '62'); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent  = msg;
  t.style.background = type === 'error' ? '#dc2626' : '#4A2545';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Modal Overlay Close ──────────────────────────────────────────────────────

['detail-modal', 'edit-modal', 'archive-modal', 'cal-modal', 'wa-template-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) closeModal(id);
  });
});

// ═══════════════════════════════════════════════════════════════
// MANAJEMEN KRU
// ═══════════════════════════════════════════════════════════════

// ─── State Kru ────────────────────────────────────────────────
let allKru         = [];
let editingKruId   = null;
let detailKruId    = null;
let assignBookingId = null;

// ─── Load Kru ─────────────────────────────────────────────────
async function loadKru() {
  const { data, error } = await db
    .from('crew')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[loadKru]', error);
    return;
  }

  allKru = data || [];
  renderKruTable(allKru);
  renderKruCards();
  updateKruBadge();
}

// ─── Kru Cards ────────────────────────────────────────────────
function renderKruCards() {
  setText('kru-total',   allKru.length);
  setText('kru-aktif',   allKru.filter(k => k.status === 'aktif').length);
  setText('kru-nonaktif',allKru.filter(k => k.status === 'nonaktif').length);
}

function updateKruBadge() {
  const n     = allKru.filter(k => k.status === 'aktif').length;
  const badge = document.getElementById('badge-kru-aktif');
  if (!badge) return;
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);
}

// ─── Kru Table ────────────────────────────────────────────────
async function renderKruTable(data) {
  const tbody = document.getElementById('kru-tbody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--mid);padding:3rem">Belum ada data kru. Klik "+ Tambah Kru" untuk menambahkan.</td></tr>`;
    return;
  }

  // Load semua assignments sekaligus
  const { data: assignments } = await db
    .from('crew_assignments')
    .select('crew_id, booking_id, bookings(couple_name, wedding_date, city)')
    .order('booking_id');

  const now = new Date();

  tbody.innerHTML = data.map(k => {
    // Jadwal mendatang kru ini
    const jadwal = (assignments || [])
      .filter(a => a.crew_id === k.id && a.bookings?.wedding_date && new Date(a.bookings.wedding_date + 'T00:00:00') >= now)
      .sort((a, b) => new Date(a.bookings.wedding_date) - new Date(b.bookings.wedding_date));

    const jadwalChip = jadwal.length === 0
      ? `<span class="kru-schedule-chip free">✓ Tersedia</span>`
      : `<span class="kru-schedule-chip">${jadwal.length} booking mendatang</span>`;

    const statusClass = k.status === 'aktif' ? 'status-kru-aktif' : 'status-kru-nonaktif';

    return `
      <tr style="cursor:pointer" onclick="openKruDetailModal('${k.id}')">
        <td>
          <div class="kru-name-wrap">
            <div class="kru-avatar">${k.name.charAt(0)}</div>
            <div>
              <strong>${esc(k.name)}</strong>
              <div class="row-sub">${esc(k.phone || '—')}</div>
            </div>
          </div>
        </td>
        <td>${esc(k.city || '—')}</td>
        <td class="row-sub">${esc(k.role || '—')}</td>
        <td><span class="${statusClass}">${k.status}</span></td>
        <td>${jadwalChip}</td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="action-btn action-edit" onclick="openEditKruModal('${k.id}')">✏️ Edit</button>
            <button class="action-btn action-delete" onclick="deleteKru('${k.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterKru() {
  const status = document.getElementById('filter-kru-status').value;
  const filtered = status ? allKru.filter(k => k.status === status) : allKru;
  renderKruTable(filtered);
}

// ─── Tambah / Edit Kru Modal ──────────────────────────────────
function openAddKruModal() {
  editingKruId = null;
  setText('kru-modal-title', 'Tambah Kru');
  document.getElementById('kru-name').value  = '';
  document.getElementById('kru-phone').value = '';
  document.getElementById('kru-city').value  = '';
  document.getElementById('kru-role').value  = 'Content Creator';
  document.getElementById('kru-status').value = 'aktif';
  document.getElementById('kru-notes').value = '';
  openModal('kru-modal');
}

function openEditKruModal(id) {
  const k = allKru.find(k => k.id === id);
  if (!k) return;
  editingKruId = id;
  setText('kru-modal-title', 'Edit Kru');
  document.getElementById('kru-name').value   = k.name || '';
  document.getElementById('kru-phone').value  = k.phone || '';
  document.getElementById('kru-city').value   = k.city || '';
  document.getElementById('kru-role').value   = k.role || 'Content Creator';
  document.getElementById('kru-status').value = k.status || 'aktif';
  document.getElementById('kru-notes').value  = k.notes || '';
  openModal('kru-modal');
}

function closeKruModal() { closeModal('kru-modal'); editingKruId = null; }

async function saveKru() {
  const name = document.getElementById('kru-name').value.trim();
  if (!name) { showToast('Nama kru wajib diisi', 'error'); return; }

  const payload = {
    name:   name,
    phone:  document.getElementById('kru-phone').value.trim(),
    city:   document.getElementById('kru-city').value,
    role:   document.getElementById('kru-role').value,
    status: document.getElementById('kru-status').value,
    notes:  document.getElementById('kru-notes').value.trim(),
  };

  let error;
  if (editingKruId) {
    ({ error } = await db.from('crew').update(payload).eq('id', editingKruId));
  } else {
    ({ error } = await db.from('crew').insert([payload]));
  }

  if (error) { showToast('Gagal simpan data kru', 'error'); return; }

  closeKruModal();
  await loadKru();
  showToast(editingKruId ? 'Data kru berhasil diupdate!' : 'Kru baru berhasil ditambahkan!');
}

// ─── Delete Kru ───────────────────────────────────────────────
async function deleteKru(id) {
  const k = allKru.find(k => k.id === id);
  if (!k || !confirm(`Hapus kru "${k.name}"? Semua assignment-nya juga akan dihapus.`)) return;

  const { error } = await db.from('crew').delete().eq('id', id);
  if (error) { showToast('Gagal hapus kru', 'error'); return; }

  await loadKru();
  showToast('Kru berhasil dihapus.');
}

// ─── Detail Kru Modal ─────────────────────────────────────────
async function openKruDetailModal(id) {
  const k = allKru.find(k => k.id === id);
  if (!k) return;
  detailKruId = id;

  setText('kru-detail-avatar', k.name.charAt(0));
  setText('kru-detail-name',   k.name);
  setText('kru-detail-role',   k.role || '—');
  setText('kru-detail-phone',  k.phone || '—');
  setText('kru-detail-city',   k.city || '—');

  const statusEl = document.getElementById('kru-detail-status');
  statusEl.innerHTML = `<span class="${k.status === 'aktif' ? 'status-kru-aktif' : 'status-kru-nonaktif'}">${k.status}</span>`;

  // Load jadwal kru
  const { data: assignments } = await db
    .from('crew_assignments')
    .select('booking_id, bookings(id, couple_name, wedding_date, city, package, status)')
    .eq('crew_id', id)
    .order('booking_id');

  const now    = new Date();
  const jadwal = (assignments || [])
    .filter(a => a.bookings?.wedding_date)
    .sort((a, b) => new Date(a.bookings.wedding_date) - new Date(b.bookings.wedding_date));

  const mendatang = jadwal.filter(a => new Date(a.bookings.wedding_date + 'T00:00:00') >= now);

  setText('kru-detail-total-jadwal', `${mendatang.length} mendatang · ${jadwal.length} total`);

  const jadwalEl = document.getElementById('kru-detail-jadwal');
  if (!mendatang.length) {
    jadwalEl.innerHTML = `<p style="font-size:0.82rem;color:var(--mid)">Tidak ada jadwal mendatang.</p>`;
  } else {
    jadwalEl.innerHTML = mendatang.map(a => {
      const b   = a.bookings;
      const tgl = formatDate(b.wedding_date, { weekday:'short', day:'numeric', month:'short', year:'numeric' });
      const pkg = PACKAGE[b.package] || b.package || '—';
      const col = STATUS.color[b.status] || '#888';
      return `
        <div class="kru-jadwal-item">
          <strong>${esc(b.couple_name)}</strong>
          <span style="background:${col}18;color:${col};padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:600;margin-left:6px">${STATUS.label[b.status] || b.status}</span>
          <div style="color:var(--mid);font-size:0.78rem;margin-top:2px">📅 ${tgl} · 📍 ${esc(b.city || '—')} · ${esc(pkg)}</div>
        </div>`;
    }).join('');
  }

  // WA link
  const waLink = document.getElementById('kru-detail-wa');
  if (k.phone) {
    waLink.href         = `https://wa.me/${toWANumber(k.phone)}`;
    waLink.style.display = 'inline-flex';
  } else {
    waLink.style.display = 'none';
  }

  openModal('kru-detail-modal');
}

function closeKruDetailModal() { closeModal('kru-detail-modal'); detailKruId = null; }

function editKruFromDetail() {
  const id = detailKruId;
  closeKruDetailModal();
  openEditKruModal(id);
}

async function deleteKruFromDetail() {
  const id = detailKruId;
  closeKruDetailModal();
  await deleteKru(id);
}

// ─── Assign Kru ke Booking ────────────────────────────────────
async function openAssignKruModal() {
  if (!detailId) return;
  const b = allBookings.find(b => b.id === detailId);
  if (!b) return;
  assignBookingId = detailId;

  // Tutup detail modal dulu supaya tidak overlap
  closeModal('detail-modal');

  setText('assign-booking-name', b.couple_name);
  setText('assign-booking-date', formatDate(b.wedding_date, { weekday:'long', day:'numeric', month:'long', year:'numeric' }) + (b.city ? ` · ${b.city}` : ''));

  // Load kru yang sudah di-assign ke booking ini
  const { data: existing } = await db
    .from('crew_assignments')
    .select('crew_id')
    .eq('booking_id', detailId);

  const assignedIds = new Set((existing || []).map(a => a.crew_id));

  // Load semua kru aktif + cek conflict tanggal
  const { data: allAssignments } = await db
    .from('crew_assignments')
    .select('crew_id, bookings(wedding_date)')
    .neq('booking_id', detailId);

  const conflictMap = {};
  (allAssignments || []).forEach(a => {
    if (a.bookings?.wedding_date === b.wedding_date) {
      conflictMap[a.crew_id] = true;
    }
  });

  const listEl = document.getElementById('assign-kru-list');
  const kruAktif = allKru.filter(k => k.status === 'aktif');

  if (!kruAktif.length) {
    listEl.innerHTML = `<p style="font-size:0.85rem;color:var(--mid)">Tidak ada kru aktif.</p>`;
  } else {
    listEl.innerHTML = kruAktif.map(k => {
      const isAssigned = assignedIds.has(k.id);
      const hasConflict = conflictMap[k.id] && !isAssigned;
      return `
        <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1.5px solid ${isAssigned ? 'var(--plum)' : hasConflict ? '#fca5a5' : 'var(--lavender)'};cursor:pointer;background:${isAssigned ? 'var(--lavender-lt)' : hasConflict ? '#fff5f5' : 'white'}">
          <input type="checkbox" value="${k.id}" ${isAssigned ? 'checked' : ''} ${hasConflict ? 'disabled' : ''} style="accent-color:var(--plum);width:16px;height:16px"/>
          <div class="kru-avatar" style="width:32px;height:32px;font-size:0.9rem">${k.name.charAt(0)}</div>
          <div style="flex:1">
            <strong style="font-size:0.88rem">${esc(k.name)}</strong>
            <span style="font-size:0.75rem;color:var(--mid);margin-left:6px">${esc(k.city || '')} · ${esc(k.role || '')}</span>
            ${hasConflict ? '<div style="font-size:0.72rem;color:#dc2626;margin-top:2px">⚠ Sudah ada booking di tanggal ini</div>' : ''}
          </div>
        </label>`;
    }).join('');
  }

  openModal('assign-kru-modal');
}

function closeAssignKruModal() { closeModal('assign-kru-modal'); assignBookingId = null; }

async function saveAssignKru() {
  if (!assignBookingId) return;

  const checkboxes = document.querySelectorAll('#assign-kru-list input[type="checkbox"]:not([disabled])');
  const selectedIds = [...checkboxes].filter(c => c.checked).map(c => c.value);
  const uncheckedIds = [...checkboxes].filter(c => !c.checked).map(c => c.value);

  // Hapus yang di-uncheck
  if (uncheckedIds.length) {
    await db.from('crew_assignments')
      .delete()
      .eq('booking_id', assignBookingId)
      .in('crew_id', uncheckedIds);
  }

  // Insert yang baru di-check (upsert)
  if (selectedIds.length) {
    const rows = selectedIds.map(crew_id => ({ booking_id: assignBookingId, crew_id }));
    await db.from('crew_assignments').upsert(rows, { onConflict: 'booking_id,crew_id' });
  }

  const savedId = assignBookingId;
  closeAssignKruModal();
  await loadKru();
  showToast('Kru berhasil di-assign!');

  // Kirim notif WA ke kru yang baru di-assign
  const b = allBookings.find(b => b.id === savedId);
  if (b && selectedIds.length) {
    sendKruWANotif(selectedIds, b);
  }

  // Buka kembali detail booking supaya kru yang di-assign kelihatan
  openDetailModal(savedId);
}

// ─── Render Assigned Kru di Detail Booking ───────────────────
async function renderAssignedKru(bookingId) {
  const el = document.getElementById('d-assigned-kru');
  if (!el) return;

  const { data } = await db
    .from('crew_assignments')
    .select('crew_id, crew(name, phone, status)')
    .eq('booking_id', bookingId);

  if (!data || !data.length) {
    el.innerHTML = `<span style="font-size:0.82rem;color:var(--mid)">Belum ada kru ditugaskan.</span>`;
    return;
  }

  el.innerHTML = data.map(a => {
    const k = a.crew;
    if (!k) return '';
    return `
      <div style="display:inline-flex;align-items:center;gap:6px;background:var(--lavender-lt);padding:4px 10px;border-radius:20px">
        <div style="width:22px;height:22px;border-radius:50%;background:var(--plum);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700">${k.name.charAt(0)}</div>
        <span style="font-size:0.8rem;font-weight:600;color:var(--plum)">${esc(k.name)}</span>
      </div>`;
  }).join('');
}

// ─── Notifikasi WA ke Kru ────────────────────────────────────
function sendKruWANotif(kruIds, booking) {
  const tgl = formatDate(booking.wedding_date, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const pkg = PACKAGE[booking.package] || booking.package || '—';

  kruIds.forEach(id => {
    const k = allKru.find(k => k.id === id);
    if (!k?.phone) return;

    const msg =
      `Halo ${k.name}!\n\n` +
      `Kamu mendapatkan assignment baru dari Memorlea:\n\n` +
      `Detail Acara:\n` +
      `- Klien  : ${booking.couple_name}\n` +
      `- Tanggal: ${tgl}\n` +
      `- Paket  : ${pkg}\n` +
      `- Kota   : ${booking.city || '—'}\n` +
      (booking.venue ? `- Venue  : ${booking.venue}\n` : '') +
      `\nMohon konfirmasi kehadiranmu ya. Terima kasih!\n\nMemorlaa`;

    const url = `https://wa.me/${toWANumber(k.phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });
}

// ─── Overlay close untuk modal kru ──────────────────────────
['kru-modal','kru-detail-modal','assign-kru-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) closeModal(id);
  });
});