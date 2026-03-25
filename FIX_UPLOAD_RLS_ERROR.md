# 🔧 FIX: Error "new row violates row-level security policy" saat Upload File

## ❌ Error yang Muncul:

```
Gagal mengupload file: new row violates row-level security policy
```

## ✅ Solusi:

### 1. Pastikan `SUPABASE_SERVICE_ROLE_KEY` Ada di `.env.local`

File `.env.local` harus berada di **root project** (folder `lms-weboost`):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # WAJIB!
```

### 2. Cara Mendapatkan Service Role Key:

1. Buka **Supabase Dashboard**
2. Pilih project Anda
3. Klik **Project Settings** (icon gear ⚙️ di pojok kiri bawah)
4. Klik tab **API**
5. Scroll ke bawah ke section **Project API keys**
6. Copy **`service_role`** key (⚠️ JANGAN share key ini ke public!)

### 3. Restart Dev Server

Setelah menambahkan `.env.local`, **WAJIB restart server**:

```bash
# Stop server (Ctrl+C)
# Lalu jalankan lagi:
npm run dev
```

### 4. Setup Storage Bucket

Pastikan bucket `weboost-storage` sudah dibuat:

1. Buka **Supabase Dashboard** > **Storage**
2. Klik **New bucket**
3. Nama: `weboost-storage`
4. Public: ✅ **Centang**
5. Klik **Save**

### 5. Setup RLS Policy (Hanya untuk READ)

Jalankan SQL ini di **Supabase SQL Editor**:

```sql
-- Policy untuk Public Read (biar file bisa diakses publik)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'weboost-storage' );
```

**TIDAK PERLU** policy untuk INSERT/UPLOAD karena menggunakan service role key!

## 🧪 Testing:

1. ✅ File `.env.local` sudah ada dengan `SUPABASE_SERVICE_ROLE_KEY`
2. ✅ Server sudah di-restart
3. ✅ Bucket `weboost-storage` sudah dibuat dan public
4. ✅ Policy "Public Access" sudah dibuat

Sekarang coba upload file lagi! 🚀

## 📋 Checklist Troubleshooting:

- [ ] File `.env.local` ada di root project (bukan di subfolder)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ada di `.env.local`
- [ ] Service role key adalah key yang **panjang**, bukan anon key
- [ ] Dev server sudah di-restart setelah menambahkan `.env.local`
- [ ] Bucket `weboost-storage` sudah dibuat di Supabase Dashboard
- [ ] Bucket bersifat **public** (ada checkmark ✅)
- [ ] Policy "Public Access" sudah dibuat di SQL Editor

## 🔍 Cara Debug:

Check terminal server, seharusnya muncul log seperti ini:

```bash
✅ SUPABASE_SERVICE_ROLE_KEY found
📤 Uploading file: example.pdf → 1234567890-abc123.pdf
📦 File size: 123456 bytes
✅ Upload successful: materi-dokumen/1234567890-abc123.pdf
🔗 Public URL: https://xxx.supabase.co/storage/v1/object/public/weboost-storage/...
```

Jika muncul:

```bash
❌ SUPABASE_SERVICE_ROLE_KEY is not set!
```

Berarti file `.env.local` belum ada atau server belum di-restart.
