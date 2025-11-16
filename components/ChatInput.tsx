'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  status: string;
  variant?: 'terminal'; // Keep for compatibility but only terminal is used
  value?: string; // Optional controlled value
  onChange?: (value: string) => void; // Optional controlled onChange
  onFocus?: () => void;
}

export default function ChatInput({ onSendMessage, status, value: controlledValue, onChange, onFocus }: ChatInputProps) {
  const [internalInput, setInternalInput] = useState('');
  
  // Use controlled value if provided, otherwise use internal state
  const input = controlledValue !== undefined ? controlledValue : internalInput;
  const setInput = onChange || setInternalInput;
  
  // Track loading state based on status
  const isLoading = status !== 'ready';
  const hasValue = input.trim().length > 0;

  return (
    <form
      className="ask-me-form"
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
    >
      <div className="ask-me-shell" data-loading={isLoading ? 'true' : 'false'}>
        <div className="ask-me-shell-inner flex items-center gap-2">
          
          <input
            className="ask-me-input flex-1 bg-transparent text-gray-700 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-gray-400 disabled:opacity-50"
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={onFocus}
            disabled={isLoading}
            placeholder={isLoading ? "Thinking..." : "Ask me anything..."}
            aria-label="Chat prompt"
            autoComplete="off"
          />
          <button 
            type="submit"
            disabled={status !== 'ready' || !hasValue}
            className="ask-me-submit flex-shrink-0 px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed text-black dark:text-white"
          >
            {isLoading ? '...' : '↵'}
          </button>
        </div>
      </div>
    </form>
  );
}
