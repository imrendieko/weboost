import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { nama_lembaga } = req.body;

      // Validation
      if (!nama_lembaga || nama_lembaga.trim() === '') {
        return res.status(400).json({ error: 'Nama lembaga harus diisi' });
      }

      // Insert into database
      const { data, error } = await supabaseAdmin
        .from('lembaga')
        .insert([{ nama_lembaga: nama_lembaga.trim() }])
        .select()
        .single();

      if (error) {
        console.error('Error creating lembaga:', error);
        return res.status(500).json({ error: 'Gagal menambahkan lembaga', details: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in lembaga create:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
