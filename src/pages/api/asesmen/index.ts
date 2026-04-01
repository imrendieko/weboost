import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_elemen } = req.query;

      if (!id_elemen) {
        return res.status(400).json({ error: 'id_elemen diperlukan' });
      }

      const idElemen = parseInt(id_elemen as string, 10);

      // Fetch all asesmen by elemen - explicitly select to ensure all fields are returned
      const { data, error } = await supabaseAdmin
        .from('asesmen')
        .select('*, kelas_asesmen, elemen_asesmen')
        .eq('id_elemen', idElemen)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching asesmen:', error);
        return res.status(500).json({ error: error.message });
      }

      // Fetch guru info separately if needed
      let result = data || [];

      if (result.length > 0) {
        // Get unique guru IDs
        const guruIds = [...new Set(result.map((a) => a.guru_asesmen))];

        if (guruIds.length > 0) {
          const { data: guruData } = await supabaseAdmin.from('guru').select('id_guru, nama_guru, email_guru').in('id_guru', guruIds);

          // Map guru data to asesmen
          const guruMap = (guruData || []).reduce((acc: any, g: any) => {
            acc[g.id_guru] = g;
            return acc;
          }, {});

          result = result.map((a) => ({
            ...a,
            guru: guruMap[a.guru_asesmen] || null,
          }));
        }
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in GET /api/asesmen:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { judul_asesmen, sampul_asesmen, guru_asesmen, id_elemen, nilai_asesmen, waktu_mulai, waktu_terakhir, durasi_asesmen, durasi_kuis, kelas_asesmen, elemen_asesmen } = req.body;

      console.log('📨 POST /api/asesmen received:', {
        judul_asesmen,
        guru_asesmen,
        id_elemen,
        waktu_mulai,
        waktu_terakhir,
        durasi_asesmen: durasi_asesmen ?? durasi_kuis,
      });

      // Validation
      if (!judul_asesmen || !guru_asesmen || !id_elemen) {
        return res.status(400).json({ error: 'judul_asesmen, guru_asesmen, dan id_elemen diperlukan' });
      }

      const payload: any = {
        judul_asesmen,
        sampul_asesmen: sampul_asesmen || '',
        guru_asesmen,
        id_elemen,
        nilai_asesmen: nilai_asesmen || 0,
        waktu_mulai,
        waktu_terakhir,
        durasi_asesmen: durasi_asesmen ?? durasi_kuis ?? null,
      };

      // Add optional fields only if provided
      if (kelas_asesmen !== undefined) payload.kelas_asesmen = kelas_asesmen;
      if (elemen_asesmen !== undefined) payload.elemen_asesmen = elemen_asesmen;

      let { data, error } = await supabaseAdmin.from('asesmen').insert([payload]).select().single();

      // Backward compatibility if DB column durasi_asesmen belum dibuat
      if (error && error.message?.toLowerCase().includes('durasi_asesmen')) {
        const fallbackOldColumn = await supabaseAdmin
          .from('asesmen')
          .insert([
            {
              judul_asesmen,
              sampul_asesmen: sampul_asesmen || '',
              guru_asesmen,
              id_elemen,
              nilai_asesmen: nilai_asesmen || 0,
              waktu_mulai,
              waktu_terakhir,
              durasi_kuis: durasi_asesmen ?? durasi_kuis ?? null,
            },
          ])
          .select()
          .single();

        data = fallbackOldColumn.data;
        error = fallbackOldColumn.error;
      }

      // Final fallback if neither duration column exists
      if (error && (error.message?.toLowerCase().includes('durasi_asesmen') || error.message?.toLowerCase().includes('durasi_kuis'))) {
        const fallback = await supabaseAdmin
          .from('asesmen')
          .insert([
            {
              judul_asesmen,
              sampul_asesmen: sampul_asesmen || '',
              guru_asesmen,
              id_elemen,
              nilai_asesmen: nilai_asesmen || 0,
              waktu_mulai,
              waktu_terakhir,
            },
          ])
          .select()
          .single();

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('❌ Supabase Error creating asesmen:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return res.status(500).json({
          error: error.message,
          code: error.code,
          details: error.details,
        });
      }

      console.log('✅ Asesmen created successfully:', data?.id_asesmen);
      return res.status(201).json(data);
    } catch (error) {
      console.error('❌ Error in POST /api/asesmen:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
