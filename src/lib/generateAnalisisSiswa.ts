import supabaseAdmin from '@/lib/supabaseAdmin';

type GenerateAnalisisInput = {
  idAsesmen: number;
  idSiswa: number;
};

export async function generateAnalisisSiswa({ idAsesmen, idSiswa }: GenerateAnalisisInput) {
  const { data: attemptData, error: attemptError } = await supabaseAdmin.from('asesmen_attempt').select('answers_json').eq('id_asesmen', idAsesmen).eq('id_siswa', idSiswa).eq('status', 'submitted').single();

  if (attemptError || !attemptData) {
    throw new Error('Asesmen attempt tidak ditemukan');
  }

  const answersJson = attemptData.answers_json || {};

  const { data: allSoal, error: allSoalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal, tipe_soal, kunci_teks, id_tp').eq('id_asesmen', idAsesmen);

  if (allSoalError) {
    throw new Error(allSoalError.message);
  }

  const soalWithTP = (allSoal || []).filter((s: any) => s.id_tp !== null && s.id_tp !== undefined);

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
    [tpId: number]: { nama_tp: string; totalSoal: number; soalBenar: number };
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

  (soalWithTP as any[]).forEach((soal) => {
    const tpId = soal.id_tp;
    const soalId = soal.id_soal;

    if (!tpAnalysis[tpId]) {
      tpAnalysis[tpId] = {
        nama_tp: tpMap[tpId] || 'TP Unknown',
        totalSoal: 0,
        soalBenar: 0,
      };
    }

    tpAnalysis[tpId].totalSoal += 1;

    const studentAnswer = answersJson[String(soalId)];
    let isCorrect = false;

    if (soal.tipe_soal === 'pilihan_ganda') {
      const correctOption = kunciPilihanMap[soalId];
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
          normalized2 = soal.kunci_teks.toLowerCase().trim().replace(/\s+/g, ' ');
        } else {
          normalized1 = String(studentAnswer || '').trim();
          normalized2 = soal.kunci_teks.trim();
        }

        isCorrect = normalized1 === normalized2;
      }
    }

    if (isCorrect) {
      tpAnalysis[tpId].soalBenar += 1;
    }
  });

  const analisisRecords: any[] = [];
  Object.entries(tpAnalysis).forEach(([tpId, data]) => {
    const persentase = (data.soalBenar / data.totalSoal) * 100;

    let saran = '';
    if (persentase < 75) {
      saran = `Tujuan pembelajaran "${data.nama_tp}" memiliki ketercapaian ${Math.round(persentase)}% (kurang dari 75%). Anda perlu mempelajari materi "${data.nama_tp}" lebih mendalam. Ajarilah lebih banyak dan serius lagi menghadapi materi ini!`;
    } else {
      saran = `Selamat! Anda telah mencapai ketercapaian tujuan pembelajaran "${data.nama_tp}" sebesar ${Math.round(persentase)}%. Prestasi ini sangat baik, pertahankan dan terus tingkatkan kemampuan Anda!`;
    }

    analisisRecords.push({
      nama_asesmen: idAsesmen,
      nama_siswa: idSiswa,
      tp_asesmen: Number(tpId),
      persentase_tp_siswa: Math.round(persentase * 10) / 10,
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

  return { analysis: insertedData || [], message: 'Analisis berhasil dibuat' };
}
