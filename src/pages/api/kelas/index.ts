import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('kelas').select('*').order('nama_kelas', { ascending: true });

      if (error) {
        console.error('Error fetching kelas:', error);
        return res.status(500).json({ error: 'Gagal mengambil data kelas' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in kelas API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
