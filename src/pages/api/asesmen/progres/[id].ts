import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID asesmen tidak valid' });
  }

  const idAsesmen = Number(id);
  if (!Number.isFinite(idAsesmen)) {
    return res.status(400).json({ error: 'ID asesmen tidak valid' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('asesmen_attempt')
        .select(
          `
          id_attempt,
          id_siswa,
          submitted_at,
          skor_total,
          skor_maksimum,
          siswa:siswa (
            id_siswa,
            nama_siswa,
            kelas:kelas_siswa (
              nama_kelas
            ),
            lembaga:lembaga_siswa (
              nama_lembaga
            )
          )
        `,
        )
        .eq('id_asesmen', idAsesmen)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (error) {
        if (error.message?.includes('relation "public.asesmen_attempt" does not exist')) {
          return res.status(500).json({ error: 'Tabel asesmen_attempt belum tersedia' });
        }

        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error in GET /api/asesmen/progres/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const idAttempt = Number(req.body?.id_attempt);
      if (!Number.isFinite(idAttempt)) {
        return res.status(400).json({ error: 'ID attempt tidak valid' });
      }

      const { data: attemptData, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt,id_asesmen').eq('id_attempt', idAttempt).maybeSingle();

      if (attemptError) {
        return res.status(500).json({ error: attemptError.message });
      }

      if (!attemptData || attemptData.id_asesmen !== idAsesmen) {
        return res.status(404).json({ error: 'Data pengerjaan tidak ditemukan' });
      }

      const { error: deleteError } = await supabaseAdmin.from('asesmen_attempt').delete().eq('id_attempt', idAttempt);
      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }

      return res.status(200).json({ message: 'Pengerjaan siswa berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/asesmen/progres/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
