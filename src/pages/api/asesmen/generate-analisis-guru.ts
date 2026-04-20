import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAnalisisGuru } from '@/lib/generateAnalisisGuru';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const idAsesmen = Number(req.body.id_asesmen);

    if (!Number.isFinite(idAsesmen)) {
      return res.status(400).json({ error: 'id_asesmen diperlukan' });
    }

    const result = await generateAnalisisGuru({ idAsesmen });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan server' });
  }
}
