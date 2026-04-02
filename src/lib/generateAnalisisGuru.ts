import supabaseAdmin from '@/lib/supabaseAdmin';
import { calculateTPPercentage, getTPStatus, resolveQuestionScore, roundToOneDecimal, type SoalWithTP } from '@/lib/tpAchievement';

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

export async function generateAnalisisGuru({ idAsesmen }: GenerateAnalisisGuruInput) {
  const { data: attempts, error: attemptsError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt, id_siswa, answers_json, skor_total, skor_maksimum, durasi_detik').eq('id_asesmen', idAsesmen).eq('status', 'submitted');

  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const submittedAttempts = (attempts || []) as AttemptRow[];

  const { data: allSoal, error: allSoalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, id_tp, nilai_soal').eq('id_asesmen', idAsesmen);

  if (allSoalError) {
    throw new Error(allSoalError.message);
  }

  const soalWithTP = ((allSoal || []) as SoalWithTP[]).filter((soal) => soal.id_tp !== null && soal.id_tp !== undefined);

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

  const attemptIds = submittedAttempts.map((attempt) => attempt.id_attempt);
  const { data: validasiRows, error: validasiError } = attemptIds.length ? await supabaseAdmin.from('validasi_nilai').select('id_attempt, id_soal, skor_tervalidasi, skor_asli').in('id_attempt', attemptIds) : { data: [], error: null };

  if (validasiError) {
    throw new Error(validasiError.message);
  }

  const validasiMap: Record<string, { skor_tervalidasi: number | null; skor_asli: number | null }> = {};
  (validasiRows || []).forEach((row: any) => {
    validasiMap[`${row.id_attempt}:${row.id_soal}`] = {
      skor_tervalidasi: row.skor_tervalidasi,
      skor_asli: row.skor_asli,
    };
  });

  const tpAnalysis: Record<
    number,
    {
      nama_tp: string;
      total_skor_siswa: number;
      total_skor_maksimum: number;
    }
  > = {};

  (soalWithTP as any[]).forEach((soal) => {
    const tpId = Number(soal.id_tp);
    if (!tpAnalysis[tpId]) {
      tpAnalysis[tpId] = {
        nama_tp: tpMap[tpId] || 'TP Unknown',
        total_skor_siswa: 0,
        total_skor_maksimum: 0,
      };
    }
  });

  submittedAttempts.forEach((attempt) => {
    const answersJson = attempt.answers_json || {};

    (soalWithTP as any[]).forEach((soal) => {
      const tpId = Number(soal.id_tp);
      const studentAnswer = (answersJson as Record<string, unknown>)[String(soal.id_soal)];
      const validasi = validasiMap[`${attempt.id_attempt}:${soal.id_soal}`];
      const skorMaksimumSoal = Number(soal.nilai_soal || 0);

      const skorSiswaSoal = resolveQuestionScore({
        soal,
        studentAnswer,
        validatedScore: validasi?.skor_tervalidasi,
        fallbackScore: validasi?.skor_asli,
        kunciPilihan: kunciPilihanMap[soal.id_soal],
      });

      tpAnalysis[tpId].total_skor_siswa += skorSiswaSoal;
      tpAnalysis[tpId].total_skor_maksimum += skorMaksimumSoal;
    });
  });

  const computedMap: Record<number, { total_skor_siswa: number; total_skor_maksimum: number; persentase_tp: number; status_tp: string }> = {};
  const analisisRecords = Object.entries(tpAnalysis).map(([tpId, item]) => {
    const persentaseRaw = calculateTPPercentage(item.total_skor_siswa, item.total_skor_maksimum);
    const persentaseRounded = roundToOneDecimal(persentaseRaw);
    const status = getTPStatus(persentaseRaw);

    const saranGuru =
      status === 'Belum'
        ? `Ketercapaian TP "${item.nama_tp}" masih rendah (${Math.round(persentaseRounded)}%). Lakukan remedial terarah dan perkuat konsep inti pada TP ini.`
        : status === 'Cukup'
          ? `Ketercapaian TP "${item.nama_tp}" berada pada level cukup (${Math.round(persentaseRounded)}%). Tambahkan latihan bertahap agar siswa bergerak ke kategori Tercapai.`
          : `Ketercapaian TP "${item.nama_tp}" sudah baik (${Math.round(persentaseRounded)}%). Pertahankan strategi pembelajaran dan lanjutkan penguatan soal berbobot.`;

    computedMap[Number(tpId)] = {
      total_skor_siswa: roundToOneDecimal(item.total_skor_siswa),
      total_skor_maksimum: roundToOneDecimal(item.total_skor_maksimum),
      persentase_tp: persentaseRounded,
      status_tp: status,
    };

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

  const enriched = (insertedData || []).map((row: any) => ({
    ...row,
    ...(computedMap[Number(row.tp_asesmen)] || {
      total_skor_siswa: 0,
      total_skor_maksimum: 0,
      persentase_tp: Number(row.persentase_tp_guru || 0),
      status_tp: getTPStatus(Number(row.persentase_tp_guru || 0)),
    }),
  }));

  return { analysis: enriched, summary, message: 'Analisis guru berhasil dibuat' };
}
