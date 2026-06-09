// ─── State ───────────────────────────────────────────────────────────────────
let allBookings = [];
let editingId = null;
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

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'admin-login.html'; return; }

  document.getElementById('admin-email').textContent = session.user.email;
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

// ─── Section Navigation ───────────────────────────────────────────────────────
function showSection(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('section-title').textContent = {
    dashboard: 'Dashboard',
    bookings:  'Bookings',
    analytics: 'Analytics',
    stats:     'Stats Counter',
  }[name];

  if (name === 'analytics') renderAnalyticsCharts();
}

// ─── Load Bookings ────────────────────────────────────────────────────────────
async function loadBookings() {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[loadBookings error]', error);
    showToast('Gagal memuat booking: ' + (error.message || error.code), 'error');
    document.getElementById('bookings-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:2rem">Error: ' + error.message + '</td></tr>';
    return;
  }

  allBookings = data || [];
  renderTable(allBookings);
  populateCityFilter();
  renderSummaryCards();
  renderDashboardCharts();
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function renderSummaryCards() {
  const total    = allBookings.length;
  const belum    = allBookings.filter(b => b.status === 'belum_dp').length;
  const dp       = allBookings.filter(b => b.status === 'sudah_dp').length;
  const lunasSelesai = allBookings.filter(b => b.status === 'lunas' || b.status === 'selesai').length;

  document.getElementById('card-total').textContent = total;
  document.getElementById('card-belum').textContent = belum;
  document.getElementById('card-dp').textContent    = dp;
  document.getElementById('card-lunas').textContent = lunasSelesai;
}

// ─── Table ────────────────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('bookings-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mid);padding:3rem">Tidak ada data booking.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(b => {
    const tgl = b.wedding_date ? new Date(b.wedding_date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '—';
    const color = STATUS_COLOR[b.status] || '#888';
    return `
      <tr>
        <td>
          <strong>${esc(b.couple_name)}</strong>
          <div style="font-size:0.75rem;color:var(--mid);margin-top:2px">${esc(b.email || '')} · ${esc(b.phone || '')}</div>
        </td>
        <td>${tgl}</td>
        <td>${esc(b.package || '—')}</td>
        <td>${esc(b.city || '—')}</td>
        <td>
          <span style="background:${color}18;color:${color};padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600">
            ${STATUS_LABEL[b.status] || b.status}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="action-btn action-edit" onclick="openEditModal('${b.id}')">✏️ Status</button>
            <button class="action-btn" style="background:#f0fdf4;color:#16a34a" onclick="printInvoice('${b.id}')">🖨️ Invoice</button>
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
    const matchQ    = !q || b.couple_name?.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q);
    const matchS    = !status || b.status === status;
    const matchC    = !city || b.city === city;
    return matchQ && matchS && matchC;
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function openEditModal(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('modal-name').textContent = b.couple_name;
  document.getElementById('modal-status').value = b.status || 'belum_dp';
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editingId = null;
}

async function saveStatus() {
  if (!editingId) return;
  const status = document.getElementById('modal-status').value;

  const { error } = await db
    .from('bookings')
    .update({ status })
    .eq('id', editingId);

  if (error) { showToast('Gagal update status', 'error'); return; }

  const idx = allBookings.findIndex(b => b.id === editingId);
  if (idx !== -1) allBookings[idx].status = status;

  closeModal();
  filterTable();
  renderSummaryCards();
  renderDashboardCharts();
  showToast('Status berhasil diupdate!');
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteBooking(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;
  if (!confirm(`Hapus booking "${b.couple_name}"? Aksi ini tidak bisa dibatalkan.`)) return;

  const { error } = await db.from('bookings').delete().eq('id', id);
  if (error) { showToast('Gagal menghapus booking', 'error'); return; }

  allBookings = allBookings.filter(b => b.id !== id);
  filterTable();
  populateCityFilter();
  renderSummaryCards();
  renderDashboardCharts();
  showToast('Booking berhasil dihapus.');
}

// ─── Archive ──────────────────────────────────────────────────────────────────
function confirmArchive() {
  document.getElementById('archive-modal').classList.add('open');
}

function closeArchiveModal() {
  document.getElementById('archive-modal').classList.remove('open');
}

async function archiveAll() {
  const ids = allBookings.map(b => b.id);
  if (!ids.length) { closeArchiveModal(); showToast('Tidak ada data untuk di-archive.'); return; }

  const { error } = await db
    .from('bookings')
    .update({ archived: true })
    .in('id', ids);

  if (error) { showToast('Gagal archive data', 'error'); return; }

  allBookings = [];
  renderTable([]);
  renderSummaryCards();
  renderDashboardCharts();
  closeArchiveModal();
  showToast('Semua data berhasil di-archive!');
}

// ─── Export Google Sheets ─────────────────────────────────────────────────────
function exportToSheets() {
  if (!allBookings.length) { showToast('Tidak ada data untuk di-export.'); return; }

  const headers = ['Nama Pengantin', 'Email', 'No. HP', 'Tanggal Wedding', 'Paket', 'Kota', 'Venue', 'Catatan', 'Status', 'Tanggal Booking'];
  const rows = allBookings.map(b => [
    b.couple_name || '',
    b.email || '',
    b.phone || '',
    b.wedding_date || '',
    b.package || '',
    b.city || '',
    b.venue || '',
    b.notes || '',
    STATUS_LABEL[b.status] || b.status || '',
    b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : '',
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `memorlea-bookings-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV berhasil! Buka via Google Sheets > Import.');
}

// ─── Invoice / Print ──────────────────────────────────────────────────────────
function printInvoice(id) {
  const b = allBookings.find(b => b.id === id);
  if (!b) return;

  const tgl = b.wedding_date ? new Date(b.wedding_date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '—';
  const booked = b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '—';

  const html = `
    <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
    <title>Invoice – ${b.couple_name}</title>
    <style>
      body { font-family: 'Georgia', serif; max-width: 680px; margin: 40px auto; color: #2E1530; padding: 0 20px; }
      .header { text-align:center; border-bottom: 2px solid #4A2545; padding-bottom: 20px; margin-bottom: 30px; }
      .brand { font-size: 2rem; font-style: italic; color: #4A2545; letter-spacing: 2px; }
      .brand span { font-size: 0.8rem; display:block; font-style: normal; letter-spacing: 4px; color: #C9A96E; margin-top: 4px; }
      h2 { font-size: 1rem; font-weight: normal; letter-spacing: 3px; text-transform: uppercase; color: #888; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      td { padding: 10px 0; border-bottom: 1px solid #f0e8f8; font-size: 0.9rem; }
      td:first-child { color: #888; width: 40%; }
      .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: bold; background: #f0fdf4; color: #16a34a; }
      .footer { text-align: center; margin-top: 40px; font-size: 0.8rem; color: #aaa; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <div class="header">
      <div class="brand">Memorléa <span>WEDDING CONTENT CREATOR</span></div>
      <h2>Invoice Booking</h2>
    </div>
    <table>
      <tr><td>Nama Pengantin</td><td><strong>${esc(b.couple_name)}</strong></td></tr>
      <tr><td>Email</td><td>${esc(b.email || '—')}</td></tr>
      <tr><td>No. HP</td><td>${esc(b.phone || '—')}</td></tr>
      <tr><td>Tanggal Wedding</td><td>${tgl}</td></tr>
      <tr><td>Paket</td><td><strong>${esc(b.package || '—')}</strong></td></tr>
      <tr><td>Kota</td><td>${esc(b.city || '—')}</td></tr>
      <tr><td>Venue</td><td>${esc(b.venue || '—')}</td></tr>
      <tr><td>Catatan</td><td>${esc(b.notes || '—')}</td></tr>
      <tr><td>Status Pembayaran</td><td><span class="status-badge">${STATUS_LABEL[b.status] || b.status}</span></td></tr>
      <tr><td>Tanggal Booking</td><td>${booked}</td></tr>
    </table>
    <div class="footer">
      <p>Terima kasih telah mempercayakan momen spesial Anda kepada Memorléa ✨</p>
      <p>@memorlea · wa.me/6285121148620</p>
    </div>
    <script>window.onload=()=>{ window.print(); }</script>
    </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ─── Stats Counter ────────────────────────────────────────────────────────────
async function loadStats() {
  const { data } = await db.from('stats').select('*').limit(1).single();
  if (!data) return;
  document.getElementById('stat-clients').value = data.clients || 0;
  document.getElementById('stat-vendors').value = data.vendors || 0;
  document.getElementById('stat-cities').value  = data.cities  || 0;
  document.getElementById('stat-crew').value    = data.crew    || 0;
}

async function saveStats() {
  const payload = {
    clients: parseInt(document.getElementById('stat-clients').value) || 0,
    vendors: parseInt(document.getElementById('stat-vendors').value) || 0,
    cities:  parseInt(document.getElementById('stat-cities').value)  || 0,
    crew:    parseInt(document.getElementById('stat-crew').value)    || 0,
  };

  const { data: existing } = await db.from('stats').select('id').limit(1).single();

  let error;
  if (existing) {
    ({ error } = await db.from('stats').update(payload).eq('id', existing.id));
  } else {
    ({ error } = await db.from('stats').insert([payload]));
  }

  if (error) { showToast('Gagal menyimpan stats', 'error'); return; }

  const msg = document.getElementById('stats-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
  showToast('Stats berhasil disimpan!');
}

// ─── Charts ───────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#4A2545', '#C9A96E', '#C9B8D8', '#7c3aed', '#2563eb', '#16a34a', '#dc2626'];

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
  allBookings.forEach(b => { if (b.package) map[b.package] = (map[b.package] || 0) + 1; });
  return { labels: Object.keys(map), values: Object.values(map) };
}

function getCityData() {
  const map = {};
  allBookings.forEach(b => { if (b.city) map[b.city] = (map[b.city] || 0) + 1; });
  const top = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 8);
  return { labels: top.map(e => e[0]), values: top.map(e => e[1]) };
}

function renderDashboardCharts() {
  const monthly  = getMonthlyData();
  const packages = getPackageData();
  const cities   = getCityData();

  if (chartMonthly) chartMonthly.destroy();
  chartMonthly = new Chart(document.getElementById('chart-monthly'), {
    type: 'bar',
    data: { labels: monthly.labels, datasets: [{ label: 'Booking', data: monthly.values, backgroundColor: '#4A254580', borderColor: '#4A2545', borderWidth: 2, borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  if (chartPackages) chartPackages.destroy();
  chartPackages = new Chart(document.getElementById('chart-packages'), {
    type: 'doughnut',
    data: { labels: packages.labels, datasets: [{ data: packages.values, backgroundColor: CHART_COLORS }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });

  if (chartCities) chartCities.destroy();
  chartCities = new Chart(document.getElementById('chart-cities'), {
    type: 'bar',
    data: { labels: cities.labels, datasets: [{ data: cities.values, backgroundColor: '#C9A96E80', borderColor: '#C9A96E', borderWidth: 2, borderRadius: 4 }] },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function renderAnalyticsCharts() {
  const monthly  = getMonthlyData();
  const packages = getPackageData();
  const cities   = getCityData();

  if (chartMonthly2) chartMonthly2.destroy();
  chartMonthly2 = new Chart(document.getElementById('chart-monthly-2'), {
    type: 'line',
    data: { labels: monthly.labels, datasets: [{ label: 'Booking', data: monthly.values, borderColor: '#4A2545', backgroundColor: '#4A254520', fill: true, tension: 0.4, pointBackgroundColor: '#4A2545' }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  if (chartPackages2) chartPackages2.destroy();
  chartPackages2 = new Chart(document.getElementById('chart-packages-2'), {
    type: 'pie',
    data: { labels: packages.labels, datasets: [{ data: packages.values, backgroundColor: CHART_COLORS }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });

  if (chartCities2) chartCities2.destroy();
  chartCities2 = new Chart(document.getElementById('chart-cities-2'), {
    type: 'bar',
    data: { labels: cities.labels, datasets: [{ data: cities.values, backgroundColor: CHART_COLORS }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#dc2626' : '#4A2545';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close modal on overlay click
document.getElementById('edit-modal').addEventListener('click', e => { if (e.target.id === 'edit-modal') closeModal(); });
document.getElementById('archive-modal').addEventListener('click', e => { if (e.target.id === 'archive-modal') closeArchiveModal(); });