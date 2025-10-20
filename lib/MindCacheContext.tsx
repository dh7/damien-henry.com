'use client';

import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { MindCache } from 'mindcache';

interface MindCacheContextType {
  mindcache: MindCache;
}

const MindCacheContext = createContext<MindCacheContextType | null>(null);

export function useMindCache(): MindCache {
  const context = useContext(MindCacheContext);
  if (!context) {
    throw new Error('useMindCache must be used within MindCacheProvider');
  }
  return context.mindcache;
}

interface MindCacheProviderProps {
  children: ReactNode;
}

export function MindCacheProvider({ children }: MindCacheProviderProps) {
  const mindcacheRef = useRef<MindCache | null>(null);

  // Initialize mindcache only once
  if (!mindcacheRef.current) {
    mindcacheRef.current = new MindCache();
    
    // Load from cookie on client side
    if (typeof window !== 'undefined') {
      // Set custom system prompt
      mindcacheRef.current.set_value(
        'System_prompt',
        `You are Damien Henry's virtual assistant. Your role is to help visitors navigate this website and provide information about Damien's work, experience, and content.

Key information:
- This is Damien Henry's personal website
- The site contains pages about machine learning, AI, startups, book summaries, and personal projects
- You have access to all page content through the mindcache STM
- Be helpful, concise, and reference specific pages when relevant
- ONE PARAGRAPH PER ANSWER, Max 2 to 3 sentences.

CRITICAL - How to create links:
1. You have a "page_urls" key in your context that maps page titles (lowercase) to URLs
2. **ALWAYS look up URLs in the page_urls mapping** - DO NOT invent or guess URLs
3. The page_urls format is JSON: {"page title": "/actual-url"}
4. For dev mode, URLs will be page IDs like "/11806be9-9203-80a7-90e4-cd2b2bd0eb91"
5. Use markdown format: [Display Text](url-from-mapping)

When answering questions:
1. Search for relevant pages in your context (they start with "page:")
2. Look up the exact URL in page_urls by matching the lowercase title
3. Create markdown links using the EXACT URL from page_urls
4. Be conversational but professional
5. If you don't know something, admit it rather than making it up

Example flow:
- User asks about "Google Cardboard"
- You find content in "page:/11806be9..." 
- You look in page_urls for "google cardboard story part 1"
- You find: "/11806be9-9203-80a7-90e4-cd2b2bd0eb91"
- You respond: "Check out [Google Cardboard Story Part 1](/11806be9-9203-80a7-90e4-cd2b2bd0eb91)"`,
        {
          readonly: false,
          visible: true,
          hardcoded: false,
          template: false,
          type: 'text',
          contentType: 'text/plain'
        }
      );
      mindcacheRef.current.addTag('system_prompt', 'system');
      
      // First, load page content from build-time generated file
      fetch('/page-content.json')
        .then(res => res.json())
        .then((pageContents: Array<{ pageId: string; slug: string; title: string; content: string }>) => {
          console.log(`📚 Loading ${pageContents.length} pages into mindcache...`);
          
          // Build page URL mapping for easy reference
          const urlMapping: Record<string, string> = {};
          
          pageContents.forEach(page => {
            try {
              // Save page content
              mindcacheRef.current?.set_value(
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
              mindcacheRef.current?.addTag(`page:${page.slug}`, 'page');
              mindcacheRef.current?.addTag(`page:${page.slug}`, 'content');
              
              // Build URL mapping
              urlMapping[page.title.toLowerCase()] = `/${page.slug}`;
              
              // Also save URL directly for this page
              mindcacheRef.current?.set_value(
                `url:${page.slug}`,
                `/${page.slug}`,
                {
                  readonly: true,
                  visible: false, // Don't include in system prompt to reduce noise
                  hardcoded: false,
                  template: false,
                  type: 'text',
                  contentType: 'text/plain'
                }
              );
              mindcacheRef.current?.addTag(`url:${page.slug}`, 'url');
            } catch (err) {
              console.warn(`Failed to load page: ${page.slug}`, err);
            }
          });
          
          // Save complete URL mapping for quick lookup
          mindcacheRef.current?.set_value(
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
          mindcacheRef.current?.addTag('page_urls', 'mapping');
          
          console.log('✅ Page content and URLs loaded into mindcache');
        })
        .catch(err => {
          console.warn('⚠️ Could not load page content (this is normal in dev mode before first build):', err);
        });
      
      // Then, restore user's custom state from cookie
      const savedState = getCookie('mindcache_state');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Restore state by setting each key-value pair
          Object.entries(state).forEach(([key, data]: [string, any]) => {
            try {
              mindcacheRef.current?.set_value(key, data.value, data.attributes);
              // Restore tags
              if (data.tags && Array.isArray(data.tags)) {
                data.tags.forEach((tag: string) => {
                  mindcacheRef.current?.addTag(key, tag);
                });
              }
            } catch (err) {
              console.warn(`Failed to restore key: ${key}`, err);
            }
          });
        } catch (err) {
          console.error('Failed to parse mindcache state from cookie:', err);
        }
      }
    }
  }

  // Save to cookie whenever mindcache changes
  useEffect(() => {
    if (!mindcacheRef.current) return;

    const saveToCookie = () => {
      if (typeof window === 'undefined') return;
      
      try {
        const allData = mindcacheRef.current?.getAll() || {};
        const stateToSave: Record<string, any> = {};
        
        Object.keys(allData).forEach(key => {
          // Skip page content (it comes from build-time JSON, not user input)
          // Skip system prompt (it's set on initialization)
          // Skip URLs (they're derived from page content)
          if (key.startsWith('page:') || key.startsWith('url:') || key === 'System_prompt' || key === 'page_urls') return;
          
          stateToSave[key] = {
            value: mindcacheRef.current?.get_value(key),
            attributes: mindcacheRef.current?.get_attributes(key),
            tags: mindcacheRef.current?.getTags(key)
          };
        });
        
        const jsonState = JSON.stringify(stateToSave);
        // Keep cookie for 30 days
        setCookie('mindcache_state', jsonState, 30);
      } catch (err) {
        console.error('Failed to save mindcache state to cookie:', err);
      }
    };

    // Subscribe to all changes
    mindcacheRef.current.subscribeToAll(saveToCookie);
    
    return () => {
      mindcacheRef.current?.unsubscribeFromAll(saveToCookie);
    };
  }, []);

  return (
    <MindCacheContext.Provider value={{ mindcache: mindcacheRef.current }}>
      {children}
    </MindCacheContext.Provider>
  );
}

// Cookie helper functions
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof window === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

