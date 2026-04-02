import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

function parseId(value: string | string[] | undefined): number | null {
  if (!value || Array.isArray(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getAsesmenById(idAsesmen: number) {
  let { data, error } = await supabaseAdmin.from('asesmen').select('id_asesmen,judul_asesmen,waktu_mulai,waktu_terakhir,durasi_asesmen,durasi_kuis,acak_soal').eq('id_asesmen', idAsesmen).single();

  if (error && error.message?.toLowerCase().includes('durasi_asesmen')) {
    const fallback = await supabaseAdmin.from('asesmen').select('id_asesmen,judul_asesmen,waktu_mulai,waktu_terakhir,durasi_kuis,acak_soal').eq('id_asesmen', idAsesmen).single();

    data = fallback.data as any;
    error = fallback.error;
  }

  if (error && error.message?.toLowerCase().includes('durasi_kuis')) {
    const fallback = await supabaseAdmin.from('asesmen').select('id_asesmen,judul_asesmen,waktu_mulai,waktu_terakhir,durasi_asesmen,acak_soal').eq('id_asesmen', idAsesmen).single();

    data = fallback.data as any;
    error = fallback.error;
  }

  return { data, error };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const idAsesmen = parseId(req.query.id_asesmen);
    const idSiswa = parseId(req.query.id_siswa);

    if (!idAsesmen || !idSiswa) {
      return res.status(400).json({ error: 'id_asesmen dan id_siswa wajib diisi' });
    }

    const { data: asesmen, error: asesmenError } = await getAsesmenById(idAsesmen);

    if (asesmenError || !asesmen) {
      return res.status(200).json({
        asesmen: null,
        soal: [],
        attempt: null,
        notFound: true,
        message: 'Asesmen tidak ditemukan',
      });
    }

    const { data: soalRows, error: soalError } = await supabaseAdmin
      .from('soal_asesmen')
      .select('id_soal,teks_soal,teks_jawaban,gambar_soal,nilai_soal,urutan_soal,tipe_soal,id_tp,kunci_teks')
      .eq('id_asesmen', idAsesmen)
      .order('urutan_soal', { ascending: true });

    if (soalError) {
      return res.status(500).json({ error: soalError.message });
    }

    const soalIds = (soalRows || []).map((item) => item.id_soal);

    const { data: pilihanRows, error: pilihanError } = soalIds.length
      ? await supabaseAdmin.from('pilihan_ganda').select('id_pilgan,id_soal,opsi_pilgan,urutan_pilgan,teks_pilgan,gambar_pilgan').in('id_soal', soalIds).order('urutan_pilgan', { ascending: true })
      : { data: [], error: null };

    if (pilihanError) {
      return res.status(500).json({ error: pilihanError.message });
    }

    const pilihanMap: Record<number, any[]> = {};
    (pilihanRows || []).forEach((row) => {
      if (!pilihanMap[row.id_soal]) {
        pilihanMap[row.id_soal] = [];
      }
      pilihanMap[row.id_soal].push(row);
    });

    const { data: attemptRows, error: attemptError } = await supabaseAdmin
      .from('asesmen_attempt')
      .select('id_attempt,skor_total,skor_maksimum,submitted_at,durasi_detik,status')
      .eq('id_asesmen', idAsesmen)
      .eq('id_siswa', idSiswa)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (attemptError && !attemptError.message?.includes('relation "public.asesmen_attempt" does not exist')) {
      return res.status(500).json({ error: attemptError.message });
    }

    const latestAttempt = (attemptRows || [])[0];
    let pendingValidation = false;

    if (latestAttempt && latestAttempt.status === 'submitted') {
      const { data: validasiRows, error: validasiError } = await supabaseAdmin.from('validasi_nilai').select('id_soal, status_validasi').eq('id_attempt', latestAttempt.id_attempt).eq('status_validasi', 'validated');

      if (validasiError) {
        return res.status(500).json({ error: validasiError.message });
      }

      const soalIdSet = new Set<number>(soalIds);
      const validatedSoalSet = new Set<number>((validasiRows || []).map((row: any) => Number(row.id_soal)).filter((id) => soalIdSet.has(id)));
      pendingValidation = soalIds.length > 0 && validatedSoalSet.size < soalIds.length;
    }

    // Prepare soal list
    let soalList = (soalRows || []).map((item) => ({
      ...item,
      pilihan_ganda: pilihanMap[item.id_soal] || [],
    }));

    // Log soal dengan teks_jawaban
    soalList.forEach((soal) => {
      if (soal.tipe_soal === 'baris_kode' && soal.teks_jawaban) {
        console.log(`✅ Soal baris_kode ${soal.id_soal} has teks_jawaban:`, soal.teks_jawaban.substring(0, 100));
      }
    });

    // Randomize soal if acak_soal is true
    if (asesmen?.acak_soal === true) {
      soalList = shuffleArray(soalList);
    }

    return res.status(200).json({
      asesmen,
      soal: soalList,
      attempt: latestAttempt && latestAttempt.status === 'submitted' ? latestAttempt : null,
      pending_validation: pendingValidation,
    });
  } catch (error) {
    console.error('Error in GET /api/siswa/asesmen/quiz:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
