import { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from 'redis';
import { getMindCache } from '@/lib/serverMindCache';

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

  try {
    const { messages, sessionId } = req.body;

    console.log('🤖 Chat API called with', messages?.length || 0, 'messages');
    console.log('📊 Chat logging enabled:', process.env.ENABLE_CHAT_LOGGING);
    console.log('🔑 SessionId:', sessionId);

    // Get server-side mindcache
    const mindcache = getMindCache();

    // Save user message (if enabled)
    if (process.env.ENABLE_CHAT_LOGGING === 'true') {
      try {
        const redis = await getRedisClient();
        console.log('🔴 Redis client:', redis ? 'connected' : 'null');
        if (redis) {
          const lastMessage = messages[messages.length - 1];
          console.log('💬 Last message role:', lastMessage?.role);
          if (lastMessage?.role === 'user') {
            // Only track if we have a valid sessionId
            if (sessionId) {
              const event = {
                sessionId,
                eventType: 'chat_message',
                content: lastMessage.content,
                timestamp: new Date().toISOString(),
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
              };
              
              await redis.lPush('events:damien-henry:all', JSON.stringify(event));
              await redis.lPush(`events:damien-henry:session:${sessionId}`, JSON.stringify(event));
              await redis.expire(`events:damien-henry:session:${sessionId}`, 60 * 60 * 24 * 30);
              console.log('✅ Chat message logged successfully');
            } else {
              console.warn('⚠️ No sessionId provided, skipping chat logging');
            }
          }
        }
      } catch (redisError) {
        console.error('❌ Failed to log chat message:', redisError);
      }
    }

    const result = await generateText({
      model: google('gemini-flash-latest'),
      messages,
      system: mindcache.get_system_prompt(),
    });

    // Check if the response contains navigation intent
    const navMatch = result.text.match(/\[NAVIGATE:([^\]]+)\]\(([^)]+)\)/);
    if (navMatch) {
      const pageTitle = navMatch[1];
      const url = navMatch[2];
      return res.status(200).json({ 
        message: result.text.replace(navMatch[0], `Taking you to ${pageTitle}...`),
        navigate: { url, page_title: pageTitle }
      });
    }

    return res.status(200).json({ message: result.text });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
