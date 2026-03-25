import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'API routes working correctly',
    timestamp: new Date().toISOString(),
    method: req.method,
  });
}
