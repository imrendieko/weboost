import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID komentar tidak valid' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { error: deleteRepliesError } = await supabaseAdmin.from('komentar_pbl').delete().eq('parent_id', id);
    if (deleteRepliesError) {
      console.error('Error deleting child comments:', deleteRepliesError);
      return res.status(500).json({ error: deleteRepliesError.message });
    }

    const { error } = await supabaseAdmin.from('komentar_pbl').delete().eq('id_komentar', id);
    if (error) {
      console.error('Error deleting komentar_pbl:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    console.error('Error in DELETE /api/pbl/comment/[id]:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
