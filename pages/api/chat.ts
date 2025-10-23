import { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
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

  try {
    const { messages, systemPrompt, sessionId } = req.body;

    console.log('🤖 Chat API called with', messages?.length || 0, 'messages');

    // Save user message (if enabled)
    if (process.env.ENABLE_CHAT_LOGGING === 'true') {
      try {
        const redis = await getRedisClient();
        if (redis) {
          const lastMessage = messages[messages.length - 1];
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
              
              await redis.lPush('events:all', JSON.stringify(event));
              await redis.lPush(`events:session:${sessionId}`, JSON.stringify(event));
              await redis.expire(`events:session:${sessionId}`, 60 * 60 * 24 * 30);
            }
          }
        }
      } catch (redisError) {
        // Silently fail if Redis is not configured (e.g., local dev)
        console.warn('Failed to log chat message (Redis not configured):', redisError);
      }
    }

    const result = await generateText({
      model: openai('gpt-5-nano'),
      messages,
      system: systemPrompt || 'You are a helpful assistant.',
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
