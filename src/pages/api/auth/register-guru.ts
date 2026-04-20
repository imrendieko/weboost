import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';
import { isValidEmailFormat } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { nama, email, password, nuptk, lembaga } = req.body;

    // Validate required fields
    if (!nama || !email || !password || !nuptk || !lembaga) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const emailLower = email.trim().toLowerCase();
    const nuptkString = nuptk.toString().trim();
    const hashedPassword = await hashPasswordIfNeeded(String(password));

    if (!isValidEmailFormat(emailLower)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    if (!/^\d+$/.test(nuptkString)) {
      return res.status(400).json({ error: 'NUPTK hanya boleh berisi angka' });
    }

    if (nuptkString.length !== 16) {
      return res.status(400).json({ error: 'NUPTK harus terdiri dari tepat 16 digit' });
    }

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

    // Check if NUPTK already exists
    const { data: existingNuptk } = await supabaseAdmin.from('guru').select('nuptk_guru').eq('nuptk_guru', nuptkString).maybeSingle();

    if (existingNuptk) {
      return res.status(400).json({ error: 'Pakai NUPTK yang lain atau konfirmasi ke admin!' });
    }

    // Insert new guru with status_guru = false (belum divalidasi admin)
    const { data, error } = await supabaseAdmin
      .from('guru')
      .insert([
        {
          nama_guru: nama.trim(),
          email_guru: emailLower,
          password_guru: hashedPassword,
          nuptk_guru: nuptkString,
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
      message: 'Registrasi berhasil! Akun Anda menunggu validasi admin sebelum bisa login.',
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
