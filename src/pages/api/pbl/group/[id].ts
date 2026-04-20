import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { id } = req.query;
    const kelompokId = Number(Array.isArray(id) ? id[0] : id);

    if (!kelompokId) {
      return res.status(400).json({ error: 'id kelompok tidak valid' });
    }

    const { error: clearSubmissionGroupError } = await supabaseAdmin.from('pengumpulan_pbl').update({ id_kelompok: null }).eq('id_kelompok', kelompokId);

    if (clearSubmissionGroupError) {
      console.error('Error clearing id_kelompok in pengumpulan_pbl:', clearSubmissionGroupError);
      return res.status(500).json({ error: clearSubmissionGroupError.message });
    }

    const { error: deleteMembersError } = await supabaseAdmin.from('anggota_kelompok').delete().eq('id_kelompok', kelompokId);
    if (deleteMembersError) {
      console.error('Error deleting anggota_kelompok:', deleteMembersError);
      return res.status(500).json({ error: deleteMembersError.message });
    }

    const { error: deleteGroupError } = await supabaseAdmin.from('kelompok_pbl').delete().eq('id_kelompok', kelompokId);
    if (deleteGroupError) {
      console.error('Error deleting kelompok_pbl:', deleteGroupError);
      return res.status(500).json({ error: deleteGroupError.message });
    }

    return res.status(200).json({ message: 'Kelompok berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting kelompok:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
