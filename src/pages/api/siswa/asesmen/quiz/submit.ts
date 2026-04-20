import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateAnalisisSiswa } from '@/lib/generateAnalisisSiswa';

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const idSiswa = parseNumber(req.body.id_siswa);
    const idAsesmen = parseNumber(req.body.id_asesmen);
    const startedAt = typeof req.body.started_at === 'string' ? req.body.started_at : null;
    const answers = typeof req.body.answers === 'object' && req.body.answers ? req.body.answers : {};

    if (!idSiswa || !idAsesmen || !startedAt) {
      return res.status(400).json({ error: 'id_siswa, id_asesmen, dan started_at wajib diisi' });
    }

    const { data: siswaData, error: siswaError } = await supabaseAdmin.from('siswa').select('id_siswa,status_siswa').eq('id_siswa', idSiswa).maybeSingle();

    if (siswaError) {
      return res.status(500).json({ error: 'Gagal memverifikasi data siswa' });
    }

    if (!siswaData) {
      return res.status(401).json({ error: 'Sesi siswa tidak valid. Silakan login ulang.' });
    }

    const { data: existingAttempt, error: existingError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt,status').eq('id_asesmen', idAsesmen).eq('id_siswa', idSiswa).eq('status', 'submitted').limit(1);

    if (existingError) {
      if (existingError.message?.includes('relation "public.asesmen_attempt" does not exist')) {
        return res.status(500).json({
          error: 'Tabel asesmen_attempt belum tersedia. Jalankan SQL_CREATE_ASESMEN_ATTEMPT_TABLE.sql terlebih dahulu.',
        });
      }
      return res.status(500).json({ error: existingError.message });
    }

    if ((existingAttempt || []).length > 0) {
      return res.status(409).json({ error: 'Asesmen ini sudah pernah Anda kerjakan.' });
    }

    const { data: soalRows, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal,nilai_soal,tipe_soal,kunci_teks').eq('id_asesmen', idAsesmen);

    if (soalError) {
      return res.status(500).json({ error: soalError.message });
    }

    const soalIds = (soalRows || []).map((item) => item.id_soal);

    const { data: pilihanRows, error: pilihanError } = soalIds.length ? await supabaseAdmin.from('pilihan_ganda').select('id_soal,opsi_pilgan,kunci_pilgan').in('id_soal', soalIds) : { data: [], error: null };

    if (pilihanError) {
      return res.status(500).json({ error: pilihanError.message });
    }

    const kunciPilihanMap: Record<number, string> = {};
    (pilihanRows || []).forEach((item) => {
      if (item.kunci_pilgan) {
        kunciPilihanMap[item.id_soal] = item.opsi_pilgan;
      }
    });

    let skorTotal = 0;
    let skorMaksimum = 0;

    for (const soal of soalRows || []) {
      const nilaiSoal = Number(soal.nilai_soal || 0);
      skorMaksimum += nilaiSoal;

      const jawaban = typeof (answers as any)[String(soal.id_soal)] === 'string' ? String((answers as any)[String(soal.id_soal)]) : '';

      if (soal.tipe_soal === 'pilihan_ganda') {
        // Exact match dengan opsi_pilgan yang memiliki kunci_pilgan = true
        if (jawaban && jawaban === (kunciPilihanMap[soal.id_soal] || '')) {
          skorTotal += nilaiSoal;
        }
        continue;
      }

      if (soal.tipe_soal === 'uraian') {
        // Normalize dan bandingkan
        if (normalizeText(jawaban || '') === normalizeText(soal.kunci_teks || '')) {
          skorTotal += nilaiSoal;
        }
        continue;
      }

      if (soal.tipe_soal === 'baris_kode') {
        // Exact match setelah trim
        if ((jawaban || '').trim() === (soal.kunci_teks || '').trim()) {
          skorTotal += nilaiSoal;
        }
      }
    }

    const now = new Date();
    const started = new Date(startedAt);
    const durasiDetik = Number.isNaN(started.getTime()) ? 0 : Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('asesmen_attempt')
      .insert([
        {
          id_asesmen: idAsesmen,
          id_siswa: idSiswa,
          answers_json: answers,
          skor_total: skorTotal,
          skor_maksimum: skorMaksimum,
          durasi_detik: durasiDetik,
          started_at: startedAt,
          submitted_at: now.toISOString(),
          status: 'submitted',
        },
      ])
      .select('id_attempt,skor_total,skor_maksimum,durasi_detik,submitted_at')
      .single();

    if (insertError) {
      if (insertError.message?.includes('relation "public.asesmen_attempt" does not exist')) {
        return res.status(500).json({
          error: 'Tabel asesmen_attempt belum tersedia. Jalankan SQL_CREATE_ASESMEN_ATTEMPT_TABLE.sql terlebih dahulu.',
        });
      }

      if (insertError.message?.toLowerCase().includes('fk_attempt_siswa')) {
        return res.status(400).json({ error: 'Data siswa tidak ditemukan. Silakan logout lalu login kembali.' });
      }

      if (insertError.message?.toLowerCase().includes('fk_attempt_asesmen')) {
        return res.status(400).json({ error: 'Data asesmen tidak ditemukan atau sudah tidak tersedia.' });
      }

      return res.status(500).json({ error: 'Gagal menyimpan pengumpulan asesmen' });
    }

    try {
      await generateAnalisisSiswa({ idAsesmen, idSiswa });
    } catch (analyzeError) {
      console.error('Analisis otomatis gagal dibuat:', analyzeError);
      // attempt sudah tersimpan; analisis masih bisa digenerate ulang manual via endpoint fallback
    }

    return res.status(200).json({
      message: 'Asesmen berhasil dikumpulkan',
      attempt: inserted,
    });
  } catch (error) {
    console.error('Error in POST /api/siswa/asesmen/quiz/submit:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
