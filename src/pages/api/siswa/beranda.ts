import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

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
    const siswaId = parseId(req.query.id_siswa);

    if (!siswaId) {
      return res.status(400).json({ error: 'id_siswa wajib diisi' });
    }

    const { data: siswa, error: siswaError } = await supabaseAdmin
      .from('siswa')
      .select(
        `
        id_siswa,
        nama_siswa,
        email_siswa,
        kelas_siswa,
        lembaga_siswa,
        kelas:kelas_siswa (
          id_kelas,
          nama_kelas
        ),
        lembaga:lembaga_siswa (
          id_lembaga,
          nama_lembaga
        )
      `,
      )
      .eq('id_siswa', siswaId)
      .single();

    if (siswaError || !siswa) {
      return res.status(404).json({ error: 'Data siswa tidak ditemukan' });
    }

    const { data: elemenData, error: elemenError } = await supabaseAdmin
      .from('elemen')
      .select(
        `
        id_elemen,
        nama_elemen,
        sampul_elemen,
        deskripsi_elemen,
        guru_pengampu,
        guru:guru_pengampu (
          nama_guru
        ),
        kelas:kelas_elemen (
          id_kelas,
          nama_kelas
        )
      `,
      )
      .eq('kelas_elemen', siswa.kelas_siswa)
      .order('nama_elemen', { ascending: true });

    if (elemenError) {
      console.error('Error fetching elemen siswa:', elemenError);
      return res.status(500).json({ error: elemenError.message });
    }

    const elemenIds = (elemenData || []).map((item) => item.id_elemen);

    const { data: tujuanRows, error: tujuanError } = elemenIds.length
      ? await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp,nama_tp,elemen_tp').in('elemen_tp', elemenIds).order('id_tp', { ascending: true })
      : { data: [], error: null };

    if (tujuanError) {
      console.error('Error fetching tujuan pembelajaran:', tujuanError);
      return res.status(500).json({ error: tujuanError.message });
    }

    const tujuanByElemen = new Map<number, any[]>();
    (tujuanRows || []).forEach((item) => {
      const current = tujuanByElemen.get(item.elemen_tp) || [];
      current.push(item);
      tujuanByElemen.set(item.elemen_tp, current);
    });

    const elemenWithTujuan = (elemenData || []).map((item) => ({
      ...item,
      guru: Array.isArray((item as any).guru) ? (item as any).guru[0] || null : (item as any).guru || null,
      tujuan_pembelajaran: tujuanByElemen.get(item.id_elemen) || [],
    }));

    const { data: pblRows, error: pblError } = elemenIds.length ? await supabaseAdmin.from('pbl').select('id_pbl,id_elemen,judul_pbl').in('id_elemen', elemenIds) : { data: [], error: null };

    if (pblError) {
      console.error('Error fetching pbl rows:', pblError);
      return res.status(500).json({ error: pblError.message });
    }

    const pblIds = (pblRows || []).map((item) => item.id_pbl);

    const { data: sintakRows, error: sintakError } = pblIds.length ? await supabaseAdmin.from('sintak_pbl').select('id_sintak,id_pbl,waktu_selesai').in('id_pbl', pblIds) : { data: [], error: null };

    if (sintakError) {
      console.error('Error fetching sintak rows:', sintakError);
      return res.status(500).json({ error: sintakError.message });
    }

    const pblById = new Map<number, any>();
    (pblRows || []).forEach((item) => {
      pblById.set(item.id_pbl, item);
    });

    const pblDeadlines = (sintakRows || [])
      .filter((item) => item.waktu_selesai)
      .map((item) => {
        const pbl = pblById.get(item.id_pbl);
        return {
          jenis: 'pbl',
          id_deadline: `pbl-${item.id_sintak}`,
          id_sintak: item.id_sintak,
          tanggal: item.waktu_selesai,
          judul: pbl ? pbl.judul_pbl : 'PBL',
          id_elemen: pbl ? pbl.id_elemen : null,
        };
      });

    const { data: asesmenRows, error: asesmenError } = elemenIds.length ? await supabaseAdmin.from('asesmen').select('id_asesmen,id_elemen,judul_asesmen,waktu_terakhir').in('id_elemen', elemenIds) : { data: [], error: null };

    if (asesmenError) {
      console.error('Error fetching asesmen deadlines:', asesmenError);
      return res.status(500).json({ error: asesmenError.message });
    }

    const asesmenDeadlines = (asesmenRows || [])
      .filter((item) => item.waktu_terakhir)
      .map((item) => ({
        jenis: 'asesmen',
        id_deadline: `asesmen-${item.id_asesmen}`,
        id_asesmen: item.id_asesmen,
        tanggal: item.waktu_terakhir,
        judul: item.judul_asesmen || 'Asesmen',
        id_elemen: item.id_elemen || null,
      }));

    const deadlines = [...pblDeadlines, ...asesmenDeadlines];

    return res.status(200).json({
      siswa,
      elemen: elemenWithTujuan,
      deadlines,
    });
  } catch (error) {
    console.error('Error in GET /api/siswa/beranda:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
