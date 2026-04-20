import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }

  const lembagaId = parseInt(id);

  if (isNaN(lembagaId)) {
    return res.status(400).json({ error: 'ID must be a number' });
  }

  if (req.method === 'PUT') {
    try {
      const { nama_lembaga } = req.body;

      // Validation
      if (!nama_lembaga || nama_lembaga.trim() === '') {
        return res.status(400).json({ error: 'Nama lembaga harus diisi' });
      }

      // Update lembaga
      const { data, error } = await supabaseAdmin.from('lembaga').update({ nama_lembaga: nama_lembaga.trim() }).eq('id_lembaga', lembagaId).select().single();

      if (error) {
        console.error('Error updating lembaga:', error);
        return res.status(500).json({ error: 'Gagal memperbarui lembaga', details: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Lembaga tidak ditemukan' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in lembaga update:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete lembaga
      const { error } = await supabaseAdmin.from('lembaga').delete().eq('id_lembaga', lembagaId);

      if (error) {
        console.error('Error deleting lembaga:', error);
        return res.status(500).json({ error: 'Gagal menghapus lembaga', details: error.message });
      }

      return res.status(200).json({ message: 'Lembaga berhasil dihapus' });
    } catch (error) {
      console.error('Error in lembaga delete:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }
}
