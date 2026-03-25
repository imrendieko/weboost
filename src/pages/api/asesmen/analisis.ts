import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateAnalisisSiswa } from '@/lib/generateAnalisisSiswa';

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
        .select('skor_total, skor_maksimum, durasi_detik, submitted_at')
        .eq('id_asesmen', idAsesmen)
        .eq('id_siswa', idSiswa)
        .eq('status', 'submitted')
        .single();

      if (attemptError) {
        console.error('❌ Error fetching attempt:', attemptError);
        return res.status(500).json({ error: 'Asesmen attempt tidak ditemukan' });
      }

      console.log('✅ Found attempt:', { skor: attemptData.skor_total, durasi: attemptData.durasi_detik });

      // 2. Fetch analisis_siswa untuk mendapatkan per-TP analysis
      let { data: analysisData, error: analysisError } = await supabaseAdmin
        .from('analisis_siswa')
        .select('id_analisis_siswa, persentase_tp_siswa, saran_siswa, tp_asesmen')
        .eq('nama_asesmen', idAsesmen)
        .eq('nama_siswa', idSiswa)
        .order('id_analisis_siswa');

      if (analysisError) {
        console.error('❌ Error fetching analysis:', analysisError);
        return res.status(500).json({ error: analysisError.message });
      }

      // Ambil TP yang benar-benar dipakai oleh soal pada asesmen ini.
      const { data: soalTpRows, error: soalTpError } = await supabaseAdmin.from('soal_asesmen').select('id_tp').eq('id_asesmen', idAsesmen).not('id_tp', 'is', null);

      if (soalTpError) {
        return res.status(500).json({ error: soalTpError.message });
      }

      const usedTpSet = new Set<number>((soalTpRows || []).map((row: any) => Number(row.id_tp)).filter((id) => Number.isFinite(id)));

      // Jika data analisis lama masih berisi TP di luar soal asesmen, regenerate agar sinkron.
      const hasOutdatedRows = (analysisData || []).some((row: any) => !usedTpSet.has(Number(row.tp_asesmen)));
      if (hasOutdatedRows) {
        await generateAnalisisSiswa({ idAsesmen, idSiswa });
        const refetch = await supabaseAdmin.from('analisis_siswa').select('id_analisis_siswa, persentase_tp_siswa, saran_siswa, tp_asesmen').eq('nama_asesmen', idAsesmen).eq('nama_siswa', idSiswa).order('id_analisis_siswa');

        if (!refetch.error) {
          analysisData = refetch.data || [];
        }
      }

      analysisData = (analysisData || []).filter((row: any) => usedTpSet.has(Number(row.tp_asesmen)));

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
        attempt: attemptData,
        analysis: analysisWithTP || [],
      });
    } catch (error) {
      console.error('❌ Error in GET /api/asesmen/analisis:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
