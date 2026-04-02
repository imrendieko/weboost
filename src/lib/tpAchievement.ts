type TPStatus = 'Tercapai' | 'Cukup' | 'Belum';

type SoalWithTP = {
  id_soal: number;
  id_tp: number;
  tipe_soal: 'pilihan_ganda' | 'uraian' | 'baris_kode' | string;
  kunci_teks: string | null;
  nilai_soal: number | null;
};

type ResolveQuestionScoreParams = {
  soal: SoalWithTP;
  studentAnswer: unknown;
  validatedScore?: number | null;
  fallbackScore?: number | null;
  kunciPilihan?: string;
};

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function clampScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  if (!Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  return Math.min(maxScore, Math.max(0, score));
}

function isAnswerCorrect(soal: SoalWithTP, studentAnswer: unknown, kunciPilihan?: string): boolean {
  if (soal.tipe_soal === 'pilihan_ganda') {
    return Boolean(kunciPilihan) && studentAnswer === kunciPilihan;
  }

  if (soal.tipe_soal === 'uraian') {
    return normalizeText(studentAnswer) === normalizeText(soal.kunci_teks || '');
  }

  if (soal.tipe_soal === 'baris_kode') {
    return String(studentAnswer || '').trim() === String(soal.kunci_teks || '').trim();
  }

  return false;
}

export function getTPStatus(percentage: number): TPStatus {
  if (percentage >= 75) {
    return 'Tercapai';
  }

  if (percentage >= 50) {
    return 'Cukup';
  }

  return 'Belum';
}

export function calculateTPPercentage(totalSkorSiswa: number, totalSkorMaksimum: number): number {
  if (!Number.isFinite(totalSkorMaksimum) || totalSkorMaksimum <= 0) {
    return 0;
  }

  return (totalSkorSiswa / totalSkorMaksimum) * 100;
}

export function roundToOneDecimal(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}

export function resolveQuestionScore({ soal, studentAnswer, validatedScore, fallbackScore, kunciPilihan }: ResolveQuestionScoreParams): number {
  const maxScore = Number(soal.nilai_soal || 0);

  if (Number.isFinite(validatedScore as number)) {
    return clampScore(Number(validatedScore), maxScore);
  }

  if (Number.isFinite(fallbackScore as number)) {
    return clampScore(Number(fallbackScore), maxScore);
  }

  const correct = isAnswerCorrect(soal, studentAnswer, kunciPilihan);
  return correct ? maxScore : 0;
}

export type { TPStatus, SoalWithTP };
