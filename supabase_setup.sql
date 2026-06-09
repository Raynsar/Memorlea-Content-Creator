-- ============================================================
--  MEMORLÉA – Supabase SQL Setup
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. TABLE: bookings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name  TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  wedding_date DATE,
  package      TEXT,
  city         TEXT,
  venue        TEXT,
  notes        TEXT,
  source       TEXT,
  consent      BOOLEAN DEFAULT FALSE,
  status       TEXT DEFAULT 'belum_dp'
               CHECK (status IN ('belum_dp', 'sudah_dp', 'lunas', 'selesai')),
  archived     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. TABLE: stats ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clients  INT DEFAULT 0,
  vendors  INT DEFAULT 0,
  cities   INT DEFAULT 0,
  crew     INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default stats (hanya sekali)
INSERT INTO stats (clients, vendors, cities, crew)
VALUES (6, 5, 8, 3)
ON CONFLICT DO NOTHING;


-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────

-- Aktifkan RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats    ENABLE ROW LEVEL SECURITY;


-- bookings: siapa saja bisa INSERT (form publik)
CREATE POLICY "public_insert_bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- bookings: hanya user yang login (admin) bisa SELECT, UPDATE, DELETE
CREATE POLICY "admin_all_bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- stats: siapa saja bisa SELECT (untuk counter di landing page)
CREATE POLICY "public_read_stats"
  ON stats FOR SELECT
  TO anon
  USING (true);

-- stats: hanya admin yang bisa UPDATE/INSERT
CREATE POLICY "admin_write_stats"
  ON stats FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── 4. INDEX (opsional, untuk performa) ─────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_archived ON bookings(archived);
CREATE INDEX IF NOT EXISTS idx_bookings_city     ON bookings(city);
CREATE INDEX IF NOT EXISTS idx_bookings_created  ON bookings(created_at DESC);


-- ── SELESAI ──────────────────────────────────────────────────
-- Setelah ini:
-- 1. Pergi ke Authentication → Users → Invite user
--    buat akun admin (email + password)
-- 2. Update js/supabase.js dengan URL dan anon key project lo
