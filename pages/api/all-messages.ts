import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';
import { getCountryFromIP } from '@/lib/ipGeolocation';
import { getCountryName } from '@/lib/countryNames';

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
  
  // Trim whitespace from environment variable and token
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const providedToken = token?.trim();
  
  // Debug logging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth check:', {
      hasEnvVar: !!adminPassword,
      envVarLength: adminPassword?.length,
      hasToken: !!providedToken,
      tokenLength: providedToken?.length,
      match: adminPassword === providedToken
    });
  }
  
  if (!adminPassword || !providedToken || providedToken !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const redis = await getRedisClient();
    if (!redis) {
      return res.status(500).json({ error: 'Redis not configured' });
    }

    // Get prefix from query parameter, default to empty string to get all
    const prefix = (req.query.prefix as string) || '';

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { sessionIds, prefix: deletePrefix } = req.body;
      
      if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({ error: 'Invalid sessionIds' });
      }

      const actualPrefix = deletePrefix || prefix || 'damien-henry';
      console.log(`Deleting ${sessionIds.length} sessions with prefix: ${actualPrefix}`);

      // Delete session-specific lists
      const deletePromises = sessionIds.map((sessionId: string) => 
        redis.del(`events:${actualPrefix}:session:${sessionId}`)
      );
      await Promise.all(deletePromises);
      console.log('Deleted session-specific lists');

      // Remove events from events:all list
      const rawEvents = await redis.lRange(`events:${actualPrefix}:all`, 0, -1);
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

      // Clear and rebuild events:all list using pipeline
      await redis.del(`events:${actualPrefix}:all`);
      
      if (remainingEvents.length > 0) {
        const pipeline = redis.multi();
        for (const event of remainingEvents.reverse()) {
          pipeline.lPush(`events:${actualPrefix}:all`, JSON.stringify(event));
        }
        await pipeline.exec();
      }

      console.log('Delete operation complete');
      return res.status(200).json({ success: true, deleted: sessionIds.length });
    }

    // Handle GET request - get available prefixes
    if (req.query.listPrefixes === 'true') {
      try {
        const keys = await redis.keys('events:*:all');
        const prefixes = new Set<string>();
        keys.forEach((key: string) => {
          const match = key.match(/^events:(.+):all$/);
          if (match) {
            prefixes.add(match[1]);
          }
        });
        return res.status(200).json({ prefixes: Array.from(prefixes).sort() });
      } catch (error) {
        console.error('Error listing prefixes:', error);
        return res.status(500).json({ error: 'Failed to list prefixes' });
      }
    }

    // Handle GET request - get events for specific prefix or all prefixes
    let allEvents: any[] = [];
    
    if (prefix) {
      // Get events for specific prefix (get more events to show more history)
      const rawEvents = await redis.lRange(`events:${prefix}:all`, 0, 9999);
      allEvents = rawEvents.map((e: string) => {
        try {
          const event = JSON.parse(e);
          // Enrich with country if missing but IP exists
          if (event.ip && !event.country) {
            event.country = getCountryFromIP(event.ip);
          }
          // Add country name for display
          if (event.country) {
            event.countryName = getCountryName(event.country);
          }
          // Add prefix from query parameter
          if (prefix) {
            event.prefix = prefix;
          }
          return event;
        } catch {
          return null;
        }
      }).filter((e: any) => e !== null);
    } else {
      // Get events from all prefixes (get more events to show more history)
      const keys = await redis.keys('events:*:all');
      for (const key of keys) {
        const rawEvents = await redis.lRange(key, 0, 9999);
        const events = rawEvents.map((e: string) => {
          try {
            const event = JSON.parse(e);
            // Enrich with country if missing but IP exists
            if (event.ip && !event.country) {
              event.country = getCountryFromIP(event.ip);
            }
            // Add country name for display
            if (event.country) {
              event.countryName = getCountryName(event.country);
            }
            // Extract prefix from Redis key (e.g., "events:damien-henry:all" -> "damien-henry")
            const prefixMatch = key.match(/^events:(.+):all$/);
            if (prefixMatch) {
              event.prefix = prefixMatch[1];
            }
            return event;
          } catch {
            return null;
          }
        }).filter((e: any) => e !== null);
        allEvents = allEvents.concat(events);
      }
      // Sort all events by timestamp (newest first) and take last 10000
      allEvents.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      allEvents = allEvents.slice(0, 10000);
    }
    
    // Filter out events without sessionId and group by session
    const sessionMap = new Map();
    allEvents.forEach((event: any) => {
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
      
      // Get prefix from first event (all events in a session should have same prefix)
      const sessionPrefix = sortedEvents[0]?.prefix || prefix || null;
      
      return {
        sessionId,
        events: sortedEvents,
        firstSeen: sortedEvents[0]?.timestamp,
        lastSeen: sortedEvents[sortedEvents.length - 1]?.timestamp,
        eventCount: sortedEvents.length,
        prefix: sessionPrefix
      };
    }).sort((a, b) => 
      // Sort sessions by most recent activity first
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    return res.status(200).json({ 
      sessions,
      totalSessions: sessions.length,
      totalEvents: allEvents.length,
      prefix: prefix || 'all'
    });
  } catch (error) {
    console.error('Error in all-messages API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

