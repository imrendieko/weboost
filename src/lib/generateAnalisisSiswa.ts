import supabaseAdmin from '@/lib/supabaseAdmin';
import { calculateTPPercentage, getTPStatus, resolveQuestionScore, roundToOneDecimal, type SoalWithTP } from '@/lib/tpAchievement';

type GenerateAnalisisInput = {
  idAsesmen: number;
  idSiswa: number;
};

export async function generateAnalisisSiswa({ idAsesmen, idSiswa }: GenerateAnalisisInput) {
  const { data: attemptData, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt, answers_json').eq('id_asesmen', idAsesmen).eq('id_siswa', idSiswa).eq('status', 'submitted').single();

  if (attemptError || !attemptData) {
    throw new Error('Asesmen attempt tidak ditemukan');
  }

  const answersJson = attemptData.answers_json || {};

  const { data: allSoal, error: allSoalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, id_tp, nilai_soal').eq('id_asesmen', idAsesmen);

  if (allSoalError) {
    throw new Error(allSoalError.message);
  }

  const soalWithTP = ((allSoal || []) as SoalWithTP[]).filter((s) => s.id_tp !== null && s.id_tp !== undefined);

  if (soalWithTP.length === 0) {
    return { analysis: [] as any[], message: 'Tidak ada soal dengan TP' };
  }

  const tpIds = [...new Set(soalWithTP.map((s: any) => s.id_tp))];
  const { data: tpList, error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);

  if (tpError) {
    throw new Error(tpError.message);
  }

  const tpMap: { [id: number]: string } = {};
  const tpAnalysis: {
    [tpId: number]: {
      nama_tp: string;
      total_skor_siswa: number;
      total_skor_maksimum: number;
    };
  } = {};

  (tpList || []).forEach((tp: any) => {
    tpMap[tp.id_tp] = tp.nama_tp;
  });

  const soalIds = soalWithTP.map((s: any) => s.id_soal);
  const { data: pilihanList, error: pilihanError } = soalIds.length ? await supabaseAdmin.from('pilihan_ganda').select('id_soal, opsi_pilgan, kunci_pilgan').in('id_soal', soalIds) : { data: [], error: null };

  if (pilihanError) {
    throw new Error(pilihanError.message);
  }

  const kunciPilihanMap: { [soalId: number]: string } = {};
  (pilihanList || []).forEach((pilihan: any) => {
    if (pilihan.kunci_pilgan === true) {
      kunciPilihanMap[pilihan.id_soal] = pilihan.opsi_pilgan;
    }
  });

  const { data: validasiRows, error: validasiError } = await supabaseAdmin.from('validasi_nilai').select('id_soal, skor_tervalidasi, skor_asli').eq('id_attempt', attemptData.id_attempt);

  if (validasiError) {
    throw new Error(validasiError.message);
  }

  const validasiMap: { [soalId: number]: { skor_tervalidasi: number | null; skor_asli: number | null } } = {};
  (validasiRows || []).forEach((row: any) => {
    validasiMap[Number(row.id_soal)] = {
      skor_tervalidasi: row.skor_tervalidasi,
      skor_asli: row.skor_asli,
    };
  });

  (soalWithTP as any[]).forEach((soal) => {
    const tpId = soal.id_tp;
    const soalId = soal.id_soal;

    if (!tpAnalysis[tpId]) {
      tpAnalysis[tpId] = {
        nama_tp: tpMap[tpId] || 'TP Unknown',
        total_skor_siswa: 0,
        total_skor_maksimum: 0,
      };
    }
    const studentAnswer = answersJson[String(soalId)];
    const skorMaksimumSoal = Number(soal.nilai_soal || 0);
    const validasi = validasiMap[soalId];

    const skorSiswaSoal = resolveQuestionScore({
      soal,
      studentAnswer,
      validatedScore: validasi?.skor_tervalidasi,
      fallbackScore: validasi?.skor_asli,
      kunciPilihan: kunciPilihanMap[soalId],
    });

    tpAnalysis[tpId].total_skor_siswa += skorSiswaSoal;
    tpAnalysis[tpId].total_skor_maksimum += skorMaksimumSoal;
  });

  const analisisRecords: any[] = [];
  const computedMap: Record<number, { total_skor_siswa: number; total_skor_maksimum: number; persentase_tp: number; status_tp: string }> = {};

  Object.entries(tpAnalysis).forEach(([tpId, data]) => {
    const persentaseMentah = calculateTPPercentage(data.total_skor_siswa, data.total_skor_maksimum);
    const persentase = roundToOneDecimal(persentaseMentah);
    const status = getTPStatus(persentaseMentah);

    const saran =
      status === 'Belum'
        ? `Ketercapaian TP "${data.nama_tp}" masih rendah (${Math.round(persentase)}%). Fokuskan latihan tambahan dan pendalaman konsep pada TP ini.`
        : status === 'Cukup'
          ? `Ketercapaian TP "${data.nama_tp}" sudah cukup (${Math.round(persentase)}%). Tingkatkan konsistensi dengan latihan bertahap agar mencapai kategori Tercapai.`
          : `Ketercapaian TP "${data.nama_tp}" sudah tercapai (${Math.round(persentase)}%). Pertahankan performa dan lanjutkan penguatan materi.`;

    computedMap[Number(tpId)] = {
      total_skor_siswa: roundToOneDecimal(data.total_skor_siswa),
      total_skor_maksimum: roundToOneDecimal(data.total_skor_maksimum),
      persentase_tp: persentase,
      status_tp: status,
    };

    analisisRecords.push({
      nama_asesmen: idAsesmen,
      nama_siswa: idSiswa,
      tp_asesmen: Number(tpId),
      persentase_tp_siswa: persentase,
      saran_siswa: saran,
    });
  });

  if (analisisRecords.length === 0) {
    return { analysis: [] as any[], message: 'Tidak ada analisis yang dibuat' };
  }

  await supabaseAdmin.from('analisis_siswa').delete().eq('nama_asesmen', idAsesmen).eq('nama_siswa', idSiswa);

  const { data: insertedData, error: insertError } = await supabaseAdmin.from('analisis_siswa').insert(analisisRecords).select();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const enriched = (insertedData || []).map((row: any) => ({
    ...row,
    ...(computedMap[Number(row.tp_asesmen)] || {
      total_skor_siswa: 0,
      total_skor_maksimum: 0,
      persentase_tp: Number(row.persentase_tp_siswa || 0),
      status_tp: getTPStatus(Number(row.persentase_tp_siswa || 0)),
    }),
  }));

  return { analysis: enriched, message: 'Analisis berhasil dibuat' };
}
