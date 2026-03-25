interface ISiswa {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  password_siswa: string;
  kelas_siswa: string;
  nisn_siswa: string;
  created_at: string; // timestamp dari database
}

export type { ISiswa };
