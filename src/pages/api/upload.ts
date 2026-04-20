import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '60mb', // Allow up to 60MB (50MB file + 33% base64 overhead)
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY tidak ditemukan!');
      return res.status(500).json({
        error: 'Kesalahan konfigurasi server',
        details: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Tambahkan ke file .env.local.',
      });
    }

    const { file, fileData, fileName, fileType } = req.body;

    // Support both 'file' and 'fileData' parameter names
    const base64File = file || fileData;

    if (!base64File || !fileName) {
      return res.status(400).json({ error: 'Data file wajib diisi' });
    }

    // Decode base64 to buffer
    const base64Data = base64File.includes(',') ? base64File.split(',')[1] : base64File;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `materi-dokumen/${uniqueFileName}`;

    console.log('📤 Uploading file:', fileName, '→', uniqueFileName);
    console.log('📦 File size:', fileBuffer.length, 'bytes');

    // Upload to Supabase Storage using supabaseAdmin (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from('weboost-storage').upload(filePath, fileBuffer, {
      contentType: fileType || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({
        error: 'Gagal mengunggah ke penyimpanan',
        details: uploadError.message,
        hint: uploadError.message.includes('policy') ? 'RLS Error: Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local' : 'Check if bucket "weboost-storage" exists and is public',
      });
    }

    console.log('✅ Upload successful:', filePath);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('weboost-storage').getPublicUrl(filePath);

    console.log('🔗 Public URL:', urlData.publicUrl);

    return res.status(200).json({
      url: urlData.publicUrl,
      fileName: uniqueFileName,
      originalName: fileName,
    });
  } catch (error) {
    console.error('Error in upload API:', error);
    return res.status(500).json({
      error: 'Terjadi kesalahan server',
      details: error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
    });
  }
}
