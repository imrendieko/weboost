export const PBL_SYNTAX_LABELS = [
  'Sintak 1: Orientasi pada Masalah',
  'Sintak 2: Mengatur Peserta Didik untuk Belajar',
  'Sintak 3: Membimbing Pengalaman Individu Maupun Kelompok',
  'Sintak 4: Mengembangkan dan Menyajikan Hasil Karya',
  'Sintak 5: Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
] as const;

export type LampiranType = 'dokumen' | 'video' | 'tautan';

export interface SintakContentPayload {
  order: number;
  descriptionHtml: string;
  allowedSubmissionTypes: LampiranType[];
  lampiran?: LampiranPayload[];
}

export interface LampiranPayload {
  type: LampiranType;
  label: string;
  url: string;
}

const DEFAULT_ALLOWED_TYPES: LampiranType[] = ['dokumen'];

export function createDefaultSintakContent(order: number): SintakContentPayload {
  return {
    order,
    descriptionHtml: '',
    allowedSubmissionTypes: [...DEFAULT_ALLOWED_TYPES],
    lampiran: [],
  };
}

function normalizeLampiranList(value: unknown): LampiranPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Partial<LampiranPayload>;
      if ((candidate.type !== 'dokumen' && candidate.type !== 'video' && candidate.type !== 'tautan') || typeof candidate.url !== 'string' || candidate.url.trim().length === 0) {
        return null;
      }

      return {
        type: candidate.type,
        label: typeof candidate.label === 'string' ? candidate.label : '',
        url: candidate.url,
      };
    })
    .filter((item): item is LampiranPayload => item !== null);
}

export function normalizeAllowedSubmissionTypes(value: unknown): LampiranType[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_ALLOWED_TYPES];
  }

  const normalized = value.filter((item): item is LampiranType => item === 'dokumen' || item === 'video' || item === 'tautan');

  return normalized.length > 0 ? normalized : [...DEFAULT_ALLOWED_TYPES];
}

export function parseSintakContent(rawValue: string | null | undefined, fallbackOrder: number): SintakContentPayload {
  if (!rawValue) {
    return createDefaultSintakContent(fallbackOrder);
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SintakContentPayload>;
    if (parsed && typeof parsed === 'object') {
      return {
        order: typeof parsed.order === 'number' ? parsed.order : fallbackOrder,
        descriptionHtml: typeof parsed.descriptionHtml === 'string' ? parsed.descriptionHtml : rawValue,
        allowedSubmissionTypes: normalizeAllowedSubmissionTypes(parsed.allowedSubmissionTypes),
        lampiran: normalizeLampiranList(parsed.lampiran),
      };
    }
  } catch {
    // Fallback for legacy plain-text content.
  }

  return {
    order: fallbackOrder,
    descriptionHtml: rawValue,
    allowedSubmissionTypes: [...DEFAULT_ALLOWED_TYPES],
    lampiran: [],
  };
}

export function serializeSintakContent(content: SintakContentPayload): string {
  return JSON.stringify({
    order: content.order,
    descriptionHtml: content.descriptionHtml,
    allowedSubmissionTypes: normalizeAllowedSubmissionTypes(content.allowedSubmissionTypes),
    lampiran: normalizeLampiranList(content.lampiran),
  });
}

export function parseLampiran(rawValue: string | null | undefined): LampiranPayload | null {
  if (!rawValue) {
    return null;
  }

  const [type, label, ...rest] = rawValue.split('|');
  const url = rest.join('|');

  if ((type !== 'dokumen' && type !== 'video' && type !== 'tautan') || !url) {
    return null;
  }

  return {
    type,
    label: label || '',
    url,
  };
}

export function serializeLampiran(payload: LampiranPayload): string {
  return `${payload.type}|${payload.label}|${payload.url}`;
}

export function isStorageFile(url: string): boolean {
  return url.includes('/weboost-storage/');
}
