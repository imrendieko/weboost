import { resolveQuestionScore, roundToOneDecimal, type SoalWithTP } from '@/lib/tpAchievement';

type SoalScoreRow = {
  id_soal: number;
  tipe_soal: string;
  kunci_teks: string | null;
  nilai_soal: number | null;
  id_tp?: number | null;
};

type ValidasiScore = {
  skor_tervalidasi: number | null;
  skor_asli: number | null;
};

export function buildKunciPilihanMap(pilihanList: Array<{ id_soal: number; opsi_pilgan: string; kunci_pilgan: boolean }> | null | undefined): Record<number, string> {
  const map: Record<number, string> = {};

  (pilihanList || []).forEach((pilihan) => {
    if (pilihan.kunci_pilgan === true) {
      map[Number(pilihan.id_soal)] = pilihan.opsi_pilgan;
    }
  });

  return map;
}

export function computeAttemptScore(params: {
  answersJson: Record<string, unknown> | null | undefined;
  soalList: SoalScoreRow[];
  validasiBySoal: Record<number, ValidasiScore>;
  kunciPilihanMap: Record<number, string>;
}): { skor_total: number; skor_maksimum: number } {
  const { answersJson, soalList, validasiBySoal, kunciPilihanMap } = params;

  let skorTotal = 0;
  let skorMaksimum = 0;
  const answers = answersJson || {};

  soalList.forEach((soal) => {
    const soalId = Number(soal.id_soal);
    const maxScore = Number(soal.nilai_soal || 0);
    skorMaksimum += maxScore;

    const validasi = validasiBySoal[soalId];
    const skorSiswa = resolveQuestionScore({
      soal: {
        id_soal: soalId,
        id_tp: Number(soal.id_tp ?? 0),
        tipe_soal: soal.tipe_soal,
        kunci_teks: soal.kunci_teks,
        nilai_soal: soal.nilai_soal,
      } as SoalWithTP,
      studentAnswer: answers[String(soalId)],
      validatedScore: validasi?.skor_tervalidasi,
      fallbackScore: validasi?.skor_asli,
      kunciPilihan: kunciPilihanMap[soalId],
    });

    skorTotal += skorSiswa;
  });

  return {
    skor_total: roundToOneDecimal(skorTotal),
    skor_maksimum: roundToOneDecimal(skorMaksimum),
  };
}

export type { SoalScoreRow, ValidasiScore };