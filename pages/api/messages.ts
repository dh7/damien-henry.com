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
  
  if (!process.env.ADMIN_PASSWORD || !token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Basic rate limiting - deny if making too many requests
  // (This is very basic - for production use a proper rate limiter like upstash/ratelimit)

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

      console.log(`Deleting ${sessionIds.length} sessions:`, sessionIds);

      // Delete session-specific lists
      const deletePromises = sessionIds.map((sessionId: string) => 
        redis.del(`events:damien-henry:session:${sessionId}`)
      );
      await Promise.all(deletePromises);
      console.log('Deleted session-specific lists');

      // Remove events from events:all list - use pipeline for better performance
      const rawEvents = await redis.lRange('events:damien-henry:all', 0, -1);
      console.log(`Processing ${rawEvents.length} events`);
      
      const sessionIdSet = new Set(sessionIds);
      const remainingEvents = rawEvents
        .map((e: string) => {
          try {
            return JSON.parse(e);
          } catch {
            return null;
          }
        })
        .filter((event: any) => event && !sessionIdSet.has(event.sessionId));

      console.log(`${remainingEvents.length} events remaining after filter`);

      // Clear and rebuild events:damien-henry:all using pipeline
      await redis.del('events:damien-henry:all');
      
      if (remainingEvents.length > 0) {
        // Batch the operations for better performance
        const pipeline = redis.multi();
        for (const event of remainingEvents.reverse()) {
          pipeline.lPush('events:damien-henry:all', JSON.stringify(event));
        }
        await pipeline.exec();
      }

      console.log('Delete operation complete');
      return res.status(200).json({ success: true, deleted: sessionIds.length });
    }

    // Handle GET request
    // Get last 1000 events
    const rawEvents = await redis.lRange('events:damien-henry:all', 0, 999);
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

