import { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

interface Jawaban {
  id_soal: string;
  urutan_soal: number;
  teks_soal: string;
  tipe_soal: string;
  nilai_soal: number;
  jawaban_siswa: string | null;
  kunci_jawaban: string | null; // Either opsi_pilgan or kunci_teks
  skor_asli: number;
  skor_tervalidasi: number | null;
  status_validasi: string | null;
}

interface JawabanResponse {
  id_attempt: string;
  jawaban: Jawaban[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id_siswa, id_asesmen } = req.query;

    if (!id_siswa || !id_asesmen) {
      return res.status(400).json({
        error: 'Missing required parameters: id_siswa, id_asesmen',
      });
    }

    // Fetch the attempt to get id_attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt, answers_json').eq('id_asesmen', id_asesmen).eq('id_siswa', id_siswa).eq('status', 'submitted').single();

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError);
      return res.status(404).json({
        error: 'Attempt not found',
      });
    }

    // Fetch soal for the assessment
    const { data: soalList, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('*').eq('id_asesmen', id_asesmen).order('urutan_soal', { ascending: true });

    if (soalError) throw soalError;

    // Fetch validation records
    const { data: validasiList, error: validasiError } = await supabaseAdmin.from('validasi_nilai').select('*').eq('id_attempt', attempt.id_attempt);

    if (validasiError) throw validasiError;

    // Fetch pilihan ganda for answer validation
    const { data: pilihanGandaList, error: pgError } = await supabaseAdmin.from('pilihan_ganda').select('id_soal, opsi_pilgan, kunci_pilgan');

    if (pgError) console.warn('Warning fetching pilihan ganda:', pgError);

    // Build pilihan ganda map: find correct option (where kunci_pilgan = true) for each soal
    const pilihanGandaMap: { [key: string]: string | null } = {};
    (pilihanGandaList || []).forEach((pg: any) => {
      // Only store if this is the correct answer (kunci_pilgan = true)
      if (pg.kunci_pilgan === true) {
        pilihanGandaMap[pg.id_soal] = pg.opsi_pilgan; // Store the option letter (A, B, C, etc)
      }
    });

    console.log('=== DEBUG jawaban-siswa API ===');
    console.log(
      'pilihanGandaList:',
      pilihanGandaList?.map((pg: any) => ({
        id_soal: pg.id_soal,
        opsi_pilgan: pg.opsi_pilgan,
        kunci_pilgan: pg.kunci_pilgan,
      })),
    );
    console.log('pilihanGandaMap (correct answers):', pilihanGandaMap);
    console.log('answers_json:', attempt?.answers_json);
    console.log('============================');

    // Combine data
    const answers_json = attempt?.answers_json || {};
    const jawabanList: Jawaban[] = soalList.map((soal: any) => {
      const jawabanSiswa = answers_json[soal.id_soal] || null;
      const validasi = validasiList?.find((v: any) => v.id_soal === soal.id_soal);

      // Calculate skor_asli if not already validated
      let skorAsli: number = 0;

      if (validasi) {
        // If already validated, use stored score
        skorAsli = validasi.skor_asli || 0;
      } else {
        // Calculate score from answer
        // Check kunci jawaban from pilihan_ganda table
        if (soal.tipe_soal === 'pilihan_ganda') {
          const kunciJawaban = pilihanGandaMap[soal.id_soal];
          console.log(`[Soal ${soal.id_soal}] Type: pilihan_ganda | KunciJawaban: "${kunciJawaban}" | JawabanSiswa: "${jawabanSiswa}"`);
          if (kunciJawaban && jawabanSiswa) {
            const jawab = jawabanSiswa.toString().trim().toUpperCase();
            const kunci = kunciJawaban.toString().trim().toUpperCase();
            const isCorrect = jawab === kunci;
            skorAsli = isCorrect ? soal.nilai_soal : 0;
            console.log(`[Soal ${soal.id_soal}] JawabanSiswa: "${jawab}" vs Kunci: "${kunci}" → ${isCorrect ? 'BENAR' : 'SALAH'} → Skor: ${skorAsli}/${soal.nilai_soal}`);
          } else {
            skorAsli = 0;
            console.log(`[Soal ${soal.id_soal}] Missing kunci atau jawaban | Kunci: ${kunciJawaban} | Jawaban: ${jawabanSiswa} → Skor: 0`);
          }
        } else if (soal.tipe_soal === 'esai' || soal.tipe_soal === 'uraian' || soal.tipe_soal === 'baris_kode') {
          // For essay/uraian/code, compare with kunci_teks
          const kunciTeks = soal.kunci_teks;
          console.log(`[Soal ${soal.id_soal}] Tipe: ${soal.tipe_soal} | KunciTeks: "${kunciTeks}" | JawabanSiswa: "${jawabanSiswa}"`);
          if (kunciTeks && jawabanSiswa) {
            const jawab = jawabanSiswa.toString().trim();
            const kunci = kunciTeks.toString().trim();
            const isCorrect = jawab === kunci;
            skorAsli = isCorrect ? soal.nilai_soal : 0;
            console.log(`[Soal ${soal.id_soal}] JawabanSiswa: "${jawab}" vs Kunci: "${kunci}" → ${isCorrect ? 'BENAR' : 'SALAH'} → Skor: ${skorAsli}/${soal.nilai_soal}`);
          } else {
            skorAsli = 0;
            console.log(`[Soal ${soal.id_soal}] Missing kunci_teks atau jawaban | Kunci: ${kunciTeks} | Jawaban: ${jawabanSiswa} → Skor: 0`);
          }
        } else {
          // Other types default to 0
          skorAsli = 0;
          console.log(`[Soal ${soal.id_soal}] Tipe: ${soal.tipe_soal} → Default 0`);
        }
      }

      // Determine kunci_jawaban for display
      let kunciJawabanDisplay: string | null = null;
      if (soal.tipe_soal === 'pilihan_ganda') {
        kunciJawabanDisplay = pilihanGandaMap[soal.id_soal] || null;
      } else if (soal.tipe_soal === 'esai' || soal.tipe_soal === 'uraian' || soal.tipe_soal === 'baris_kode') {
        kunciJawabanDisplay = soal.kunci_teks || null;
      }

      return {
        id_soal: soal.id_soal,
        urutan_soal: soal.urutan_soal,
        teks_soal: soal.teks_soal,
        tipe_soal: soal.tipe_soal,
        nilai_soal: soal.nilai_soal,
        jawaban_siswa: jawabanSiswa,
        kunci_jawaban: kunciJawabanDisplay,
        skor_asli: skorAsli,
        skor_tervalidasi: validasi?.skor_tervalidasi || null,
        status_validasi: validasi?.status_validasi || 'pending',
      };
    });

    const response: JawabanResponse = {
      id_attempt: attempt.id_attempt as string,
      jawaban: jawabanList,
    };

    // Add debug info
    (response as any)._debug = {
      pilihanGandaListCount: pilihanGandaList?.length,
      pilihanGandaListDetailed: pilihanGandaList?.map((pg: any) => ({
        id_soal: pg.id_soal,
        opsi_pilgan: pg.opsi_pilgan,
        kunci_pilgan: pg.kunci_pilgan,
      })),
      pilihanGandaMap: pilihanGandaMap, // Should now contain correct option letters (A, B, C, etc)
      answersJson: attempt?.answers_json,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching jawaban siswa:', error);
    res.status(500).json({
      error: 'Failed to fetch jawaban siswa',
      details: error.message,
    });
  }
}
