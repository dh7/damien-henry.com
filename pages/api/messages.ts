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
  // Simple password protection
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const redis = await getRedisClient();
    if (!redis) {
      return res.status(500).json({ error: 'Redis not configured' });
    }

    // Get last 1000 events
    const rawEvents = await redis.lRange('events:all', 0, 999);
    const events = rawEvents.map((e: string) => JSON.parse(e));
    
    // Filter out events without sessionId and group by session
    const sessionMap = new Map();
    events.forEach((event: any) => {
      if (event.sessionId) {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId).push(event);
      }
    });

    // Convert to array and sort by most recent activity
    const sessions = Array.from(sessionMap.entries()).map(([sessionId, events]) => ({
      sessionId,
      events: events.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      firstSeen: events[events.length - 1]?.timestamp,
      lastSeen: events[0]?.timestamp,
      eventCount: events.length
    })).sort((a, b) => 
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    return res.status(200).json({ 
      sessions,
      totalSessions: sessions.length,
      totalEvents: events.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

