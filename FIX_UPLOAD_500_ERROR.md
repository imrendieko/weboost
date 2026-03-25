# Fix Upload 500 Error - Step by Step

## Masalah

Error saat POST ke `/api/sub-bab` dengan pesan:

```
POST http://192.168.1.6:3000/api/sub-bab 500 (Internal Server Error)
```

Error detail dari server:

```
❌ Error: Key (nama_bab)=(2) is not present in table "materi".
❌ Message: insert or update on table "sub_bab" violates foreign key constraint "sub_bab_nama_bab_fkey"
```

## Penyebab

**Foreign key constraint salah konfigurasi!**

Table `sub_bab` memiliki kolom `nama_bab` yang seharusnya merujuk ke `bab_materi.id_bab`, tetapi saat ini **salah merujuk ke table `materi`**.

Struktur yang benar:

- `sub_bab.nama_bab` → harus merujuk ke → `bab_materi.id_bab` ✅
- `sub_bab.nama_bab` → saat ini merujuk ke → `materi` (WRONG) ❌

## Solusi

### Langkah 1: Fix Foreign Key Constraint di Supabase

1. **Buka Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/eopbzwdxvpzglqlfavyq

2. **Masuk ke SQL Editor**
   - Klik menu **SQL Editor** di sidebar kiri
   - Atau URL langsung: https://supabase.com/dashboard/project/eopbzwdxvpzglqlfavyq/sql/new

3. **Copy & Paste SQL Fix**
   - Buka file `SQL_FIX_FOREIGN_KEY_SUB_BAB.sql` ⚠️ (BUKAN yang RLS)
   - Copy seluruh isinya (Ctrl+A → Ctrl+C)
   - Paste ke SQL Editor di Supabase (Ctrl+V)

4. **Run SQL**
   - Klik tombol **Run** (atau tekan Ctrl+Enter)
   - Tunggu sampai muncul pesan success
   - Harusnya muncul notifikasi: "✅ Foreign key constraint fixed!"

5. **Verifikasi Foreign Key**
   - Scroll ke bawah hasil SQL
   - Lihat hasil query verifikasi
   - Pastikan `foreign_table_name` = `bab_materi` (bukan `materi`)

### Langkah 2: ~~Restart Dev Server~~ (TIDAK PERLU)

Server tidak perlu direstart karena ini adalah database schema fix, bukan code fix.

### Langkah 3: Test Upload File

1. **Buka halaman materi**
   - URL: http://localhost:3000/guru/materi
   - Atau klik menu "Materi" di dashboard guru

2. **Pilih materi yang sudah ada**
   - Klik salah satu card materi

3. **Tambah Sub-Bab dengan file**
   - Scroll ke bagian Sub-Bab
   - Klik tombol **"Tambah Sub-Bab"**
   - Isi form:
     - Pilih Bab
     - Isi Nama Sub-Bab
     - Upload File (.pdf, .docx, .xlsx, .pptx)
     - Isi Deskripsi Konten
   - Klik **Simpan**

4. **Verifikasi sukses**
   - Harusnya muncul alert sukses (hijau)
   - Sub-bab baru muncul di list
   - File terupload ke Supabase Storage

## Troubleshooting

### Jika masih error 500 setelah run SQL:

1. **Cek terminal dev server**
   - Lihat error log yang muncul
   - Harusnya ada emoji 📥, 📤, ✅, atau ❌
   - Cek apakah masih ada error foreign key constraint

2. **Cek foreign key di Supabase**
   - Buka: Database → Tables → sub_bab
   - Klik tab **Relations**
   - Pastikan `nama_bab` merujuk ke `bab_materi.id_bab`

3. **Cek apakah bab sudah ada**
   - Buka: Database → Tables → bab_materi
   - Pastikan ada record dengan `id_bab` yang sesuai
   - Misalnya jika form mengirim `nama_bab: 2`, harus ada record dengan `id_bab = 2` di table `bab_materi`

4. **Clear cache dan test ulang**
   - Refresh halaman (Ctrl+R)
   - Coba upload file lagi

### Jika file tidak terupload:

1. **Cek bucket di Supabase Storage**
   - Buka: Storage → Buckets
   - Pastikan ada bucket: `weboost-storage`
   - Cek folder: `materi-dokumen`

2. **Cek ukuran file**
   - Maksimal: 10MB
   - Jika lebih besar, kompres dulu

3. **Cek format file**
   - Format yang didukung: .pdf, .docx, .doc, .xlsx, .xls, .pptx, .ppt
   - Pastikan extensi file benar

## Hasil yang Diharapkan

✅ Upload file berhasil
✅ File tersimpan di Supabase Storage folder `materi-dokumen`
✅ Sub-bab baru muncul dengan link ke file
✅ Bisa download file dari link
✅ Tidak ada error 500 di console

## Catatan Penting

- **Foreign Key Constraint** harus benar: `sub_bab.nama_bab` → `bab_materi.id_bab`
- **Bab harus ada** sebelum menambahkan sub-bab
- **Service Role Key** digunakan untuk bypass RLS di server-side
- **Storage bucket** harus bernama `weboost-storage` (bukan `lms-storage`)
- **File upload** dilakukan server-side dengan base64 encoding
- **Logging** ditambahkan untuk debugging dengan emoji indicator

## Root Cause & Fix

**Masalah Awal:** Foreign key `sub_bab_nama_bab_fkey` salah merujuk ke table `materi` instead of `bab_materi`

**Solusi:** Run SQL [`SQL_FIX_FOREIGN_KEY_SUB_BAB.sql`](SQL_FIX_FOREIGN_KEY_SUB_BAB.sql) untuk:

1. Drop constraint yang salah
2. Create constraint baru yang benar: `sub_bab.nama_bab` → `bab_materi.id_bab`
