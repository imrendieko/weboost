import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch raw pilihan_ganda data tanpa filter
    const { data, error } = await supabaseAdmin.from('pilihan_ganda').select('*').limit(5);

    if (error) {
      return res.status(500).json({
        error: error.message,
        details: error,
      });
    }

    // Check column structure
    console.log('=== pilihan_ganda sample data ===');
    console.log('First record:', data?.[0]);
    console.log('All columns:', Object.keys(data?.[0] || {}));
    console.log('=================================');

    return res.status(200).json({
      count: data?.length,
      firstRecord: data?.[0],
      allColumns: data?.[0] ? Object.keys(data[0]) : [],
      allData: data,
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
