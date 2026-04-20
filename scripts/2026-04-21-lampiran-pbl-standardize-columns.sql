-- Standardize lampiran_pbl schema for all sintak (1-5).
-- Run this migration in Supabase SQL Editor before relying on the new columns.

alter table if exists lampiran_pbl
  add column if not exists lampiran_tugas text,
  add column if not exists deskripsi_tugas text,
  add column if not exists waktu_mulai timestamptz,
  add column if not exists waktu_terakhir timestamptz,
  add column if not exists created_at timestamptz default now();

-- Backfill lampiran_tugas from legacy columns when available.
update lampiran_pbl
set lampiran_tugas = coalesce(
  nullif(lampiran_tugas, ''),
  nullif(file_lampiran, ''),
  nullif(lampiran, ''),
  nullif(tautan_lampiran, ''),
  nullif(url_lampiran, ''),
  ''
)
where coalesce(lampiran_tugas, '') = '';

-- Backfill task description and timings from sintak_pbl if missing.
update lampiran_pbl lp
set deskripsi_tugas = coalesce(nullif(lp.deskripsi_tugas, ''), sp.deskripsi_sintak, ''),
    waktu_mulai = coalesce(lp.waktu_mulai, sp.waktu_mulai),
    waktu_terakhir = coalesce(lp.waktu_terakhir, sp.waktu_selesai)
from sintak_pbl sp
where sp.id_sintak = lp.id_sintak;

-- Ensure created_at is always populated.
update lampiran_pbl
set created_at = now()
where created_at is null;

-- Optional performance index for siswa/guru reads per sintak.
create index if not exists idx_lampiran_pbl_id_sintak on lampiran_pbl(id_sintak);
