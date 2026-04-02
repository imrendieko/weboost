import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { nama, email, password, nisn, lembaga, kelas } = req.body;

    // Validate required fields
    if (!nama || !email || !password || !nisn || !lembaga || !kelas) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const emailLower = email.trim().toLowerCase();
    const nisnString = nisn.toString().trim();
    const hashedPassword = await hashPasswordIfNeeded(String(password));

    // Check if email already exists in siswa
    const { data: existingEmail } = await supabaseAdmin.from('siswa').select('email_siswa').eq('email_siswa', emailLower).maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Pakai Email yang lain atau konfirmasi ke admin!' });
    }

    // Check if email is already used by guru
    const { data: existingEmailInGuru } = await supabaseAdmin.from('guru').select('email_guru').eq('email_guru', emailLower).maybeSingle();

    if (existingEmailInGuru) {
      return res.status(400).json({ error: 'Email sudah digunakan oleh akun guru. Gunakan email lain.' });
    }

    // Check if NISN already exists
    const { data: existingNisn } = await supabaseAdmin.from('siswa').select('nisn_siswa').eq('nisn_siswa', nisnString).maybeSingle();

    if (existingNisn) {
      return res.status(400).json({ error: 'Pakai NISN yang lain atau konfirmasi ke admin!' });
    }

    // Insert new siswa (no status field based on previous context)
    const { data, error } = await supabaseAdmin
      .from('siswa')
      .insert([
        {
          nama_siswa: nama.trim(),
          email_siswa: emailLower,
          password_siswa: hashedPassword,
          nisn_siswa: nisnString,
          kelas_siswa: parseInt(kelas),
          lembaga_siswa: parseInt(lembaga),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating siswa:', error);
      return res.status(500).json({
        error: 'Gagal mendaftar. Silakan coba lagi.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      data: {
        id: data.id_siswa,
        nama: data.nama_siswa,
        email: data.email_siswa,
      },
    });
  } catch (error: any) {
    console.error('Error in register-siswa:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
