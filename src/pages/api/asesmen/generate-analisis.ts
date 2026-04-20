import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAnalisisSiswa } from '@/lib/generateAnalisisSiswa';

/**
 * Generate analisis siswa per TP setelah asesmen disubmit
 * Endpoint ini dipanggil setelah submit asesmen untuk mengisi tabel analisis_siswa
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const idAsesmen = Number(req.body.id_asesmen);
    const idSiswa = Number(req.body.id_siswa);

    if (!Number.isFinite(idAsesmen) || !Number.isFinite(idSiswa)) {
      return res.status(400).json({ error: 'id_asesmen dan id_siswa diperlukan' });
    }

    const result = await generateAnalisisSiswa({ idAsesmen, idSiswa });
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return res.status(500).json({ error: message });
  }
}
