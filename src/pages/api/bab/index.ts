import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_materi } = req.query;

      if (!id_materi) {
        return res.status(400).json({ error: 'id_materi diperlukan' });
      }

      // Fetch all bab by materi
      const { data, error } = await supabaseAdmin.from('bab_materi').select('*').eq('nama_materi', id_materi).order('id_bab', { ascending: true });

      if (error) {
        console.error('Error fetching bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error in GET /api/bab:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'POST') {
    try {
      const { nama_materi, judul_bab, deskripsi_bab } = req.body;

      if (!nama_materi || !judul_bab) {
        return res.status(400).json({ error: 'Data tidak lengkap' });
      }

      const { data, error } = await supabaseAdmin
        .from('bab_materi')
        .insert([
          {
            nama_materi,
            judul_bab,
            deskripsi_bab: deskripsi_bab || '',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in POST /api/bab:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Metode ${req.method} tidak diizinkan`);
  }
}
