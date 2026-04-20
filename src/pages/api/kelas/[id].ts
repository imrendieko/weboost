import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }

  const kelasId = parseInt(id);

  if (isNaN(kelasId)) {
    return res.status(400).json({ error: 'ID must be a number' });
  }

  if (req.method === 'PUT') {
    try {
      const { nama_kelas } = req.body;

      // Validation
      if (!nama_kelas || nama_kelas.trim() === '') {
        return res.status(400).json({ error: 'Nama kelas harus diisi' });
      }

      // Update kelas
      const { data, error } = await supabase.from('kelas').update({ nama_kelas: nama_kelas.trim() }).eq('id_kelas', kelasId).select().single();

      if (error) {
        console.error('Error updating kelas:', error);
        return res.status(500).json({ error: 'Gagal memperbarui kelas', details: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Kelas tidak ditemukan' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in kelas update:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete kelas
      const { error } = await supabase.from('kelas').delete().eq('id_kelas', kelasId);

      if (error) {
        console.error('Error deleting kelas:', error);
        return res.status(500).json({ error: 'Gagal menghapus kelas', details: error.message });
      }

      return res.status(200).json({ message: 'Kelas berhasil dihapus' });
    } catch (error) {
      console.error('Error in kelas delete:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }
}
