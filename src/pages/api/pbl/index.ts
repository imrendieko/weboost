import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { PBL_SYNTAX_LABELS, normalizeAllowedSubmissionTypes, parseSintakContent, serializeLampiran, serializeSintakContent } from '@/lib/pbl';

interface SaveSintakBody {
  order: number;
  descriptionHtml: string;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  allowedSubmissionTypes: ('dokumen' | 'video' | 'tautan')[];
  lampiran: Array<{
    type: 'dokumen' | 'video' | 'tautan';
    label: string;
    url: string;
  }>;
}

const LAMPIRAN_COLUMN_CANDIDATES = ['lampiran_tugas', 'file_lampiran', 'lampiran', 'tautan_lampiran', 'url_lampiran'] as const;

function readLampiranValue(row: Record<string, unknown>): string {
  for (const key of LAMPIRAN_COLUMN_CANDIDATES) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return '';
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const lowered = message.toLowerCase();
  return lowered.includes('schema cache') || lowered.includes('could not find') || lowered.includes('column');
}

async function insertLampiranCompat(idSintak: number, lampiran: SaveSintakBody['lampiran'], descriptionHtml: string, waktuMulai: string | null, waktuSelesai: string | null): Promise<{ error: { message: string } | null }> {
  const normalizedLampiran = lampiran.length > 0 ? lampiran : [{ type: 'dokumen' as const, label: '', url: '' }];

  const preferredPayload = normalizedLampiran.map((item) => ({
    id_sintak: idSintak,
    lampiran_tugas: item.url ? serializeLampiran(item) : '',
    deskripsi_tugas: descriptionHtml || '',
    waktu_mulai: waktuMulai,
    waktu_terakhir: waktuSelesai,
  }));

  const preferredInsert = await supabaseAdmin.from('lampiran_pbl').insert(preferredPayload as any[]);
  if (!preferredInsert.error) {
    return { error: null };
  }

  if (!isMissingColumnError(preferredInsert.error.message)) {
    return { error: preferredInsert.error };
  }

  for (const columnName of LAMPIRAN_COLUMN_CANDIDATES) {
    const payload = normalizedLampiran
      .filter((item) => Boolean(item.url))
      .map((item) => ({
        id_sintak: idSintak,
        [columnName]: serializeLampiran(item),
      }));

    if (payload.length === 0) {
      continue;
    }

    const { error } = await supabaseAdmin.from('lampiran_pbl').insert(payload);
    if (!error) {
      return { error: null };
    }

    if (!isMissingColumnError(error.message)) {
      return { error };
    }
  }

  return { error: preferredInsert.error };
}

function parseNumber(value: string | string[] | undefined): number | null {
  if (!value || Array.isArray(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const elemenId = parseNumber(req.query.elemen);
    const guruId = parseNumber(req.query.guru);

    if (!elemenId || !guruId) {
      return res.status(400).json({ error: 'Parameter elemen dan guru wajib diisi' });
    }

    const { data: elemen, error: elemenError } = await supabaseAdmin
      .from('elemen')
      .select(
        `
        id_elemen,
        nama_elemen,
        deskripsi_elemen,
        kelas:kelas_elemen (
          id_kelas,
          nama_kelas
        )
      `,
      )
      .eq('id_elemen', elemenId)
      .single();

    if (elemenError || !elemen) {
      return res.status(404).json({ error: 'Data elemen tidak ditemukan' });
    }

    const { data: pblData, error: pblError } = await supabaseAdmin.from('pbl').select('*').eq('id_elemen', elemenId).eq('guru_pbl', guruId).order('id_pbl', { ascending: false }).limit(1).maybeSingle();

    if (pblError) {
      console.error('Error fetching pbl:', pblError);
      return res.status(500).json({ error: pblError.message });
    }

    const sintakRows = pblData ? await supabaseAdmin.from('sintak_pbl').select('*').eq('id_pbl', pblData.id_pbl).order('created_at', { ascending: true }) : { data: [], error: null };

    if (sintakRows.error) {
      console.error('Error fetching sintak_pbl:', sintakRows.error);
      return res.status(500).json({ error: sintakRows.error.message });
    }

    const sortedSintakRows = (sintakRows.data || [])
      .map((row, index) => ({
        ...row,
        parsedContent: parseSintakContent(row.deskripsi_sintak, index + 1),
      }))
      .sort((left, right) => left.parsedContent.order - right.parsedContent.order);

    const sintakIds = sortedSintakRows.map((row) => row.id_sintak);

    const [lampiranRows, pengumpulanRows, komentarRows, kelompokRows] = await Promise.all([
      sintakIds.length > 0 ? supabaseAdmin.from('lampiran_pbl').select('*').in('id_sintak', sintakIds).order('id_lampiran', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      sintakIds.length > 0
        ? supabaseAdmin
            .from('pengumpulan_pbl')
            .select(
              `
              *,
              kelompok:id_kelompok (
                id_kelompok,
                nama_kelompok
              ),
              siswa:id_siswa (
                id_siswa,
                nama_siswa,
                kelas:kelas_siswa (
                  id_kelas,
                  nama_kelas
                ),
                lembaga:lembaga_siswa (
                  id_lembaga,
                  nama_lembaga
                )
              )
            `,
            )
            .in('id_sintak', sintakIds)
            .order('waktu_pengumpulan', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      sintakIds.length > 0
        ? supabaseAdmin
            .from('komentar_pbl')
            .select(
              `
              *,
              guru:id_guru (
                id_guru,
                nama_guru
              ),
              siswa:id_siswa (
                id_siswa,
                nama_siswa
              )
            `,
            )
            .in('id_sintak', sintakIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      sintakIds.length > 0
        ? supabaseAdmin
            .from('kelompok_pbl')
            .select(
              `
              id_kelompok,
              id_sintak,
              nama_kelompok,
              created_at,
              anggota:anggota_kelompok (
                id_anggota,
                id_siswa,
                siswa:id_siswa (
                  id_siswa,
                  nama_siswa,
                  kelas:kelas_siswa (
                    id_kelas,
                    nama_kelas
                  ),
                  lembaga:lembaga_siswa (
                    id_lembaga,
                    nama_lembaga
                  )
                )
              )
            `,
            )
            .in('id_sintak', sintakIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (lampiranRows.error || pengumpulanRows.error || komentarRows.error || kelompokRows.error) {
      console.error('Error fetching related PBL data:', lampiranRows.error || pengumpulanRows.error || komentarRows.error || kelompokRows.error);
      return res.status(500).json({ error: 'Gagal memuat detail PBL' });
    }

    const sintaks = PBL_SYNTAX_LABELS.map((title, index) => {
      const order = index + 1;
      const row = sortedSintakRows.find((item) => item.parsedContent.order === order);
      const lampiranFromTable = (lampiranRows.data || [])
        .filter((item) => item.id_sintak === row?.id_sintak)
        .map((item) => ({
          ...item,
          file_lampiran: readLampiranValue(item as Record<string, unknown>),
        }))
        .filter((item) => typeof item.file_lampiran === 'string' && item.file_lampiran.trim().length > 0);

      const lampiranFromContent = ((row?.parsedContent.lampiran || []) as Array<{ type: 'dokumen' | 'video' | 'tautan'; label: string; url: string }>).map((item, itemIndex) => ({
        id_lampiran: -1 * (order * 1000 + itemIndex + 1),
        id_sintak: row?.id_sintak ?? null,
        file_lampiran: serializeLampiran(item),
      }));

      return {
        order,
        title,
        id_sintak: row?.id_sintak ?? null,
        descriptionHtml: row?.parsedContent.descriptionHtml ?? '',
        allowedSubmissionTypes: row?.parsedContent.allowedSubmissionTypes ?? ['dokumen'],
        waktu_mulai: row?.waktu_mulai ?? null,
        waktu_selesai: row?.waktu_selesai ?? null,
        lampiran: lampiranFromTable.length > 0 ? lampiranFromTable : lampiranFromContent,
        pengumpulan: (pengumpulanRows.data || []).filter((item) => item.id_sintak === row?.id_sintak),
        kelompok: (kelompokRows.data || []).filter((item) => item.id_sintak === row?.id_sintak),
        komentar: (komentarRows.data || []).filter((item) => item.id_sintak === row?.id_sintak),
      };
    });

    return res.status(200).json({
      elemen,
      pbl: pblData,
      sintaks,
    });
  } catch (error) {
    console.error('Error in GET /api/pbl:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id_elemen, id_guru, sintaks } = req.body as {
      id_elemen?: number;
      id_guru?: number;
      sintaks?: SaveSintakBody[];
    };

    if (!id_elemen || !id_guru || !Array.isArray(sintaks) || sintaks.length !== PBL_SYNTAX_LABELS.length) {
      return res.status(400).json({ error: 'Payload PBL tidak valid' });
    }

    const { data: elemen, error: elemenError } = await supabaseAdmin.from('elemen').select('nama_elemen').eq('id_elemen', id_elemen).single();
    if (elemenError || !elemen) {
      return res.status(404).json({ error: 'Elemen tidak ditemukan' });
    }

    const { data: existingPbl, error: pblError } = await supabaseAdmin.from('pbl').select('*').eq('id_elemen', id_elemen).eq('guru_pbl', id_guru).order('id_pbl', { ascending: false }).limit(1).maybeSingle();

    if (pblError) {
      console.error('Error fetching existing pbl:', pblError);
      return res.status(500).json({ error: pblError.message });
    }

    let pblId = existingPbl?.id_pbl;
    if (!pblId) {
      const { data: insertedPbl, error: insertPblError } = await supabaseAdmin
        .from('pbl')
        .insert([
          {
            id_elemen,
            judul_pbl: `PBL ${elemen.nama_elemen}`,
            deskripsi_pbl: `PBL untuk elemen ${elemen.nama_elemen}`,
            guru_pbl: id_guru,
          },
        ])
        .select()
        .single();

      if (insertPblError || !insertedPbl) {
        console.error('Error creating pbl:', insertPblError);
        return res.status(500).json({ error: insertPblError?.message || 'Gagal membuat data PBL' });
      }

      pblId = insertedPbl.id_pbl;
    } else {
      await supabaseAdmin
        .from('pbl')
        .update({
          judul_pbl: `PBL ${elemen.nama_elemen}`,
          deskripsi_pbl: `PBL untuk elemen ${elemen.nama_elemen}`,
        })
        .eq('id_pbl', pblId);
    }

    const { data: existingSintaks, error: sintakError } = await supabaseAdmin.from('sintak_pbl').select('*').eq('id_pbl', pblId);
    if (sintakError) {
      console.error('Error fetching existing sintak:', sintakError);
      return res.status(500).json({ error: sintakError.message });
    }

    const existingByOrder = new Map<number, any>();
    (existingSintaks || []).forEach((row, index) => {
      const parsed = parseSintakContent(row.deskripsi_sintak, index + 1);
      existingByOrder.set(parsed.order, row);
    });

    for (const sintak of sintaks) {
      const normalizedLampiran = (sintak.lampiran || []).map((lampiran) => ({
        type: lampiran.type,
        label: lampiran.label,
        url: lampiran.url,
      }));

      const payload = {
        id_pbl: pblId,
        deskripsi_sintak: serializeSintakContent({
          order: sintak.order,
          descriptionHtml: sintak.descriptionHtml,
          allowedSubmissionTypes: normalizeAllowedSubmissionTypes(sintak.allowedSubmissionTypes),
          lampiran: normalizedLampiran,
        }),
        waktu_mulai: sintak.waktu_mulai || null,
        waktu_selesai: sintak.waktu_selesai || null,
      };

      const existingSintak = existingByOrder.get(sintak.order);
      const upsertResponse = existingSintak ? await supabaseAdmin.from('sintak_pbl').update(payload).eq('id_sintak', existingSintak.id_sintak).select().single() : await supabaseAdmin.from('sintak_pbl').insert([payload]).select().single();

      if (upsertResponse.error || !upsertResponse.data) {
        console.error('Error saving sintak:', upsertResponse.error);
        return res.status(500).json({ error: upsertResponse.error?.message || 'Gagal menyimpan sintak PBL' });
      }

      await supabaseAdmin.from('lampiran_pbl').delete().eq('id_sintak', upsertResponse.data.id_sintak);

      const { error: lampiranError } = await insertLampiranCompat(upsertResponse.data.id_sintak, normalizedLampiran, sintak.descriptionHtml, sintak.waktu_mulai || null, sintak.waktu_selesai || null);
      if (lampiranError) {
        console.error('Error saving lampiran:', lampiranError);
        return res.status(500).json({ error: lampiranError.message });
      }
    }

    return res.status(200).json({ message: 'Sintak PBL berhasil disimpan' });
  } catch (error) {
    console.error('Error in POST /api/pbl:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
