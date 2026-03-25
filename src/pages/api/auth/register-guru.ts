import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { nama, email, password, nip, lembaga } = req.body;

    // Validate required fields
    if (!nama || !email || !password || !nip || !lembaga) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const emailLower = email.trim().toLowerCase();
    const nipString = nip.toString().trim();

    // Check if email already exists in guru
    const { data: existingEmail } = await supabaseAdmin.from('guru').select('email_guru').eq('email_guru', emailLower).maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Pakai Email yang lain atau konfirmasi ke admin!' });
    }

    // Check if email is already used by siswa
    const { data: existingEmailInSiswa } = await supabaseAdmin.from('siswa').select('email_siswa').eq('email_siswa', emailLower).maybeSingle();

    if (existingEmailInSiswa) {
      return res.status(400).json({ error: 'Email sudah digunakan oleh akun siswa. Gunakan email lain.' });
    }

    // Check if NIP already exists
    const { data: existingNip } = await supabaseAdmin.from('guru').select('nip_guru').eq('nip_guru', nipString).maybeSingle();

    if (existingNip) {
      return res.status(400).json({ error: 'Pakai NIP yang lain atau konfirmasi ke admin!' });
    }

    // Insert new guru with status_guru = false (belum divalidasi admin)
    const { data, error } = await supabaseAdmin
      .from('guru')
      .insert([
        {
          nama_guru: nama.trim(),
          email_guru: emailLower,
          password_guru: password,
          nip_guru: nipString,
          lembaga_guru: parseInt(lembaga),
          status_guru: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating guru:', error);
      return res.status(500).json({
        error: 'Gagal mendaftar. Silakan coba lagi.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      data: {
        id: data.id_guru,
        nama: data.nama_guru,
        email: data.email_guru,
      },
    });
  } catch (error: any) {
    console.error('Error in register-guru:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
