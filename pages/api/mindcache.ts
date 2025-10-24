import { NextApiRequest, NextApiResponse } from 'next';
import { getMindCache } from '@/lib/serverMindCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mindcache = getMindCache();

  if (req.method === 'GET') {
    // Get all STM data
    try {
      const allData = mindcache.getAll();
      const result: Record<string, any> = {};
      
      Object.keys(allData).forEach(key => {
        result[key] = {
          value: mindcache.get_value(key),
          attributes: mindcache.get_attributes(key),
          tags: mindcache.getTags(key)
        };
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('GET mindcache error:', error);
      return res.status(500).json({ error: 'Failed to get mindcache data' });
    }
  }

  // Write operations disabled - mindcache is readonly
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return res.status(403).json({ error: 'Mindcache is readonly' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

