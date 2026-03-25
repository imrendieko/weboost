import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { nama_siswa, email_siswa, password_siswa, nisn_siswa, kelas_siswa, lembaga_siswa } = req.body;
      const emailLower = String(email_siswa).trim().toLowerCase();

      // Validate required fields
      if (!nama_siswa || !email_siswa || !password_siswa || !nisn_siswa || !kelas_siswa || !lembaga_siswa) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      // Check if email already exists in siswa
      const { data: existingEmail } = await supabaseAdmin.from('siswa').select('email_siswa').eq('email_siswa', emailLower).maybeSingle();

      if (existingEmail) {
        return res.status(400).json({ error: 'Email sudah terdaftar' });
      }

      // Check if email already exists in guru
      const { data: existingEmailInGuru } = await supabaseAdmin.from('guru').select('email_guru').eq('email_guru', emailLower).maybeSingle();

      if (existingEmailInGuru) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh akun guru' });
      }

      // Check if NISN already exists
      const { data: existingNISN } = await supabaseAdmin.from('siswa').select('nisn_siswa').eq('nisn_siswa', nisn_siswa).maybeSingle();

      if (existingNISN) {
        return res.status(400).json({ error: 'NISN sudah terdaftar' });
      }

      // Insert new siswa
      const { data, error } = await supabaseAdmin
        .from('siswa')
        .insert([
          {
            nama_siswa,
            email_siswa: emailLower,
            password_siswa,
            nisn_siswa,
            kelas_siswa: parseInt(kelas_siswa),
            lembaga_siswa: parseInt(lembaga_siswa),
          },
        ])
        .select();

      if (error) {
        console.error('Error creating siswa:', error);
        return res.status(500).json({ error: 'Gagal menambahkan siswa', details: error.message });
      }

      return res.status(201).json({ message: 'Siswa berhasil ditambahkan', data });
    } catch (error) {
      console.error('Error in create siswa API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
