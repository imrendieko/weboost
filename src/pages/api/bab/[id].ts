import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch single bab dengan sub-bab
      const { data: babData, error: babError } = await supabaseAdmin.from('bab_materi').select('*').eq('id_bab', id).single();

      if (babError) {
        console.error('Error fetching bab:', babError);
        return res.status(500).json({ error: babError.message });
      }

      // Fetch all sub-bab untuk bab ini
      const { data: subBabData, error: subBabError } = await supabaseAdmin.from('sub_bab').select('*').eq('nama_bab', id).order('id_sub_bab', { ascending: true });

      if (subBabError) {
        console.error('Error fetching sub-bab:', subBabError);
      }

      return res.status(200).json({
        ...babData,
        sub_bab: subBabData || [],
      });
    } catch (error) {
      console.error('Error in GET /api/bab/[id]:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { judul_bab, deskripsi_bab } = req.body;

      const updateData: any = {};
      if (judul_bab !== undefined) updateData.judul_bab = judul_bab;
      if (deskripsi_bab !== undefined) updateData.deskripsi_bab = deskripsi_bab;

      const { data, error } = await supabaseAdmin.from('bab_materi').update(updateData).eq('id_bab', id).select().single();

      if (error) {
        console.error('Error updating bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in PUT /api/bab/[id]:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete all sub-bab first
      await supabaseAdmin.from('sub_bab').delete().eq('nama_bab', id);

      // Delete bab
      const { error } = await supabaseAdmin.from('bab_materi').delete().eq('id_bab', id);

      if (error) {
        console.error('Error deleting bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Bab berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/bab/[id]:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Metode ${req.method} tidak diizinkan`);
  }
}
