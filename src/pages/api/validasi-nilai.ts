import { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateAnalisisSiswa } from '@/lib/generateAnalisisSiswa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const { id_attempt, id_soal, skor_tervalidasi, jawaban_siswa, skor_asli } = req.body;

    if (!id_attempt || !id_soal || skor_tervalidasi === undefined) {
      return res.status(400).json({
        error: 'Field wajib belum lengkap: id_attempt, id_soal, skor_tervalidasi',
      });
    }

    const parsedSkorTervalidasi = Number(skor_tervalidasi);
    if (!Number.isFinite(parsedSkorTervalidasi)) {
      return res.status(400).json({ error: 'skor_tervalidasi harus berupa angka valid' });
    }

    const parsedSkorAsli = skor_asli === undefined || skor_asli === null ? null : Number(skor_asli);
    if (parsedSkorAsli !== null && !Number.isFinite(parsedSkorAsli)) {
      return res.status(400).json({ error: 'skor_asli harus berupa angka valid' });
    }

    const { data: soalData, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('nilai_soal').eq('id_soal', id_soal).single();

    if (soalError || !soalData) {
      return res.status(404).json({ error: 'Data soal tidak ditemukan' });
    }

    const skorMaksimumSoal = Number(soalData.nilai_soal || 0);
    if (parsedSkorTervalidasi < 0 || parsedSkorTervalidasi > skorMaksimumSoal) {
      return res.status(400).json({ error: `Nilai validasi harus antara 0 dan ${skorMaksimumSoal}` });
    }

    // Check if validation record already exists
    const { data: existingValidasi, error: checkError } = await supabaseAdmin.from('validasi_nilai').select('id_validasi').eq('id_attempt', id_attempt).eq('id_soal', id_soal).maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    const now = new Date().toISOString();

    let result;

    if (existingValidasi) {
      // Update existing validation
      const { data, error } = await supabaseAdmin
        .from('validasi_nilai')
        .update({
          skor_asli: parsedSkorAsli,
          skor_tervalidasi: parsedSkorTervalidasi,
          status_validasi: 'validated',
          updated_at: now,
        })
        .eq('id_validasi', existingValidasi.id_validasi)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new validation
      const { data, error } = await supabaseAdmin
        .from('validasi_nilai')
        .insert({
          id_attempt,
          id_soal,
          jawaban_siswa: jawaban_siswa || null,
          skor_asli: parsedSkorAsli,
          skor_tervalidasi: parsedSkorTervalidasi,
          status_validasi: 'validated',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Update skor_total in asesmen_attempt by calculating from all validasi_nilai for this attempt
    try {
      const { data: allValidasi } = await supabaseAdmin.from('validasi_nilai').select('skor_tervalidasi').eq('id_attempt', id_attempt);

      if (allValidasi && allValidasi.length > 0) {
        const totalSkor = allValidasi.reduce((sum: number, v: any) => sum + (v.skor_tervalidasi || 0), 0);

        const { error: updateError } = await supabaseAdmin
          .from('asesmen_attempt')
          .update({
            skor_total: totalSkor,
            updated_at: now,
          })
          .eq('id_attempt', id_attempt);

        if (updateError) {
          console.warn('Peringatan: Gagal memperbarui skor_total:', updateError);
        } else {
          console.log(`Updated skor_total for attempt ${id_attempt} to ${totalSkor}`);
        }
      }
    } catch (updateErr) {
      console.warn('Error updating skor_total:', updateErr);
      // Don't fail the validation if skor_total update fails
    }

    try {
      const { data: attemptData, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('id_asesmen, id_siswa').eq('id_attempt', id_attempt).single();

      if (!attemptError && attemptData) {
        await generateAnalisisSiswa({
          idAsesmen: Number(attemptData.id_asesmen),
          idSiswa: Number(attemptData.id_siswa),
        });
      }
    } catch (analysisError) {
      console.warn('Peringatan: gagal membuat ulang analisis siswa setelah validasi:', analysisError);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: existingValidasi ? 'Validasi updated' : 'Validasi created',
    });
  } catch (error: any) {
    console.error('Error saving validasi nilai:', error);
    res.status(500).json({
      error: 'Gagal menyimpan validasi nilai',
      details: error.message,
    });
  }
}
