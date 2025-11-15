import { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getMindCache } from '@/lib/serverMindCache';

// Simple session-based authentication
const sessions = new Set<string>();

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, password, messages, currentDraft } = req.body;

  // Check authentication
  const sessionToken = req.cookies.write_session;

  try {
    // Handle authentication
    if (action === 'authenticate') {
      const correctPassword = process.env.WRITE_PASSWORD || 'changeme';
      
      if (password === correctPassword) {
        const token = generateSessionToken();
        sessions.add(token);
        
        // Set cookie for 24 hours
        res.setHeader('Set-Cookie', `write_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
        return res.status(200).json({ success: true });
      } else {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Check auth for all other actions
    if (action === 'check_auth') {
      if (sessionToken && sessions.has(sessionToken)) {
        return res.status(200).json({ authenticated: true });
      } else {
        return res.status(401).json({ authenticated: false });
      }
    }

    // Require authentication for chat
    if (!sessionToken || !sessions.has(sessionToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (action === 'chat') {
      // Get server-side mindcache with readonly access to all content
      const mindcache = getMindCache();
      
      // Get the base system prompt which includes all page content via mindcache
      const baseSystemPrompt = mindcache.get_system_prompt();
      
      // Augment with write-specific instructions and current draft
      const systemPromptWithDraft = `${baseSystemPrompt}

---

ADDITIONAL CONTEXT FOR WRITING MODE:

You are now in writing assistant mode, helping Damien create new content for his website.

Current draft being worked on:
${currentDraft || '(empty)'}

Your role:
- Help brainstorm ideas for new content
- Suggest improvements to the draft
- Reference relevant existing content from the pages above
- Provide writing feedback and structure suggestions
- Help maintain consistency with existing content style

Guidelines:
- Be concise and actionable
- Reference existing content when relevant using the page content above
- Suggest specific improvements
- Ask clarifying questions when needed
- You can suggest content but DO NOT automatically update the draft unless explicitly asked

When the user asks you to update/modify the draft, you can provide the updated content in your response.`;

      const result = await generateText({
        model: google('gemini-flash-latest'),
        messages,
        system: systemPromptWithDraft,
      });

      return res.status(200).json({ message: result.text });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Write chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

