// Type definitions untuk Asesmen

export interface Asesmen {
  id_asesmen: number;
  judul_asesmen: string;
  sampul_asesmen: string; // URL dari Supabase Storage
  guru_asesmen: number; // fk id_guru
  id_elemen: number; // fk id_elemen
  nilai_asesmen: number; // Sum dari nilai_soal siswa yang benar
  waktu_mulai: string; // ISO datetime
  waktu_terakhir: string; // ISO datetime
  durasi_asesmen?: number | null; // Opsional, dalam menit
  durasi_kuis?: number | null; // Legacy compatibility
  created_at: string; // ISO datetime
  guru?: {
    id_guru: number;
    nama_guru: string;
    email_guru: string;
  };
  elemen?: {
    id_elemen: number;
    nama_elemen: string;
    sampul_elemen: string;
  };
  kelas?: {
    id_kelas: number;
    nama_kelas: string;
  };
}

export interface SoalAsesmen {
  id_soal: number;
  id_asesmen: number; // fk id_asesmen
  teks_soal: string; // Pertanyaan
  gambar_soal?: string; // URL gambar untuk soal (opsional)
  teks_jawaban: string; // Jawaban siswa (untuk uraian & kode)
  nilai_soal: number; // Point/nilai soal
  kunci_teks: string; // Kunci jawaban (untuk uraian & kode)
  kunci_pilgan?: boolean; // Untuk pilihan ganda
  urutan_soal: number;
  id_tp: number; // fk id_tp (tujuan pembelajaran)
  tipe_soal: 'pilihan_ganda' | 'uraian' | 'baris_kode'; // Enum tipe soal
  created_at: string;
  tp?: {
    id_tp: number;
    nama_tp: string;
  };
  pilihan_ganda?: PilihanGanda[];
}

export interface PilihanGanda {
  id_pilgan: number;
  id_soal: number; // fk id_soal
  opsi_pilgan: string; // A, B, C, D, E
  urutan_pilgan: number; // 1-5
  teks_pilgan: string; // Teks isian jawaban
  gambar_pilgan: string; // URL (optional)
  kunci_pilgan: boolean; // Jawaban benar?
  created_at: string;
}

export interface TujuanPembelajaran {
  id_tp: number;
  nama_tp: string;
  elemen_tp: number; // fk id_elemen
  created_at: string;
}

// State management untuk editor soal
export interface EditorSoalState {
  id_soal: number;
  teks_soal: string;
  teks_jawaban: string;
  gambar_soal_preview: string; // Preview gambar soal
  gambar_soal_file?: File; // File gambar soal yang belum diupload
  nilai_soal: number;
  urutan_soal: number;
  id_tp: number;
  tipe_soal: 'pilihan_ganda' | 'uraian' | 'baris_kode';
  kunci_teks: string; // Untuk uraian & kode
  // Untuk pilihan ganda
  pilihan_ganda?: PilihanGandaEditor[];
}

export interface PilihanGandaEditor {
  id_pilgan: number;
  opsi_pilgan: string; // A, B, C, D, E
  urutan_pilgan: number;
  teks_pilgan: string; // Teks isian jawaban
  gambar_pilgan: string; // URL atau base64 preview gambar
  gambar_file?: File; // File yang belum diupload
  kunci_pilgan: boolean;
}

export interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
}

export interface Elemen {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen: string; // URL
  deskripsi_elemen: string;
  kelas_elemen: number; // fk id_kelas
  guru_pengampu: number; // fk id_guru
  created_at: string;
  kelas?: {
    id_kelas: number;
    nama_kelas: string;
  } | null;
}
