import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin.from('lembaga').select('*').order('nama_lembaga', { ascending: true });

      if (error) {
        console.error('Error fetching lembaga:', error);
        return res.status(500).json({ error: 'Failed to fetch lembaga data' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
