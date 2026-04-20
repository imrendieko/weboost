import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, lembaga, kelas, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

      let query = supabase.from('siswa').select(`
          *,
          lembaga:lembaga_siswa (
            id_lembaga,
            nama_lembaga
          ),
          kelas:kelas_siswa (
            id_kelas,
            nama_kelas
          )
        `);

      // Filter by status (validated or not)
      if (status === 'validated') {
        query = query.eq('status_siswa', true);
      } else if (status === 'unvalidated') {
        query = query.eq('status_siswa', false);
      }

      // Filter by lembaga
      if (lembaga && lembaga !== 'all') {
        query = query.eq('lembaga_siswa', parseInt(lembaga as string));
      }

      // Filter by kelas
      if (kelas && kelas !== 'all') {
        query = query.eq('kelas_siswa', parseInt(kelas as string));
      }

      // Sort
      const sortColumn = sortBy === 'nama' ? 'nama_siswa' : 'created_at';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching siswa:', error);
        return res.status(200).json([]);
      }

      const normalized = (data || []).map((siswa: any) => ({
        ...siswa,
        // Keep visible value consistent with 10-digit NISN input, including leading zeros.
        nisn_siswa: String(siswa?.nisn_siswa ?? '')
          .replace(/\D/g, '')
          .padStart(10, '0'),
      }));

      return res.status(200).json(normalized);
    } catch (error) {
      console.error('Error in siswa API:', error);
      return res.status(200).json([]);
    }
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' });
}
