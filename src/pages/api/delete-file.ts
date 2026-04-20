import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'URL file wajib diisi' });
    }

    // Extract file path from URL
    // URL format: https://...supabase.co/storage/v1/object/public/weboost-storage/materi-dokumen/filename.pdf
    const urlParts = fileUrl.split('/weboost-storage/');
    if (urlParts.length < 2) {
      console.error('❌ URL file tidak valid format:', fileUrl);
      return res.status(400).json({ error: 'URL file tidak valid' });
    }

    const filePath = urlParts[1]; // e.g., "materi-dokumen/filename.pdf"

    console.log('🗑️ Deleting file:', filePath);

    // Delete from Supabase Storage using supabaseAdmin
    const { error: deleteError } = await supabaseAdmin.storage.from('weboost-storage').remove([filePath]);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      // Don't fail if file doesn't exist
      const messageLower = String(deleteError.message || '').toLowerCase();
      if (!messageLower.includes('not found') && !messageLower.includes('tidak ditemukan')) {
        return res.status(500).json({
          error: 'Gagal menghapus file',
          details: deleteError.message,
        });
      }
    }

    console.log('✅ File berhasil dihapus successfully');

    return res.status(200).json({
      success: true,
      message: 'File berhasil dihapus',
    });
  } catch (error) {
    console.error('Error in delete-file API:', error);
    return res.status(500).json({
      error: 'Terjadi kesalahan server',
      details: error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
    });
  }
}
