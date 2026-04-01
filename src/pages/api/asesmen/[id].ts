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
      const { data, error } = await supabaseAdmin.from('asesmen').select('*, kelas_asesmen, elemen_asesmen').eq('id_asesmen', idAsesmen).single();

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
      const { judul_asesmen, sampul_asesmen, waktu_mulai, waktu_terakhir, nilai_asesmen, durasi_asesmen, durasi_kuis, kelas_asesmen, elemen_asesmen } = req.body;

      const payload: any = {
        judul_asesmen,
        sampul_asesmen,
        waktu_mulai,
        waktu_terakhir,
        nilai_asesmen,
        durasi_asesmen: durasi_asesmen ?? durasi_kuis ?? null,
      };

      // Add optional fields only if provided
      if (kelas_asesmen !== undefined) payload.kelas_asesmen = kelas_asesmen;
      if (elemen_asesmen !== undefined) payload.elemen_asesmen = elemen_asesmen;

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
      console.log(`[DELETE ASESMEN] Starting deletion for idAsesmen: ${idAsesmen}`);

      // 1. Delete analisis_siswa (uses nama_asesmen as FK, not id_asesmen)
      console.log('[DELETE ASESMEN] Deleting analisis_siswa...');
      const del1 = await supabaseAdmin.from('analisis_siswa').delete().eq('nama_asesmen', idAsesmen);
      if (del1.error) {
        console.warn('[DELETE ASESMEN] Warning deleting analisis_siswa:', del1.error.message);
        // Continue even if this fails (table might not exist or might not have records)
      }

      // 2. Delete analisis_guru (uses nama_asesmen as FK, not id_asesmen)
      console.log('[DELETE ASESMEN] Deleting analisis_guru...');
      const del2 = await supabaseAdmin.from('analisis_guru').delete().eq('nama_asesmen', idAsesmen);
      if (del2.error) {
        console.warn('[DELETE ASESMEN] Warning deleting analisis_guru:', del2.error.message);
        // Continue even if this fails (table might not exist or might not have records)
      }

      // 3. Delete asesmen_attempt (references asesmen)
      console.log('[DELETE ASESMEN] Deleting asesmen_attempt...');
      const del3 = await supabaseAdmin.from('asesmen_attempt').delete().eq('id_asesmen', idAsesmen);
      if (del3.error) {
        console.error('[DELETE ASESMEN] Error deleting asesmen_attempt:', del3.error);
        return res.status(500).json({ error: 'Gagal menghapus attempt asesmen: ' + del3.error.message });
      }

      // 4. Delete soal_asesmen (references asesmen)
      console.log('[DELETE ASESMEN] Deleting soal_asesmen...');
      const del4 = await supabaseAdmin.from('soal_asesmen').delete().eq('id_asesmen', idAsesmen);
      if (del4.error) {
        console.error('[DELETE ASESMEN] Error deleting soal_asesmen:', del4.error);
        return res.status(500).json({ error: 'Gagal menghapus soal asesmen: ' + del4.error.message });
      }

      // 5. Finally, delete the asesmen itself
      console.log('[DELETE ASESMEN] Deleting asesmen...');
      const { error } = await supabaseAdmin.from('asesmen').delete().eq('id_asesmen', idAsesmen);

      if (error) {
        console.error('[DELETE ASESMEN] Error deleting asesmen:', error);
        return res.status(500).json({ error: 'Gagal menghapus asesmen: ' + error.message });
      }

      console.log(`[DELETE ASESMEN] Successfully deleted asesmen ${idAsesmen}`);
      return res.status(200).json({ message: 'Asesmen berhasil dihapus' });
    } catch (error) {
      console.error('[DELETE ASESMEN] Exception error:', error);
      return res.status(500).json({ error: 'Internal server error: ' + String(error) });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
