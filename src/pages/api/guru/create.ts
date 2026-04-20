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
    const { nama_guru, email_guru, password_guru, nuptk_guru, lembaga_guru } = req.body;

    console.log('Received data:', { nama_guru, email_guru, password_guru, nuptk_guru, lembaga_guru });

    // Validate required fields
    if (!nama_guru || !email_guru || !password_guru || !nuptk_guru || !lembaga_guru || lembaga_guru === 0) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    const emailRaw = email_guru.toString().trim();
    if (!isValidEmailFormat(emailRaw)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    const passwordRaw = String(password_guru);
    if (passwordRaw.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const emailLower = emailRaw.toLowerCase();
    const hashedPassword = await hashPasswordIfNeeded(passwordRaw);

    // Convert NUPTK to string and validate it's numeric
    const nuptkString = nuptk_guru.toString().trim();
    if (!/^\d+$/.test(nuptkString)) {
      return res.status(400).json({
        error: 'NUPTK tidak valid',
        details: 'NUPTK harus berupa angka',
      });
    }

    if (nuptkString.length !== 16) {
      return res.status(400).json({
        error: 'NUPTK tidak valid',
        details: 'NUPTK harus terdiri dari tepat 16 digit',
      });
    }

    // Check if lembaga exists
    const { data: lembagaCheck } = await supabaseAdmin.from('lembaga').select('id_lembaga').eq('id_lembaga', lembaga_guru).single();

    if (!lembagaCheck) {
      return res.status(400).json({
        error: 'Lembaga tidak valid',
        details: 'Lembaga yang dipilih tidak ditemukan di database',
      });
    }

    // Email must be unique in guru and siswa tables.
    const { data: existingGuruEmail } = await supabaseAdmin.from('guru').select('id_guru').eq('email_guru', emailLower).maybeSingle();
    if (existingGuruEmail) {
      return res.status(400).json({ error: 'Email sudah digunakan oleh akun guru lain' });
    }

    const { data: existingSiswaEmail } = await supabaseAdmin.from('siswa').select('id_siswa').eq('email_siswa', emailLower).maybeSingle();
    if (existingSiswaEmail) {
      return res.status(400).json({ error: 'Email sudah digunakan oleh akun siswa' });
    }

    // Guru added from admin panel should still require validation.
    const { data, error } = await supabaseAdmin
      .from('guru')
      .insert([
        {
          nama_guru: nama_guru.trim(),
          email_guru: emailLower,
          password_guru: hashedPassword,
          nuptk_guru: nuptkString,
          lembaga_guru: parseInt(lembaga_guru.toString()),
          status_guru: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating guru:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: 'Gagal menambahkan data guru',
        details: error.message || 'Kesalahan tidak diketahui',
      });
    }

    return res.status(201).json({ message: 'Data guru berhasil ditambahkan', data });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Terjadi kesalahan server',
      details: error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
    });
  }
}
