# Cara Memperbaiki Masalah Update Profil Admin

## Masalah

Notifikasi "Profil berhasil diperbarui" muncul, tetapi data tidak benar-benar berubah di database.

## Penyebab

1. **RLS (Row Level Security) Policy** di Supabase menghalangi update
2. **Service Role Key** tidak diset atau tidak valid
3. Permission database tidak tepat

## Solusi

### Opsi 1: Jalankan SQL Fix (RECOMMENDED)

1. Buka **Supabase Dashboard**
2. Pilih project Anda
3. Klik **SQL Editor** di menu kiri
4. Copy semua isi file `SQL_FIX_ADMIN_RLS.sql`
5. Paste ke SQL Editor
6. Klik **Run** atau tekan `Ctrl + Enter`
7. Tunggu sampai semua query selesai (akan ada notifikasi "Success")

### Opsi 2: Disable RLS Secara Manual

1. Buka **Supabase Dashboard**
2. Klik **Database** → **Tables**
3. Cari tabel `admin`
4. Klik ikon **Settings** (⚙️) di sebelah nama tabel
5. **Disable** RLS (Row Level Security)
6. Save

### Opsi 3: Pastikan Service Role Key

1. Buka file `.env.local` atau `.env` di root project
2. Pastikan ada baris:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Jika `SUPABASE_SERVICE_ROLE_KEY` tidak ada:
   - Buka **Supabase Dashboard**
   - Klik **Settings** → **API**
   - Copy **service_role** key (bukan anon key!)
   - Tambahkan ke .env file
4. Restart development server:
   ```bash
   npm run dev
   ```

## Verifikasi

Setelah menjalankan salah satu solusi di atas:

1. Hard refresh browser (`Ctrl + Shift + R`)
2. Login ke admin
3. Buka halaman `/admin/profil`
4. Ubah data profil
5. Klik **Simpan**
6. Cek di **Supabase Dashboard** → **Table Editor** → tabel `admin`
7. Data harus berubah

## Troubleshooting

### Jika masih error, cek console terminal:

```bash
# Lihat log di terminal
PUT /api/admin/profil - Request body: ...
Update result: ...
```

### Jika muncul error RLS:

```
Error: new row violates row-level security policy
```

Berarti Opsi 1 atau 2 belum dijalankan.

### Jika muncul error service role:

```
Error: Invalid API key
```

Berarti Opsi 3 perlu dilakukan - pastikan service role key benar.

## Catatan Penting

- **Service Role Key** adalah key khusus yang bypass RLS
- **JANGAN** commit file `.env.local` ke Git
- Pastikan `.env.local` ada di `.gitignore`
