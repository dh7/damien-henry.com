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

