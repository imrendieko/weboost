import { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id_attempt, id_soal, skor_tervalidasi, jawaban_siswa, skor_asli } = req.body;

    if (!id_attempt || !id_soal || skor_tervalidasi === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: id_attempt, id_soal, skor_tervalidasi',
      });
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
          skor_asli: skor_asli || null,
          skor_tervalidasi,
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
          skor_asli: skor_asli || null,
          skor_tervalidasi,
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
          console.warn('Warning: Could not update skor_total:', updateError);
        } else {
          console.log(`Updated skor_total for attempt ${id_attempt} to ${totalSkor}`);
        }
      }
    } catch (updateErr) {
      console.warn('Error updating skor_total:', updateErr);
      // Don't fail the validation if skor_total update fails
    }

    res.status(200).json({
      success: true,
      data: result,
      message: existingValidasi ? 'Validasi updated' : 'Validasi created',
    });
  } catch (error: any) {
    console.error('Error saving validasi nilai:', error);
    res.status(500).json({
      error: 'Failed to save validasi nilai',
      details: error.message,
    });
  }
}
