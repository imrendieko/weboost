# Fix Sampul Elemen Tidak Muncul

## Masalah

Sampul elemen tidak muncul di tabel dan form edit karena tipe kolom database tidak sesuai.

## Penyebab

- Kolom `sampul_elemen` di database bertipe `bytea` (binary)
- Aplikasi menyimpan data sebagai **base64 string** (text format: "data:image/jpeg;base64,...")
- Bytea tidak cocok untuk menyimpan base64 string

## Solusi

### Opsi 1: Ubah Tipe Kolom (RECOMMENDED)

Jalankan SQL query di Supabase SQL Editor:

```sql
-- Ubah tipe kolom dari bytea ke text
ALTER TABLE elemen
ALTER COLUMN sampul_elemen TYPE text;
```

### Opsi 2: Ubah ke bytea yang benar

Jika tetap ingin pakai bytea, aplikasi harus:

1. Convert base64 ke binary saat save
2. Convert binary ke base64 saat fetch

Tapi **Opsi 1 lebih mudah dan praktis**.

## Cara Test Setelah Fix

1. Buka halaman kelola-elemen
2. Tambah elemen baru dengan upload sampul
3. Sampul harus muncul di tabel
4. Klik Edit, sampul harus muncul di preview
5. Cek browser console (F12) untuk log data

## Debug Console

Console log sudah ditambahkan:

- `Fetched elemen data:` - cek data dari API
- `Editing elemen:` - cek data saat edit
- `Sampul elemen:` - cek format sampul

## Catatan

Format yang benar untuk sampul:

```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...
```

Jika console menunjukkan sampul_elemen = null atau format lain, berarti data tidak tersimpan dengan benar.
