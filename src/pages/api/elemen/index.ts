import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search, kelas, sortBy = 'nama_elemen', sortOrder = 'asc' } = req.query;

      let query = supabase.from('elemen').select(`
          *,
          kelas:kelas_elemen (
            id_kelas,
            nama_kelas
          ),
          guru:guru_pengampu (
            id_guru,
            nama_guru
          ),
          tujuan_pembelajaran:tujuan_pembelajaran (
            id_tp,
            nama_tp
          )
        `);

      // Search by nama elemen
      if (search && search !== '') {
        query = query.ilike('nama_elemen', `%${search}%`);
      }

      // Filter by kelas
      if (kelas && kelas !== 'all') {
        query = query.eq('kelas_elemen', parseInt(kelas as string));
      }

      // Sort
      const sortColumn = sortBy === 'nama_elemen' ? 'nama_elemen' : 'nama_elemen';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching elemen:', error);
        return res.status(500).json({ error: 'Gagal mengambil data elemen' });
      }

      // Log untuk debugging
      if (data && data.length > 0) {
        console.log('Sample elemen data:', {
          id: data[0].id_elemen,
          nama: data[0].nama_elemen,
          sampul_type: typeof data[0].sampul_elemen,
          sampul_preview: data[0].sampul_elemen ? data[0].sampul_elemen.substring(0, 50) + '...' : null,
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in elemen API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
