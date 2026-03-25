import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin.from('sub_bab').select('*').eq('id_sub_bab', id).single();

      if (error) {
        console.error('Error fetching sub-bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in GET /api/sub-bab/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { judul_sub_bab, tautan_konten } = req.body;

      const updateData: any = {};
      if (judul_sub_bab !== undefined) updateData.judul_sub_bab = judul_sub_bab;
      if (tautan_konten !== undefined) updateData.tautan_konten = tautan_konten;

      const { data, error } = await supabaseAdmin.from('sub_bab').update(updateData).eq('id_sub_bab', id).select().single();

      if (error) {
        console.error('Error updating sub-bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in PUT /api/sub-bab/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin.from('sub_bab').delete().eq('id_sub_bab', id);

      if (error) {
        console.error('Error deleting sub-bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Sub-bab berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/sub-bab/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
