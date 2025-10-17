import { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemPrompt } = req.body;

    console.log('🤖 Chat API called with', messages?.length || 0, 'messages');

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages,
      system: systemPrompt || 'You are a helpful assistant.',
    });

    return res.status(200).json({ message: result.text });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
