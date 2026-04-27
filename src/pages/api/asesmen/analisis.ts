import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateAnalisisSiswa } from '@/lib/generateAnalisisSiswa';
import { buildKunciPilihanMap, computeAttemptScore, type ValidasiScore } from '@/lib/asesmenScore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_asesmen, id_siswa } = req.query;

      if (!id_asesmen || !id_siswa) {
        return res.status(400).json({ error: 'id_asesmen dan id_siswa diperlukan' });
      }

      const idAsesmen = parseInt(id_asesmen as string, 10);
      const idSiswa = parseInt(id_siswa as string, 10);

      console.log(`📌 Fetching analisis for asesmen ${idAsesmen}, siswa ${idSiswa}`);

      // 1. Fetch asesmen_attempt untuk mendapatkan nilai dan durasi
      const { data: attemptData, error: attemptError } = await supabaseAdmin
        .from('asesmen_attempt')
        .select('id_attempt, answers_json, skor_total, skor_maksimum, durasi_detik, submitted_at')
        .eq('id_asesmen', idAsesmen)
        .eq('id_siswa', idSiswa)
        .eq('status', 'submitted')
        .single();

      if (attemptError) {
        console.error('❌ Error fetching attempt:', attemptError);
        return res.status(500).json({ error: 'Data pengerjaan asesmen tidak ditemukan' });
      }

      const { data: siswaData, error: siswaError } = await supabaseAdmin.from('siswa').select('id_siswa, nama_siswa').eq('id_siswa', idSiswa).single();

      if (siswaError) {
        console.warn('⚠️ Error fetching siswa info (non-blocking):', siswaError);
      }

      console.log('✅ Found attempt:', { skor: attemptData.skor_total, durasi: attemptData.durasi_detik });

      const { data: soalRows, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, nilai_soal').eq('id_asesmen', idAsesmen);
      if (soalError) {
        return res.status(500).json({ error: soalError.message });
      }

      const soalList = soalRows || [];
      const totalSoal = soalList.length;
      const soalIdSet = new Set<number>(soalList.map((row: any) => Number(row.id_soal)));

      const soalIds = soalList.map((row: any) => Number(row.id_soal));
      const { data: pilihanRows, error: pilihanError } = soalIds.length
        ? await supabaseAdmin.from('pilihan_ganda').select('id_soal, opsi_pilgan, kunci_pilgan').in('id_soal', soalIds)
        : { data: [], error: null };

      if (pilihanError) {
        return res.status(500).json({ error: pilihanError.message });
      }

      const kunciPilihanMap = buildKunciPilihanMap((pilihanRows || []) as Array<{ id_soal: number; opsi_pilgan: string; kunci_pilgan: boolean }>);

      const { data: validasiRows, error: validasiError } = await supabaseAdmin.from('validasi_nilai').select('id_soal, status_validasi, skor_tervalidasi, skor_asli').eq('id_attempt', attemptData.id_attempt);

      if (validasiError) {
        return res.status(500).json({ error: validasiError.message });
      }

      const validatedSoalSet = new Set<number>(
        (validasiRows || [])
          .filter((row: any) => row.status_validasi === 'validated')
          .map((row: any) => Number(row.id_soal))
          .filter((soalId) => soalIdSet.has(soalId)),
      );
      const isPendingValidation = totalSoal > 0 && validatedSoalSet.size < totalSoal;

      const validasiBySoal = (validasiRows || []).reduce(
        (acc, row: any) => {
          acc[Number(row.id_soal)] = {
            skor_tervalidasi: row.skor_tervalidasi,
            skor_asli: row.skor_asli,
          };

          return acc;
        },
        {} as Record<number, ValidasiScore>,
      );

      const recomputedScores = computeAttemptScore({
        answersJson: attemptData.answers_json,
        soalList,
        validasiBySoal,
        kunciPilihanMap,
      });

      const recomputedAttempt = {
        id_attempt: attemptData.id_attempt,
        durasi_detik: attemptData.durasi_detik,
        submitted_at: attemptData.submitted_at,
        skor_total: recomputedScores.skor_total,
        skor_maksimum: recomputedScores.skor_maksimum,
      };

      if (isPendingValidation) {
        return res.status(200).json({
          attempt: recomputedAttempt,
          analysis: [],
          siswa: siswaData || null,
          pending_validation: true,
          message: 'Menunggu validasi nilai oleh guru',
        });
      }

      // 2. Selalu generate ulang agar memakai model proporsional terbaru berbasis skor per soal
      const generated = await generateAnalisisSiswa({ idAsesmen, idSiswa });
      const analysisData = generated.analysis || [];

      console.log(`✅ Found ${analysisData?.length || 0} analysis records`);

      // 3. Fetch informasi TP untuk setiap analisis
      let analysisWithTP = analysisData;
      if (analysisData && analysisData.length > 0) {
        const tpIds = analysisData.map((a: any) => a.tp_asesmen);
        const { data: tpList, error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);

        if (tpError) {
          console.warn('⚠️ Error fetching TP info (non-blocking):', tpError);
        }

        const tpMap: { [id: number]: any } = {};
        (tpList || []).forEach((tp: any) => {
          tpMap[tp.id_tp] = tp;
        });

        // Map TP data ke analysis
        analysisWithTP = analysisData.map((analysis: any) => ({
          ...analysis,
          tp_asesmen_detail: tpMap[analysis.tp_asesmen] || { id_tp: analysis.tp_asesmen, nama_tp: 'TP Unknown' },
        }));
      }

      return res.status(200).json({
        attempt: recomputedAttempt,
        analysis: analysisWithTP || [],
        siswa: siswaData || null,
        pending_validation: false,
      });
    } catch (error) {
      console.error('❌ Error in GET /api/asesmen/analisis:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }
}
