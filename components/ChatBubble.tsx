'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMindCache } from '@/lib/MindCacheContext';
import ChatConversation from './ChatConversation';
import ChatInput from './ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatBubbleProps {
  chatWidth?: number; // Desktop chat panel width percentage
}

export default function ChatBubble({ chatWidth = 33.33 }: ChatBubbleProps) {
  const mindcacheRef = useMindCache();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello, I'm Damien Henry virtual assistant. I'm here to help you navigate this website. Feel free to ask any question anytime. I'm here to help"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Auto-expand when user starts typing
    if (value.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Clear input after sending
    setInputValue('');
    
    const processedContent = mindcacheRef.injectSTM(content);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: processedContent
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          systemPrompt: mindcacheRef.get_system_prompt()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Check if we should navigate
      if (data.navigate) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || `Taking you to ${data.navigate.page_title}...`
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Navigate after showing message
        setTimeout(() => {
          router.push(data.navigate.url);
        }, 800);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || 'No response'
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    // Clear input when closing
    if (isExpanded) {
      setInputValue('');
    }
  };

  return (
    <>
      {/* Desktop: Side panel */}
      <div 
        className="chat-container-desktop" 
        style={{ 
          width: `${chatWidth}%`, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          padding: '16px', 
          flexShrink: 0 
        }}
      >
        <div className="flex-1 flex flex-col h-full rounded-xl chat-interface-bg">
          <ChatConversation messages={messages} />
          <ChatInput 
            onSendMessage={handleSendMessage}
            status={isLoading ? 'loading' : 'ready'}
            variant="terminal"
          />
        </div>
      </div>

      {/* Mobile: Floating bubble */}
      <div className={`chat-container-mobile chat-bubble ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {isExpanded && (
          <>
            <button 
              onClick={toggleExpanded}
              className="chat-bubble-close"
              aria-label="Close chat"
            >
              ×
            </button>
            
            <div className="chat-bubble-conversation">
              <ChatConversation messages={messages} />
            </div>
          </>
        )}
        
        <div className="chat-bubble-input-wrapper">
          {!isExpanded && (
            <div className="chat-bubble-search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <div className="chat-bubble-input">
            <ChatInput 
              onSendMessage={handleSendMessage}
              status={isLoading ? 'loading' : 'ready'}
              variant={isExpanded ? 'terminal' : 'search'}
              value={inputValue}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}

