import supabaseAdmin from '@/lib/supabaseAdmin';

type GenerateAnalisisGuruInput = {
  idAsesmen: number;
};

type AttemptRow = {
  id_attempt: number;
  id_siswa: number;
  answers_json: Record<string, unknown> | null;
  skor_total: number;
  skor_maksimum: number;
  durasi_detik: number;
};

function isJawabanBenar(soal: any, studentAnswer: unknown, kunciPilihanMap: Record<number, string>) {
  let isCorrect = false;

  if (soal.tipe_soal === 'pilihan_ganda') {
    const correctOption = kunciPilihanMap[soal.id_soal];
    if (correctOption && studentAnswer === correctOption) {
      isCorrect = true;
    }
  } else if (soal.tipe_soal === 'uraian' || soal.tipe_soal === 'baris_kode') {
    if (studentAnswer && soal.kunci_teks) {
      let normalized1: string;
      let normalized2: string;

      if (soal.tipe_soal === 'uraian') {
        normalized1 = String(studentAnswer || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ');
        normalized2 = String(soal.kunci_teks || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ');
      } else {
        normalized1 = String(studentAnswer || '').trim();
        normalized2 = String(soal.kunci_teks || '').trim();
      }

      isCorrect = normalized1 === normalized2;
    }
  }

  return isCorrect;
}

export async function generateAnalisisGuru({ idAsesmen }: GenerateAnalisisGuruInput) {
  const { data: attempts, error: attemptsError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt, id_siswa, answers_json, skor_total, skor_maksimum, durasi_detik').eq('id_asesmen', idAsesmen).eq('status', 'submitted');

  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const submittedAttempts = (attempts || []) as AttemptRow[];

  const { data: allSoal, error: allSoalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, id_tp').eq('id_asesmen', idAsesmen);

  if (allSoalError) {
    throw new Error(allSoalError.message);
  }

  const soalWithTP = (allSoal || []).filter((soal: any) => soal.id_tp !== null && soal.id_tp !== undefined);

  const summary = {
    total_siswa: submittedAttempts.length,
    rata_rata_skor: submittedAttempts.length > 0 ? Math.round((submittedAttempts.reduce((sum, row) => sum + Number(row.skor_total || 0), 0) / submittedAttempts.length) * 10) / 10 : 0,
    rata_rata_maksimum: submittedAttempts.length > 0 ? Math.round((submittedAttempts.reduce((sum, row) => sum + Number(row.skor_maksimum || 0), 0) / submittedAttempts.length) * 10) / 10 : 0,
    rata_rata_durasi_detik: submittedAttempts.length > 0 ? Math.round(submittedAttempts.reduce((sum, row) => sum + Number(row.durasi_detik || 0), 0) / submittedAttempts.length) : 0,
  };

  if (soalWithTP.length === 0) {
    await supabaseAdmin.from('analisis_guru').delete().eq('nama_asesmen', idAsesmen);
    return { analysis: [] as any[], summary, message: 'Tidak ada soal dengan TP' };
  }

  const tpIds = [...new Set(soalWithTP.map((soal: any) => Number(soal.id_tp)))];

  const { data: tpList, error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);
  if (tpError) {
    throw new Error(tpError.message);
  }

  const tpMap: Record<number, string> = {};
  (tpList || []).forEach((tp: any) => {
    tpMap[tp.id_tp] = tp.nama_tp;
  });

  const soalIds = soalWithTP.map((soal: any) => soal.id_soal);
  const { data: pilihanList, error: pilihanError } = soalIds.length ? await supabaseAdmin.from('pilihan_ganda').select('id_soal, opsi_pilgan, kunci_pilgan').in('id_soal', soalIds) : { data: [], error: null };

  if (pilihanError) {
    throw new Error(pilihanError.message);
  }

  const kunciPilihanMap: Record<number, string> = {};
  (pilihanList || []).forEach((pilihan: any) => {
    if (pilihan.kunci_pilgan === true) {
      kunciPilihanMap[pilihan.id_soal] = pilihan.opsi_pilgan;
    }
  });

  const tpAnalysis: Record<
    number,
    {
      nama_tp: string;
      totalSoal: number;
      peluangTotal: number;
      jawabanBenar: number;
    }
  > = {};

  (soalWithTP as any[]).forEach((soal) => {
    const tpId = Number(soal.id_tp);
    if (!tpAnalysis[tpId]) {
      tpAnalysis[tpId] = {
        nama_tp: tpMap[tpId] || 'TP Unknown',
        totalSoal: 0,
        peluangTotal: 0,
        jawabanBenar: 0,
      };
    }

    tpAnalysis[tpId].totalSoal += 1;
  });

  Object.values(tpAnalysis).forEach((item) => {
    item.peluangTotal = item.totalSoal * submittedAttempts.length;
  });

  submittedAttempts.forEach((attempt) => {
    const answersJson = attempt.answers_json || {};

    (soalWithTP as any[]).forEach((soal) => {
      const tpId = Number(soal.id_tp);
      const studentAnswer = (answersJson as Record<string, unknown>)[String(soal.id_soal)];
      const correct = isJawabanBenar(soal, studentAnswer, kunciPilihanMap);
      if (correct) {
        tpAnalysis[tpId].jawabanBenar += 1;
      }
    });
  });

  const analisisRecords = Object.entries(tpAnalysis).map(([tpId, item]) => {
    const persentase = item.peluangTotal > 0 ? (item.jawabanBenar / item.peluangTotal) * 100 : 0;
    const persentaseRounded = Math.round(persentase * 10) / 10;

    const saranGuru =
      persentaseRounded < 75
        ? `Ketercapaian tujuan pembelajaran pada "${item.nama_tp}" masih rendah (${Math.round(persentaseRounded)}%). Anda harus mengajarkan lebih pada materi tersebut dan jangan lupa minta feedback terhadap materi yang sudah diajarkan. Semangat mencerdaskan bangsa!`
        : `Ketercapaian tujuan pembelajaran pada "${item.nama_tp}" sudah baik (${Math.round(persentaseRounded)}%). Pertahankan strategi pembelajaran saat ini, terus berikan latihan terarah, dan tetap minta feedback dari siswa agar kualitas pembelajaran semakin meningkat.`;

    return {
      nama_asesmen: idAsesmen,
      tp_asesmen: Number(tpId),
      persentase_tp_guru: persentaseRounded,
      saran_guru: saranGuru,
    };
  });

  await supabaseAdmin.from('analisis_guru').delete().eq('nama_asesmen', idAsesmen);

  if (analisisRecords.length === 0) {
    return { analysis: [] as any[], summary, message: 'Tidak ada analisis yang dibuat' };
  }

  const { data: insertedData, error: insertError } = await supabaseAdmin.from('analisis_guru').insert(analisisRecords).select();
  if (insertError) {
    throw new Error(insertError.message);
  }

  return { analysis: insertedData || [], summary, message: 'Analisis guru berhasil dibuat' };
}
