import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      const { id_siswa } = req.body;

      if (!id_siswa) {
        return res.status(400).json({ error: 'ID siswa harus disediakan' });
      }

      // Update status_siswa to true (validated)
      const { data, error } = await supabaseAdmin.from('siswa').update({ status_siswa: true }).eq('id_siswa', id_siswa).select();

      if (error) {
        console.error('Error validating siswa:', error);
        return res.status(500).json({ error: 'Gagal memvalidasi siswa' });
      }

      return res.status(200).json({ message: 'Siswa berhasil divalidasi', data });
    } catch (error) {
      console.error('Error in validate siswa API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' });
}
