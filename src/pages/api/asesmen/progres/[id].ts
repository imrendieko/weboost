import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { buildKunciPilihanMap, computeAttemptScore, type ValidasiScore } from '@/lib/asesmenScore';

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
          answers_json,
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

      const attempts = data || [];

      if (attempts.length === 0) {
        return res.status(200).json([]);
      }

      const { data: soalRows, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, nilai_soal').eq('id_asesmen', idAsesmen);

      if (soalError) {
        return res.status(500).json({ error: soalError.message });
      }

      const soalList = soalRows || [];
      const soalIds = soalList.map((soal) => Number(soal.id_soal));

      const { data: pilihanRows, error: pilihanError } = soalIds.length
        ? await supabaseAdmin.from('pilihan_ganda').select('id_soal, opsi_pilgan, kunci_pilgan').in('id_soal', soalIds)
        : { data: [], error: null };

      if (pilihanError) {
        return res.status(500).json({ error: pilihanError.message });
      }

      const kunciPilihanMap = buildKunciPilihanMap((pilihanRows || []) as Array<{ id_soal: number; opsi_pilgan: string; kunci_pilgan: boolean }>);

      const { count: totalSoalCount, error: soalCountError } = await supabaseAdmin.from('soal_asesmen').select('id_soal', { count: 'exact', head: true }).eq('id_asesmen', idAsesmen);

      if (soalCountError) {
        return res.status(500).json({ error: soalCountError.message });
      }

      const totalSoal = totalSoalCount || 0;
      const attemptIds = attempts.map((item) => item.id_attempt);

      const { data: validasiRows, error: validasiError } = await supabaseAdmin
        .from('validasi_nilai')
        .select('id_attempt, id_soal, status_validasi, skor_tervalidasi, skor_asli')
        .in('id_attempt', attemptIds);

      if (validasiError) {
        return res.status(500).json({ error: validasiError.message });
      }

      const validatedCountByAttempt = (validasiRows || []).reduce(
        (acc, row) => {
          if (row.status_validasi === 'validated') {
            acc[row.id_attempt] = (acc[row.id_attempt] || 0) + 1;
          }
          return acc;
        },
        {} as Record<number, number>,
      );

      const validasiScoreMapByAttempt = (validasiRows || []).reduce(
        (acc, row) => {
          if (!acc[row.id_attempt]) {
            acc[row.id_attempt] = {};
          }

          acc[row.id_attempt][Number(row.id_soal)] = {
            skor_tervalidasi: row.skor_tervalidasi,
            skor_asli: row.skor_asli,
          };

          return acc;
        },
        {} as Record<number, Record<number, ValidasiScore>>,
      );

      const enrichedAttempts = attempts.map((item) => {
        const validatedCount = validatedCountByAttempt[item.id_attempt] || 0;
        const isValidated = totalSoal > 0 && validatedCount >= totalSoal;
        const recomputedScore = computeAttemptScore({
          answersJson: item.answers_json,
          soalList,
          validasiBySoal: validasiScoreMapByAttempt[item.id_attempt] || {},
          kunciPilihanMap,
        });

        return {
          ...item,
          skor_total: recomputedScore.skor_total,
          skor_maksimum: recomputedScore.skor_maksimum,
          validation_status: isValidated ? 'validated' : 'pending',
        };
      });

      return res.status(200).json(enrichedAttempts);
    } catch (error) {
      console.error('Error in GET /api/asesmen/progres/[id]:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const idAttempt = Number(req.body?.id_attempt);
      if (!Number.isFinite(idAttempt)) {
        return res.status(400).json({ error: 'ID pengerjaan tidak valid' });
      }

      const { data: attemptData, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt,id_asesmen').eq('id_attempt', idAttempt).maybeSingle();

      if (attemptError) {
        return res.status(500).json({ error: attemptError.message });
      }

      if (!attemptData || attemptData.id_asesmen !== idAsesmen) {
        return res.status(404).json({ error: 'Data pengerjaan tidak ditemukan' });
      }

      // Delete validasi_nilai records first (child records) to avoid foreign key constraint
      const { error: deleteValidasiError } = await supabaseAdmin.from('validasi_nilai').delete().eq('id_attempt', idAttempt);
      if (deleteValidasiError) {
        console.warn('Warning deleting validasi_nilai:', deleteValidasiError);
        // Don't throw error, continue to delete attempt anyway
      }

      // Now delete the asesmen_attempt record
      const { error: deleteError } = await supabaseAdmin.from('asesmen_attempt').delete().eq('id_attempt', idAttempt);
      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }

      return res.status(200).json({ message: 'Pengerjaan siswa berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/asesmen/progres/[id]:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
}
