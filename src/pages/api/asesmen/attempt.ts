import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_siswa } = req.query;

      if (!id_siswa) {
        return res.status(400).json({ error: 'id_siswa diperlukan' });
      }

      const idSiswa = parseInt(id_siswa as string, 10);

      // Fetch semua asesmen_attempt untuk siswa ini
      const { data, error } = await supabaseAdmin
        .from('asesmen_attempt')
        .select(
          `
          id_attempt,
          id_asesmen,
          id_siswa,
          skor_total,
          skor_maksimum,
          durasi_detik,
          submitted_at
        `,
        )
        .eq('id_siswa', idSiswa)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (error) {
        if (error.message?.includes('relation "public.asesmen_attempt" does not exist')) {
          return res.status(500).json({ error: 'Tabel asesmen_attempt belum tersedia' });
        }
        console.error('Error fetching asesmen attempts:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error in GET /api/asesmen/attempt:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
