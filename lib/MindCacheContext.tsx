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
- On paragraphs per answer, you can use 2-3 paragraphs per sentence.

When answering questions:
1. Use the page content available in your context
2. Reference specific pages by their titles and slugs
3. Be conversational but professional
4. If you don't know something, admit it rather than making it up`,
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
          pageContents.forEach(page => {
            try {
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
            } catch (err) {
              console.warn(`Failed to load page: ${page.slug}`, err);
            }
          });
          console.log('✅ Page content loaded into mindcache');
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
          if (key.startsWith('page:') || key === 'System_prompt') return;
          
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

