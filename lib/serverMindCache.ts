import { MindCache } from 'mindcache';
import fs from 'fs';
import path from 'path';

let mindcache: MindCache | null = null;

export function getMindCache(): MindCache {
  if (!mindcache) {
    mindcache = new MindCache();
    
    // Set system prompt
    mindcache.set_value(
      'System_prompt',
      `You are Damien Henry's virtual assistant. Your role is to help visitors navigate this website and provide information about Damien's work, experience, and content.

LANGUAGE INSTRUCTION:
- Always respond in the SAME LANGUAGE that the user is using
- If the user starts chatting in French, respond in French
- If the user starts chatting in English, respond in English
- Match the user's language throughout the conversation

Key information:
- This is Damien Henry's personal website
- The site contains pages about machine learning, AI, startups, book summaries, and personal projects
- You have access to all page content through the mindcache STM
- Be helpful, concise, and reference specific pages when relevant
- ONE PARAGRAPH PER ANSWER, Max 2 to 3 sentences.

CRITICAL - Two ways to help users:

1. **AUTO-NAVIGATE** when user clearly wants to visit a page:
   - Detect requests like: "show me", "go to", "open", "take me to"
   - Look up URL in page_urls mapping (lowercase title)
   - Use special format: [NAVIGATE:Page Title](url)
   - Example: User says "show me Google Cardboard" → "[NAVIGATE:Google Cardboard](/1a7e021d-4ed2-42e1-ab76-9b9e92308bb0)"
   - This will automatically redirect the user to that page

2. **ANSWER WITH LINKS** for informational questions:
   - Use regular markdown links: [Display Text](url-from-page_urls)
   - Look up URLs in the page_urls JSON mapping
   - For dev mode, URLs are page IDs like "/11806be9-9203-80a7-90e4-cd2b2bd0eb91"

When answering:
1. Detect user intent: Do they want to GO there or just KNOW about it?
2. If going → use [NAVIGATE:Title](url) format
3. If knowing → answer with regular [markdown links](url)
4. ALWAYS look up URLs in page_urls - NEVER invent URLs
5. ALWAYS use relative URLs (start with /)
6. Be conversational but professional

Example flows:
- "show me Google Cardboard" → "[NAVIGATE:Google Cardboard](/1a7e021d-4ed2-42e1-ab76-9b9e92308bb0)"
- "what's on the Google Cardboard page?" → "The page covers [Google Cardboard](/1a7e021d-4ed2-42e1-ab76-9b9e92308bb0)..."`,
      {
        readonly: false,
        visible: true,
        hardcoded: false,
        template: false,
        type: 'text',
        contentType: 'text/plain'
      }
    );
    mindcache.addTag('system_prompt', 'system');
    
    // Load page content from build-time generated file
    try {
      const pageContentFile = path.join(process.cwd(), 'public', 'page-content-prod.json');
      const pageContents = JSON.parse(fs.readFileSync(pageContentFile, 'utf-8'));
      
      console.log(`📚 Loading ${pageContents.length} pages into server mindcache...`);
      
      const urlMapping: Record<string, string> = {};
      
      pageContents.forEach((page: any) => {
        // Save page content
        mindcache!.set_value(
          `page:${page.slug}`,
          page.content,
          {
            readonly: true,
            visible: true,
            hardcoded: false,
            template: false,
            type: 'text',
            contentType: 'text/plain'
          }
        );
        mindcache!.addTag(`page:${page.slug}`, 'page');
        mindcache!.addTag(`page:${page.slug}`, 'content');
        
        // Build URL mapping
        urlMapping[page.title.toLowerCase()] = `/${page.slug}`;
        
        // Save URL for this page
        mindcache!.set_value(
          `url:${page.slug}`,
          `/${page.slug}`,
          {
            readonly: true,
            visible: false,
            hardcoded: false,
            template: false,
            type: 'text',
            contentType: 'text/plain'
          }
        );
        mindcache!.addTag(`url:${page.slug}`, 'url');
      });
      
      // Save complete URL mapping
      mindcache!.set_value(
        'page_urls',
        JSON.stringify(urlMapping, null, 2),
        {
          readonly: true,
          visible: true,
          hardcoded: false,
          template: false,
          type: 'json',
          contentType: 'application/json'
        }
      );
      mindcache!.addTag('page_urls', 'mapping');
      
      console.log('✅ Server mindcache initialized');
    } catch (err) {
      console.error('❌ Failed to load page content:', err);
    }
  }
  
  return mindcache;
}


