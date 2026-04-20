import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const lowered = message.toLowerCase();
  return lowered.includes('schema cache') || lowered.includes('could not find') || lowered.includes('column');
}

function normalizeMateriRow(row: any) {
  const judulMateri = typeof row?.judul_materi === 'string' && row.judul_materi.trim().length > 0 ? row.judul_materi : typeof row?.nama_materi === 'string' ? row.nama_materi : '';
  return {
    ...row,
    judul_materi: judulMateri,
  };
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

      const normalized = ((data as Array<any>) || []).map((item) => normalizeMateriRow(item));

      console.log('✅ Materi fetched successfully:', normalized.length, 'items');
      return res.status(200).json(normalized);
    } catch (error) {
      console.error('Error in GET /api/materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'POST') {
    try {
      const { judul_materi, nama_materi, deskripsi_materi, file_materi, kelas_materi, guru_materi, id_elemen } = req.body;
      const materiTitle = typeof judul_materi === 'string' && judul_materi.trim().length > 0 ? judul_materi.trim() : typeof nama_materi === 'string' ? nama_materi.trim() : '';

      if (!kelas_materi || !guru_materi) {
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
        deskripsi_materi: deskripsi_materi || '',
        file_materi: file_materi || '',
        kelas_materi: resolvedKelasMateri,
        guru_materi,
      };

      const candidatePayloads: Array<Record<string, any>> = [];

      if (materiTitle) {
        candidatePayloads.push({
          ...basePayload,
          judul_materi: materiTitle,
          ...(id_elemen ? { id_elemen } : {}),
        });
        candidatePayloads.push({
          ...basePayload,
          nama_materi: materiTitle,
          ...(id_elemen ? { id_elemen } : {}),
        });
      }

      // Fallback bila tabel materi tidak memiliki kolom judul/nama.
      candidatePayloads.push({
        ...basePayload,
        ...(id_elemen ? { id_elemen } : {}),
      });

      if (id_elemen) {
        if (materiTitle) {
          candidatePayloads.push({ ...basePayload, judul_materi: materiTitle });
          candidatePayloads.push({ ...basePayload, nama_materi: materiTitle });
        }
        candidatePayloads.push({ ...basePayload });
      }

      let data: any = null;
      let error: any = null;

      for (const payload of candidatePayloads) {
        const result = await supabaseAdmin.from('materi').insert([payload]).select().single();
        data = result.data;
        error = result.error;

        if (!error) {
          break;
        }

        if (!isMissingColumnError(error.message)) {
          break;
        }
      }

      if (error) {
        console.error('Error creating materi:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(normalizeMateriRow(data));
    } catch (error) {
      console.error('Error in POST /api/materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Metode ${req.method} tidak diizinkan`);
  }
}
