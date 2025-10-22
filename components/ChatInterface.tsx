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

export default function ChatInterface() {
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

  const handleSendMessage = async (content: string) => {
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

  return (
    <div className="flex-1 flex flex-col h-full rounded-xl chat-interface-bg">
      <ChatConversation messages={messages} />
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        status={isLoading ? 'loading' : 'ready'}
      />
    </div>
  );
}
