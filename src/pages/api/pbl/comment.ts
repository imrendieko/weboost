import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { id_sintak, id_guru, id_siswa, isi_komentar, parent_id } = req.body as {
      id_sintak?: number;
      id_guru?: number | null;
      id_siswa?: number | null;
      isi_komentar?: string;
      parent_id?: number | null;
    };

    if (!id_sintak || !isi_komentar?.trim()) {
      return res.status(400).json({ error: 'Komentar tidak valid' });
    }

    if (!id_guru && !id_siswa) {
      return res.status(400).json({ error: 'Pengirim komentar tidak valid' });
    }

    const { error } = await supabaseAdmin.from('komentar_pbl').insert([
      {
        id_sintak,
        id_guru: id_guru || null,
        id_siswa: id_siswa || null,
        isi_komentar: isi_komentar.trim(),
        parent_id: parent_id || null,
      },
    ]);

    if (error) {
      console.error('Error creating komentar_pbl:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Komentar berhasil ditambahkan' });
  } catch (error) {
    console.error('Error in POST /api/pbl/comment:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
