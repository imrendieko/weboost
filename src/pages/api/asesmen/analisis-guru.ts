import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateAnalisisGuru } from '@/lib/generateAnalisisGuru';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const idAsesmen = Number(req.query.id_asesmen);

    if (!Number.isFinite(idAsesmen)) {
      return res.status(400).json({ error: 'id_asesmen diperlukan' });
    }

    const generated = await generateAnalisisGuru({ idAsesmen });

    const analysis = generated.analysis || [];
    const tpIds = [...new Set(analysis.map((item: any) => Number(item.tp_asesmen)).filter((id: number) => Number.isFinite(id)))];

    let tpMap: Record<number, { id_tp: number; nama_tp: string }> = {};
    if (tpIds.length > 0) {
      const { data: tpList, error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);
      if (tpError) {
        return res.status(500).json({ error: tpError.message });
      }

      (tpList || []).forEach((tp: any) => {
        tpMap[tp.id_tp] = { id_tp: tp.id_tp, nama_tp: tp.nama_tp };
      });
    }

    const analysisWithTP = analysis.map((item: any) => ({
      ...item,
      tp_asesmen_detail: tpMap[item.tp_asesmen] || { id_tp: item.tp_asesmen, nama_tp: 'TP Unknown' },
    }));

    return res.status(200).json({
      summary: generated.summary,
      analysis: analysisWithTP,
    });
  } catch (error) {
    console.error('Error in GET /api/asesmen/analisis-guru:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan server' });
  }
}
