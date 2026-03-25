# Setup Supabase Storage untuk Upload Dokumen

Untuk mengaktifkan fitur upload dokumen di Sub-bab Materi, Anda perlu membuat Storage Bucket di Supabase.

**CATATAN PENTING**: Upload dilakukan secara **server-side** menggunakan `supabaseAdmin` yang otomatis bypass RLS, sehingga lebih aman dan mudah.

## Langkah-langkah Setup Storage:

### 1. Buka Supabase Dashboard

- Login ke dashboard Supabase Anda
- Pilih project LMS WebBoost

### 2. Buat Storage Bucket

- Klik menu **Storage** di sidebar kiri
- Klik tombol **New bucket**
- Isi form dengan:
  - **Name**: `weboost-storage`
  - **Public bucket**: ✅ Centang (agar file bisa diakses publik)
  - **File size limit**: 10 MB
  - **Allowed MIME types**: Biarkan kosong atau isi:
    - `application/pdf`
    - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx)
    - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
    - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (pptx)
    - `application/msword` (doc)
    - `application/vnd.ms-excel` (xls)
    - `application/vnd.ms-powerpoint` (ppt)

### 3. Setup Storage Policies (RLS)

Setelah bucket dibuat, setup policy untuk mengizinkan akses publik untuk membaca file.

**PENTING**: Karena upload dilakukan server-side dengan `supabaseAdmin`, kita **hanya perlu policy untuk READ** saja. Upload otomatis bypass RLS.

```sql
-- Policy untuk Public Read (semua orang bisa baca file)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'weboost-storage' );
```

**Tidak perlu policy untuk INSERT/UPLOAD** karena supabaseAdmin bypass RLS! ✅

### 4. Folder Structure di Storage

File akan diupload ke folder:

```
weboost-storage/
  └── materi-dokumen/
      ├── 1234567890-abc123.pdf
      ├── 1234567891-def456.docx
      └── 1234567892-ghi789.pptx
```

## Testing

Setelah setup selesai, coba upload dokumen di halaman Materi:

1. Buka halaman Materi Guru (pilih elemen dari dashboard)
2. Klik BAB yang sudah ada atau buat BAB baru
3. Klik "Tambah Sub-bab"
4. Pilih tab "Dokumen"
5. Klik "Pilih File" dan upload file (.docx, .pdf, .xlsx, .pptx)
6. Tunggu hingga loading selesai ("Mengupload..." berubah jadi "Tambah")
7. Klik "Tambah" untuk menyimpan sub-bab dengan file

File akan langsung diupload dari browser ke Supabase Storage!

## Troubleshooting

### Error: "Failed to upload to storage" atau "Gagal mengupload file"

**Penyebab**: Bucket tidak ada atau nama salah

**Solusi**:

- Pastikan bucket `weboost-storage` sudah dibuat
- Pastikan nama bucket adalah `weboost-storage` (case-sensitive)
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` ada di `.env.local`
- Cek browser console (F12) dan terminal server untuk error detail

### Error: "new row violates row-level security policy"

**Penyebab**: Tidak seharusnya muncul karena server-side upload dengan supabaseAdmin bypass RLS

**Solusi**:

- Pastikan API menggunakan `supabaseAdmin` dari `/lib/supabaseAdmin.ts`
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di environment variables
- Restart dev server setelah mengubah `.env.local`

### Error: "Bucket not found"

**Penyebab**: Bucket belum dibuat atau nama salah

**Solusi**:

- Pastikan nama bucket adalah `weboost-storage` (case-sensitive)
- Buat bucket baru jika belum ada di Supabase Dashboard > Storage
- Refresh halaman setelah membuat bucket

### Error: "File terlalu besar"

**Penyebab**: File lebih dari 10MB

**Solusi**:

- Maksimal ukuran file adalah 10MB
- Kompres file jika terlalu besar
- Validasi akan muncul sebelum upload dimulai

### File tidak bisa diakses setelah upload

**Penyebab**: Bucket tidak public atau policy SELECT tidak ada

**Solusi**:

- Pastikan bucket bersifat public
- Pastikan policy "Public Access" (SELECT) sudah dibuat
- Cek URL file di browser secara langsung
- Format URL: `https://<project>.supabase.co/storage/v1/object/public/weboost-storage/materi-dokumen/<filename>`

## Format File yang Didukung

- **Word**: .doc, .docx
- **Excel**: .xls, .xlsx
- **PowerPoint**: .ppt, .pptx
- **PDF**: .pdf

## Maksimal Ukuran File

- 10 MB per file
