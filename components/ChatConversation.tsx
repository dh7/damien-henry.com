'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatConversationProps {
  messages: Message[];
}

// Parse markdown links and convert to React elements
function parseMarkdownLinks(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the link as a Next.js Link component
    const linkText = match[1];
    const url = match[2];
    parts.push(
      <Link 
        key={match.index} 
        href={url}
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
        style={{ textDecoration: 'underline' }}
      >
        {linkText}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

export default function ChatConversation({ messages }: ChatConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6" style={{ fontFamily: 'monospace', fontSize: '14px', padding: '16px' }}>
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-2">
          <span className={`flex-shrink-0 ${
            message.role === 'user' 
              ? 'text-gray-700 dark:text-white font-bold' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {message.role === 'user' ? '<' : '>'}
          </span>
          <div className={`flex-1 whitespace-pre-wrap break-words ${
            message.role === 'user' 
              ? 'text-gray-700 dark:text-white font-bold' 
              : 'text-gray-600 dark:text-gray-300'
          }`}>
            {parseMarkdownLinks(message.content)}
          </div>
        </div>
      ))}
    </div>
  );
}
