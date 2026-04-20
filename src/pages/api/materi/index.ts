import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const lowered = message.toLowerCase();
  return lowered.includes('schema cache') || lowered.includes('could not find') || lowered.includes('column');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_guru } = req.query;

      if (!id_guru) {
        return res.status(400).json({ error: 'id_guru diperlukan' });
      }

      // Fetch all materi by guru with elemen data
      const { data, error } = await supabaseAdmin
        .from('materi')
        .select(
          `
          *,
          kelas:kelas_materi (
            id_kelas,
            nama_kelas
          ),
          elemen:id_elemen (
            id_elemen,
            nama_elemen,
            sampul_elemen
          ),
          guru:guru_materi (
            id_guru,
            nama_guru
          )
        `,
        )
        .eq('guru_materi', id_guru)
        .order('id_materi', { ascending: false });

      if (error) {
        console.error('❌ Error fetching materi:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({
          error: error.message,
          details: error,
          hint: 'Check if id_elemen column exists and is properly configured as FK to elemen table',
        });
      }

      console.log('✅ Materi fetched successfully:', data?.length, 'items');
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error in GET /api/materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'POST') {
    try {
      const { judul_materi, deskripsi_materi, file_materi, kelas_materi, guru_materi, id_elemen } = req.body;

      if (!judul_materi || !kelas_materi || !guru_materi) {
        return res.status(400).json({ error: 'Data tidak lengkap' });
      }

      let resolvedKelasMateri = Number(kelas_materi);
      if (!Number.isFinite(resolvedKelasMateri) || resolvedKelasMateri <= 0) {
        resolvedKelasMateri = NaN;
      }

      // Fallback ke kelas milik elemen saat kelas_materi dari client tidak valid.
      if ((!Number.isFinite(resolvedKelasMateri) || resolvedKelasMateri <= 0) && id_elemen) {
        const { data: elemenData } = await supabaseAdmin.from('elemen').select('kelas_elemen').eq('id_elemen', id_elemen).maybeSingle();
        const kelasDariElemen = Number(elemenData?.kelas_elemen);
        if (Number.isFinite(kelasDariElemen) && kelasDariElemen > 0) {
          resolvedKelasMateri = kelasDariElemen;
        }
      }

      if (!Number.isFinite(resolvedKelasMateri) || resolvedKelasMateri <= 0) {
        return res.status(400).json({ error: 'kelas_materi tidak valid' });
      }

      const basePayload = {
        judul_materi,
        deskripsi_materi: deskripsi_materi || '',
        file_materi: file_materi || '',
        kelas_materi: resolvedKelasMateri,
        guru_materi,
      };

      let insertQuery = supabaseAdmin
        .from('materi')
        .insert([
          {
            ...basePayload,
            id_elemen: id_elemen || null,
          },
        ])
        .select()
        .single();

      let { data, error } = await insertQuery;

      // Kompatibilitas schema: bila kolom id_elemen belum ada, ulangi tanpa kolom tsb.
      if (error && isMissingColumnError(error.message) && id_elemen) {
        const retry = await supabaseAdmin.from('materi').insert([basePayload]).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Error creating materi:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in POST /api/materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Metode ${req.method} tidak diizinkan`);
  }
}
