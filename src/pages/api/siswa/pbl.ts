import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { PBL_SYNTAX_LABELS, parseLampiran, parseSintakContent, serializeLampiran } from '@/lib/pbl';

const LAMPIRAN_COLUMN_CANDIDATES = ['file_lampiran', 'lampiran', 'tautan_lampiran', 'url_lampiran'] as const;

function readLampiranValue(row: Record<string, unknown>): string {
  for (const key of LAMPIRAN_COLUMN_CANDIDATES) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return '';
}

function parseId(value: string | string[] | undefined): number | null {
  if (!value || Array.isArray(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const elemenId = parseId(req.query.elemen);
    const siswaId = parseId(req.query.siswa);

    if (!elemenId || !siswaId) {
      return res.status(400).json({ error: 'Parameter elemen dan siswa wajib diisi' });
    }

    const { data: elemen, error: elemenError } = await supabaseAdmin
      .from('elemen')
      .select(
        `
        id_elemen,
        nama_elemen,
        kelas:kelas_elemen (
          id_kelas,
          nama_kelas
        )
      `,
      )
      .eq('id_elemen', elemenId)
      .single();

    if (elemenError || !elemen) {
      return res.status(404).json({ error: 'Elemen tidak ditemukan' });
    }

    const { data: pblData, error: pblError } = await supabaseAdmin.from('pbl').select('*').eq('id_elemen', elemenId).order('id_pbl', { ascending: false }).limit(1).maybeSingle();

    if (pblError) {
      console.error('Error fetching pbl for siswa:', pblError);
      return res.status(500).json({ error: pblError.message });
    }

    const sintakRows = pblData ? await supabaseAdmin.from('sintak_pbl').select('*').eq('id_pbl', pblData.id_pbl).order('created_at', { ascending: true }) : { data: [], error: null };

    if (sintakRows.error) {
      console.error('Error fetching sintak_pbl for siswa:', sintakRows.error);
      return res.status(500).json({ error: sintakRows.error.message });
    }

    const sortedSintakRows = (sintakRows.data || [])
      .map((row, index) => ({
        ...row,
        parsedContent: parseSintakContent(row.deskripsi_sintak, index + 1),
      }))
      .sort((left, right) => left.parsedContent.order - right.parsedContent.order);

    const sintakIds = sortedSintakRows.map((row) => row.id_sintak);

    const [lampiranRows, komentarRows, kelompokRows] = await Promise.all([
      sintakIds.length > 0 ? supabaseAdmin.from('lampiran_pbl').select('*').in('id_sintak', sintakIds).order('id_lampiran', { ascending: true }) : Promise.resolve({ data: [], error: null }),
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
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (lampiranRows.error || komentarRows.error || kelompokRows.error) {
      console.error('Error fetching related siswa PBL data:', lampiranRows.error || komentarRows.error || kelompokRows.error);
      return res.status(500).json({ error: 'Gagal memuat detail PBL siswa' });
    }

    const kelompokData = (kelompokRows.data || []) as Array<any>;
    const myKelompokIds = kelompokData.filter((group) => (group.anggota || []).some((member: any) => member.id_siswa === siswaId)).map((group) => group.id_kelompok);

    const { data: pengumpulanRows, error: pengumpulanError } = sintakIds.length
      ? await supabaseAdmin
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
          .or(`id_siswa.eq.${siswaId}${myKelompokIds.length > 0 ? `,id_kelompok.in.(${myKelompokIds.join(',')})` : ''}`)
          .order('waktu_pengumpulan', { ascending: false })
      : { data: [], error: null };

    if (pengumpulanError) {
      console.error('Error fetching pengumpulan siswa pbl:', pengumpulanError);
      return res.status(500).json({ error: pengumpulanError.message });
    }

    const sintaks = PBL_SYNTAX_LABELS.map((title, index) => {
      const order = index + 1;
      const row = sortedSintakRows.find((item) => item.parsedContent.order === order);
      const sintakKelompok = kelompokData.filter((item) => item.id_sintak === row?.id_sintak);
      const myKelompok = sintakKelompok.find((group) => (group.anggota || []).some((member: any) => member.id_siswa === siswaId)) || null;

      const pengumpulanSintak = (pengumpulanRows || []).filter((item: any) => item.id_sintak === row?.id_sintak);
      const mySubmission = myKelompok ? pengumpulanSintak.find((item: any) => item.id_kelompok === myKelompok.id_kelompok) || null : pengumpulanSintak.find((item: any) => item.id_siswa === siswaId) || null;

      const lampiranFromTable = ((lampiranRows.data || []) as Array<any>)
        .filter((item) => item.id_sintak === row?.id_sintak)
        .map((lampiran) => {
          const lampiranValue = readLampiranValue(lampiran as Record<string, unknown>);
          const parsed = parseLampiran(lampiranValue);
          return {
            id_lampiran: lampiran.id_lampiran,
            file_lampiran: lampiranValue,
            parsed,
          };
        })
        .filter((item) => typeof item.file_lampiran === 'string' && item.file_lampiran.trim().length > 0);

      const lampiranFromContent = ((row?.parsedContent.lampiran || []) as Array<{ type: 'dokumen' | 'video' | 'tautan'; label: string; url: string }>).map((item, itemIndex) => {
        const serialized = serializeLampiran(item);
        return {
          id_lampiran: -1 * (order * 1000 + itemIndex + 1),
          file_lampiran: serialized,
          parsed: parseLampiran(serialized),
        };
      });

      return {
        order,
        title,
        id_sintak: row?.id_sintak ?? null,
        descriptionHtml: row?.parsedContent.descriptionHtml ?? '',
        allowedSubmissionTypes: row?.parsedContent.allowedSubmissionTypes ?? ['dokumen'],
        waktu_mulai: row?.waktu_mulai ?? null,
        waktu_selesai: row?.waktu_selesai ?? null,
        lampiran: lampiranFromTable.length > 0 ? lampiranFromTable : lampiranFromContent,
        komentar: (komentarRows.data || []).filter((item) => item.id_sintak === row?.id_sintak),
        kelompok: sintakKelompok,
        myKelompok,
        mySubmission,
      };
    });

    return res.status(200).json({
      elemen,
      pbl: pblData,
      sintaks,
    });
  } catch (error) {
    console.error('Error in GET /api/siswa/pbl:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
