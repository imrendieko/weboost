import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

/**
 * Test endpoint untuk debug soal dan TP
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id_asesmen } = req.query;

    if (!id_asesmen) {
      return res.status(400).json({ error: 'id_asesmen diperlukan' });
    }

    const idAsesmen = parseInt(id_asesmen as string, 10);

    // 1. Get all soal
    const { data: allSoal } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, id_tp').eq('id_asesmen', idAsesmen);

    // 2. Get soal with TP
    const { data: soalWithTP } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, id_tp').eq('id_asesmen', idAsesmen).not('id_tp', 'is', null);

    // 3. Get TP list
    const tpIds = (allSoal || []).filter((s: any) => s.id_tp !== null).map((s: any) => s.id_tp) as number[];

    const { data: tpList } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);

    return res.status(200).json({
      status: 'debug',
      id_asesmen: idAsesmen,
      totalSoal: allSoal?.length || 0,
      soalWithTPCount: soalWithTP?.length || 0,
      tpCount: tpList?.length || 0,
      allSoal,
      soalWithTP,
      tpList,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: String(error) });
  }
}
