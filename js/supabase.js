// Ganti dengan credentials dari Supabase Dashboard → Project Settings → API
const SUPABASE_URL      = 'https://nsrxeputqpkfxrmvhbsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcnhlcHV0cXBrZnhybXZoYnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTc1NjgsImV4cCI6MjA5NjU5MzU2OH0.6Bfy0wmnB8v8lRthxwDYzRowV4UdDsNKPQYkRvuHxFE';

// 'supabase' di sini adalah global dari CDN (window.supabase)
// Kita simpan ke variable 'db' supaya tidak conflict dengan nama global CDN
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);