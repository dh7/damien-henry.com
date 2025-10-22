'use client';

import { useState } from 'react';
import { useMindCache } from '@/lib/MindCacheContext';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  status: string;
  variant?: 'search' | 'terminal'; // Google search bar style vs terminal style
  value?: string; // Optional controlled value
  onChange?: (value: string) => void; // Optional controlled onChange
}

export default function ChatInput({ onSendMessage, status, variant = 'terminal', value: controlledValue, onChange }: ChatInputProps) {
  const mindcacheRef = useMindCache();
  const [internalInput, setInternalInput] = useState('');
  
  // Use controlled value if provided, otherwise use internal state
  const input = controlledValue !== undefined ? controlledValue : internalInput;
  const setInput = onChange || setInternalInput;
  
  // Track loading state based on status
  const isLoading = status !== 'ready';
  const isSearchVariant = variant === 'search';

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (input.trim() && status === 'ready') {
          onSendMessage(input);
          // Only clear if we're managing internal state
          if (controlledValue === undefined) {
            setInput('');
          }
        }
      }}
      style={isSearchVariant ? { 
        paddingTop: '14px', 
        paddingLeft: '56px', 
        paddingRight: '20px', 
        paddingBottom: '14px' 
      } : { 
        paddingTop: '16px', 
        paddingLeft: '16px', 
        paddingRight: '16px', 
        paddingBottom: '16px' 
      }}
    >
      <div className="flex items-center gap-2">
        {!isSearchVariant && (
          <span className="text-gray-700 dark:text-white flex-shrink-0">&lt;</span>
        )}
        <input
          className={`flex-1 bg-transparent focus:outline-none disabled:opacity-50 ${
            isSearchVariant 
              ? 'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400' 
              : 'text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
          }`}
          style={isSearchVariant ? { 
            fontFamily: 'Arial, sans-serif', 
            fontSize: '16px' 
          } : { 
            fontFamily: 'monospace', 
            fontSize: '14px' 
          }}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={isLoading ? "Thinking..." : "Ask me anything..."}
          autoComplete="off"
        />
        <button 
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className={`transition-colors flex-shrink-0 ${
            isSearchVariant
              ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {isSearchVariant ? (isLoading ? '...' : '→') : (isLoading ? '...' : '↵')}
        </button>
      </div>
    </form>
  );
}
