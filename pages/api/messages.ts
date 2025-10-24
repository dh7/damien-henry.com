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

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { sessionIds } = req.body;
      
      if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({ error: 'Invalid sessionIds' });
      }

      // Delete session-specific lists
      for (const sessionId of sessionIds) {
        await redis.del(`events:session:${sessionId}`);
      }

      // Remove events from events:all list
      const rawEvents = await redis.lRange('events:all', 0, -1);
      const events = rawEvents.map((e: string) => JSON.parse(e));
      
      // Filter out events for deleted sessions
      const remainingEvents = events.filter((event: any) => 
        !sessionIds.includes(event.sessionId)
      );

      // Clear and rebuild events:all
      await redis.del('events:all');
      for (const event of remainingEvents.reverse()) {
        await redis.lPush('events:all', JSON.stringify(event));
      }

      return res.status(200).json({ success: true, deleted: sessionIds.length });
    }

    // Handle GET request
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
    const sessions = Array.from(sessionMap.entries()).map(([sessionId, events]) => {
      // Sort events chronologically (oldest first)
      const sortedEvents = events.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return {
        sessionId,
        events: sortedEvents,
        firstSeen: sortedEvents[0]?.timestamp,              // Oldest event
        lastSeen: sortedEvents[sortedEvents.length - 1]?.timestamp, // Newest event
        eventCount: sortedEvents.length
      };
    }).sort((a, b) => 
      // Sort sessions by most recent activity first
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    return res.status(200).json({ 
      sessions,
      totalSessions: sessions.length,
      totalEvents: events.length
    });
  } catch (error) {
    console.error('Error in messages API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

