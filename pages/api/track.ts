import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient && process.env.dh_usage_REDIS_URL) {
    redisClient = createClient({ url: process.env.dh_usage_REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only track if page logging is enabled
  if (process.env.ENABLE_PAGE_LOGGING !== 'true') {
    return res.status(200).json({ success: true, logged: false });
  }

  try {
    const { sessionId, eventType, path, title, timestamp } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const event = {
      sessionId,
      eventType,
      path,
      title,
      timestamp: timestamp || new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      const redis = await getRedisClient();
      if (redis) {
        // Store in general events list
        await redis.lPush('events:damien-henry:all', JSON.stringify(event));
        
        // Store in session-specific list
        await redis.lPush(`events:damien-henry:session:${sessionId}`, JSON.stringify(event));
        
        // Expire session data after 30 days
        await redis.expire(`events:damien-henry:session:${sessionId}`, 60 * 60 * 24 * 30);

        return res.status(200).json({ success: true, logged: true });
      }
      return res.status(200).json({ success: true, logged: false, reason: 'Redis not configured' });
    } catch (redisError) {
      // Redis not configured (e.g., local dev without Redis)
      console.warn('Redis not configured, skipping tracking');
      return res.status(200).json({ success: true, logged: false, reason: 'Redis not configured' });
    }
  } catch (error) {
    console.error('Track API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

