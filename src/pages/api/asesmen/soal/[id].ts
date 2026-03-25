import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID soal diperlukan' });
  }

  const idSoal = parseInt(id, 10);

  if (req.method === 'GET') {
    try {
      // Get soal
      const { data: soalData, error } = await supabaseAdmin.from('soal_asesmen').select('*').eq('id_soal', idSoal).single();

      if (error) {
        console.error('Error fetching soal:', error);
        return res.status(500).json({ error: error.message });
      }

      // Fetch tujuan_pembelajaran if id_tp exists
      let tpData = null;
      if (soalData.id_tp) {
        const { data: tp } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').eq('id_tp', soalData.id_tp).single();
        tpData = tp;
      }

      // Fetch pilihan_ganda
      const { data: pilihanData } = await supabaseAdmin
        .from('pilihan_ganda')
        .select('id_pilgan, id_soal, opsi_pilgan, urutan_pilgan, teks_pilgan, gambar_pilgan, kunci_pilgan, created_at')
        .eq('id_soal', idSoal)
        .order('urutan_pilgan', { ascending: true });

      const result = {
        ...soalData,
        tp: tpData,
        pilihan_ganda: pilihanData || [],
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in GET /api/asesmen/soal/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { teks_soal, gambar_soal, teks_jawaban, nilai_soal, kunci_teks, tipe_soal, urutan_soal, id_tp, pilihan_ganda } = req.body;

      // Update soal_asesmen
      let soalError;

      ({ error: soalError } = await supabaseAdmin
        .from('soal_asesmen')
        .update({
          teks_soal,
          gambar_soal,
          teks_jawaban,
          nilai_soal,
          kunci_teks,
          tipe_soal,
          urutan_soal,
          id_tp,
        })
        .eq('id_soal', idSoal));

      if (soalError && soalError.message?.toLowerCase().includes('gambar_soal')) {
        ({ error: soalError } = await supabaseAdmin
          .from('soal_asesmen')
          .update({
            teks_soal,
            teks_jawaban,
            nilai_soal,
            kunci_teks,
            tipe_soal,
            urutan_soal,
            id_tp,
          })
          .eq('id_soal', idSoal));
      }

      if (soalError) {
        console.error('Error updating soal:', soalError);
        return res.status(500).json({ error: soalError.message });
      }

      if (tipe_soal === 'pilihan_ganda') {
        // Keep persistence deterministic across different DB constraints by rewriting choices.
        const { error: deletePilihanError } = await supabaseAdmin.from('pilihan_ganda').delete().eq('id_soal', idSoal);

        if (deletePilihanError) {
          console.error('Error deleting existing pilihan_ganda:', deletePilihanError);
          return res.status(500).json({ error: deletePilihanError.message });
        }

        if (Array.isArray(pilihan_ganda) && pilihan_ganda.length > 0) {
          const payload = pilihan_ganda.map((pilihan: any, index: number) => ({
            id_soal: idSoal,
            opsi_pilgan: pilihan.opsi_pilgan || String.fromCharCode(65 + index),
            urutan_pilgan: Number.isFinite(Number(pilihan.urutan_pilgan)) ? Number(pilihan.urutan_pilgan) : index + 1,
            teks_pilgan: pilihan.teks_pilgan || '',
            gambar_pilgan: pilihan.gambar_pilgan || '',
            kunci_pilgan: Boolean(pilihan.kunci_pilgan),
          }));

          const { error: insertPilihanError } = await supabaseAdmin.from('pilihan_ganda').insert(payload);

          if (insertPilihanError) {
            console.error('Error inserting pilihan_ganda:', insertPilihanError);
            return res.status(500).json({ error: insertPilihanError.message });
          }
        }
      } else {
        // Non pilihan_ganda questions should not keep stale options.
        const { error: cleanupPilihanError } = await supabaseAdmin.from('pilihan_ganda').delete().eq('id_soal', idSoal);
        if (cleanupPilihanError) {
          console.error('Error cleaning pilihan_ganda for non pilihan_ganda soal:', cleanupPilihanError);
          return res.status(500).json({ error: cleanupPilihanError.message });
        }
      }

      return res.status(200).json({ message: 'Soal berhasil diperbarui' });
    } catch (error) {
      console.error('Error in PUT /api/asesmen/soal/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete pilihan_ganda first
      await supabaseAdmin.from('pilihan_ganda').delete().eq('id_soal', idSoal);

      // Delete soal
      const { error } = await supabaseAdmin.from('soal_asesmen').delete().eq('id_soal', idSoal);

      if (error) {
        console.error('Error deleting soal:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Soal berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/asesmen/soal/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
