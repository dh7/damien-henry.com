'use client';

import { useState, useRef } from 'react';
import { MindCache } from 'mindcache';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  status: string;
  mindcacheInstance?: MindCache; // Custom MindCache instance (for isolated STM)
}

export default function ChatInput({ onSendMessage, status, mindcacheInstance }: ChatInputProps) {
  const defaultInstance = useRef(new MindCache());
  const mindcacheRef = mindcacheInstance || defaultInstance.current;
  const [input, setInput] = useState('');
  
  // Track loading state based on status
  const isLoading = status !== 'ready';

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (input.trim() && status === 'ready') {
          onSendMessage(input);
          setInput('');
        }
      }}
      style={{ paddingTop: '16px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '16px' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-white flex-shrink-0">&lt;</span>
        <input
          className="flex-1 bg-transparent text-gray-700 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-gray-400 disabled:opacity-50"
          style={{ fontFamily: 'monospace', fontSize: '14px' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={isLoading ? "Thinking..." : "Ask me anything..."}
          autoComplete="off"
        />
        <button 
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {isLoading ? '⏳' : '↵'}
        </button>
      </div>
    </form>
  );
}
