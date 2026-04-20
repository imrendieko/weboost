import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { nama_kelas } = req.body;

      // Validation
      if (!nama_kelas || nama_kelas.trim() === '') {
        return res.status(400).json({ error: 'Nama kelas harus diisi' });
      }

      // Insert into database
      const { data, error } = await supabase
        .from('kelas')
        .insert([{ nama_kelas: nama_kelas.trim() }])
        .select()
        .single();

      if (error) {
        console.error('Error creating kelas:', error);
        return res.status(500).json({ error: 'Gagal menambahkan kelas', details: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in kelas create:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }
}
