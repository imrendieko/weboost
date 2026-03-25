import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      const { id_guru } = req.body;
      const guruId = Number(id_guru);

      if (!guruId || Number.isNaN(guruId)) {
        return res.status(400).json({ error: 'Missing guru ID' });
      }

      // Update status_guru to true (validated)
      const { data, error } = await supabaseAdmin.from('guru').update({ status_guru: true }).eq('id_guru', guruId).select().single();

      if (error) {
        console.error('Error validating guru:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Guru tidak ditemukan' });
        }
        return res.status(500).json({ error: 'Failed to validate guru' });
      }

      return res.status(200).json({ message: 'Guru berhasil divalidasi', data });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
