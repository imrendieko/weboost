import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, search, lembaga, sortBy, sortOrder } = req.query;

      let query = supabaseAdmin.from('guru').select(`
          *,
          lembaga:lembaga_guru(id_lembaga, nama_lembaga)
        `);

      // Filter by status (validated or not)
      if (status === 'validated') {
        query = query.eq('status_guru', true);
      } else if (status === 'unvalidated') {
        query = query.eq('status_guru', false);
      }

      // Filter by lembaga
      if (lembaga && lembaga !== 'all') {
        query = query.eq('lembaga_guru', parseInt(lembaga as string));
      }

      // Search by name or NUPTK
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        // Check if search term is numeric (for NUPTK search)
        if (/^\d+$/.test(searchTerm)) {
          query = query.or(`nama_guru.ilike.%${searchTerm}%,nuptk_guru.ilike.%${searchTerm}%`);
        } else {
          query = query.ilike('nama_guru', `%${searchTerm}%`);
        }
      }

      // Sorting
      if (sortBy) {
        const order = sortOrder === 'desc' ? false : true;
        if (sortBy === 'nama') {
          query = query.order('nama_guru', { ascending: order });
        } else if (sortBy === 'created_at') {
          query = query.order('created_at', { ascending: order });
        }
      } else {
        // Default sorting
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching guru:', error);
        return res.status(200).json([]); // Return empty array instead of error
      }

      const normalized = (data || []).map((guru: any) => ({
        ...guru,
        nuptk_guru: String(guru?.nuptk_guru ?? '')
          .replace(/\D/g, '')
          .padStart(16, '0'),
      }));

      return res.status(200).json(normalized);
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).json([]); // Return empty array instead of error
    }
  } else if (req.method === 'POST') {
    try {
      const { nama_guru, email_guru, password_guru, nuptk_guru, lembaga_guru } = req.body;
      const emailLower = String(email_guru).trim().toLowerCase();
      const hashedPassword = await hashPasswordIfNeeded(String(password_guru));

      // Validate required fields
      if (!nama_guru || !email_guru || !password_guru || !nuptk_guru || !lembaga_guru) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      // Convert NUPTK to string to prevent precision loss with large numbers
      const nuptkString = String(nuptk_guru).trim();

      if (!/^\d+$/.test(nuptkString)) {
        return res.status(400).json({ error: 'NUPTK hanya boleh berisi angka' });
      }

      if (nuptkString.length !== 16) {
        return res.status(400).json({ error: 'NUPTK harus terdiri dari tepat 16 digit' });
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

      // Guru created from admin APIs should still require validation.
      const { data, error } = await supabaseAdmin
        .from('guru')
        .insert([
          {
            nama_guru,
            email_guru: emailLower,
            password_guru: hashedPassword,
            nuptk_guru: nuptkString,
            lembaga_guru,
            status_guru: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating guru:', error);
        return res.status(500).json({ error: 'Gagal menambahkan data guru' });
      }

      return res.status(201).json({ message: 'Data guru berhasil ditambahkan', data });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }
}

