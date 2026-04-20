import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { isStorageFile, parseLampiran } from '@/lib/pbl';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID pengumpulan tidak valid' });
  }

  if (req.method !== 'DELETE' && req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const pengumpulanId = Number(id);
    if (!Number.isFinite(pengumpulanId)) {
      return res.status(400).json({ error: 'ID pengumpulan tidak valid' });
    }

    if (req.method === 'PUT') {
      const { nilai_pbl, komentar_pbl } = req.body as {
        nilai_pbl?: number | null;
        komentar_pbl?: string | null;
      };

      let parsedNilai: number | null = null;
      if (nilai_pbl !== null && nilai_pbl !== undefined && `${nilai_pbl}`.trim() !== '') {
        const numericNilai = Number(nilai_pbl);
        if (!Number.isFinite(numericNilai)) {
          return res.status(400).json({ error: 'Nilai PBL harus berupa angka yang valid' });
        }

        if (numericNilai < 0 || numericNilai > 100) {
          return res.status(400).json({ error: 'Nilai PBL harus berada pada rentang 0 - 100' });
        }

        parsedNilai = numericNilai;
      }

      const parsedKomentar = typeof komentar_pbl === 'string' && komentar_pbl.trim().length > 0 ? komentar_pbl.trim() : null;

      const { error: updateError } = await supabaseAdmin
        .from('pengumpulan_pbl')
        .update({
          nilai_pbl: parsedNilai,
          komentar_pbl: parsedKomentar,
        })
        .eq('id_pengumpulan', pengumpulanId);

      if (updateError) {
        console.error('Error updating nilai/komentar pengumpulan_pbl:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ message: 'Nilai dan komentar PBL berhasil disimpan' });
    }

    const { data: submission, error: submissionError } = await supabaseAdmin.from('pengumpulan_pbl').select('id_pengumpulan,file_pengumpulan').eq('id_pengumpulan', pengumpulanId).maybeSingle();

    if (submissionError) {
      console.error('Error fetching pengumpulan_pbl:', submissionError);
      return res.status(500).json({ error: submissionError.message });
    }

    if (!submission) {
      return res.status(404).json({ error: 'Data pengumpulan tidak ditemukan' });
    }

    const parsedFile = parseLampiran(submission.file_pengumpulan);
    const fileUrl = parsedFile?.url || submission.file_pengumpulan;

    if (fileUrl && isStorageFile(fileUrl)) {
      const urlParts = fileUrl.split('/weboost-storage/');
      if (urlParts.length >= 2) {
        const filePath = decodeURIComponent(urlParts[1]);
        const { error: storageDeleteError } = await supabaseAdmin.storage.from('weboost-storage').remove([filePath]);
        if (storageDeleteError) {
          console.error('Error deleting storage file:', storageDeleteError);
        }
      }
    }

    const { error: deleteError } = await supabaseAdmin.from('pengumpulan_pbl').delete().eq('id_pengumpulan', pengumpulanId);
    if (deleteError) {
      console.error('Error deleting pengumpulan_pbl:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ message: 'File pengumpulan berhasil dihapus' });
  } catch (error) {
    console.error('Error in /api/pbl/submission/[id]:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
