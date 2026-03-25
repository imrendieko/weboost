import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID asesmen diperlukan' });
  }

  const idAsesmen = parseInt(id, 10);

  if (req.method === 'GET') {
    try {
      // Get asesmen with related data
      const { data, error } = await supabaseAdmin.from('asesmen').select('*').eq('id_asesmen', idAsesmen).single();

      if (error) {
        console.error('Error fetching asesmen:', error);
        return res.status(500).json({ error: error.message });
      }

      // Fetch guru data separately
      const { data: guruData } = await supabaseAdmin.from('guru').select('id_guru, nama_guru, email_guru').eq('id_guru', data.guru_asesmen).single();

      // Fetch elemen data separately
      const { data: elemenData } = await supabaseAdmin.from('elemen').select('id_elemen, nama_elemen, sampul_elemen').eq('id_elemen', data.id_elemen).single();

      // Fetch soal data
      const { data: soalData } = await supabaseAdmin.from('soal_asesmen').select('id_soal, teks_soal, nilai_soal, urutan_soal, tipe_soal, id_tp').eq('id_asesmen', idAsesmen);

      const result = {
        ...data,
        guru: guruData,
        elemen: elemenData,
        soal: soalData || [],
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in GET /api/asesmen/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { judul_asesmen, sampul_asesmen, waktu_mulai, waktu_terakhir, nilai_asesmen, durasi_asesmen, durasi_kuis } = req.body;

      const payload = {
        judul_asesmen,
        sampul_asesmen,
        waktu_mulai,
        waktu_terakhir,
        nilai_asesmen,
        durasi_asesmen: durasi_asesmen ?? durasi_kuis ?? null,
      };

      let { data, error } = await supabaseAdmin.from('asesmen').update(payload).eq('id_asesmen', idAsesmen).select().single();

      // Backward compatibility if DB column durasi_asesmen belum dibuat
      if (error && error.message?.toLowerCase().includes('durasi_asesmen')) {
        const fallbackOldColumn = await supabaseAdmin
          .from('asesmen')
          .update({
            judul_asesmen,
            sampul_asesmen,
            waktu_mulai,
            waktu_terakhir,
            nilai_asesmen,
            durasi_kuis: durasi_asesmen ?? durasi_kuis ?? null,
          })
          .eq('id_asesmen', idAsesmen)
          .select()
          .single();

        data = fallbackOldColumn.data;
        error = fallbackOldColumn.error;
      }

      // Final fallback if neither duration column exists
      if (error && (error.message?.toLowerCase().includes('durasi_asesmen') || error.message?.toLowerCase().includes('durasi_kuis'))) {
        const fallback = await supabaseAdmin
          .from('asesmen')
          .update({
            judul_asesmen,
            sampul_asesmen,
            waktu_mulai,
            waktu_terakhir,
            nilai_asesmen,
          })
          .eq('id_asesmen', idAsesmen)
          .select()
          .single();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('Error updating asesmen:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in PUT /api/asesmen/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete all soal_asesmen first
      await supabaseAdmin.from('soal_asesmen').delete().eq('id_asesmen', idAsesmen);

      // Delete asesmen
      const { error } = await supabaseAdmin.from('asesmen').delete().eq('id_asesmen', idAsesmen);

      if (error) {
        console.error('Error deleting asesmen:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Asesmen berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/asesmen/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
