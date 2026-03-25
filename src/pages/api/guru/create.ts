import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { nama_guru, email_guru, password_guru, nip_guru, lembaga_guru } = req.body;

    console.log('Received data:', { nama_guru, email_guru, password_guru, nip_guru, lembaga_guru });

    // Validate required fields
    if (!nama_guru || !email_guru || !password_guru || !nip_guru || !lembaga_guru || lembaga_guru === 0) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    const emailLower = email_guru.toString().trim().toLowerCase();

    // Convert NIP to string and validate it's numeric
    const nipString = nip_guru.toString().trim();
    if (!/^\d+$/.test(nipString)) {
      return res.status(400).json({
        error: 'NIP tidak valid',
        details: 'NIP harus berupa angka',
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

    // Guru added from admin panel should be immediately active.
    const { data, error } = await supabaseAdmin
      .from('guru')
      .insert([
        {
          nama_guru: nama_guru.trim(),
          email_guru: emailLower,
          password_guru,
          nip_guru: nipString,
          lembaga_guru: parseInt(lembaga_guru.toString()),
          status_guru: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating guru:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: 'Gagal menambahkan data guru',
        details: error.message || 'Unknown error',
      });
    }

    return res.status(201).json({ message: 'Data guru berhasil ditambahkan', data });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
