'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import ChatConversation from '@/components/ChatConversation';
import ChatInput from '@/components/ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function WritePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm here to help you write content. I have access to all your existing content for reference. What would you like to work on?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/write-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_auth' }),
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  // Load markdown content from localStorage
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const saved = localStorage.getItem('draft_content');
      if (saved) {
        setMarkdownContent(saved);
      }
    }
  }, [isAuthenticated]);

  // Save markdown content to localStorage when it changes
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      localStorage.setItem('draft_content', markdownContent);
    }
  }, [markdownContent, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/write-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticate', password }),
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        alert('Invalid password');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/write-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: [...messages, userMessage],
          currentDraft: markdownContent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'No response'
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update markdown if the response includes it
      if (data.updatedDraft) {
        setMarkdownContent(data.updatedDraft);
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

  // Login screen
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Write - Damien Henry</title>
        </Head>
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
          <form onSubmit={handleLogin} className="w-full max-w-md p-8">
            <h1 className="text-2xl font-bold mb-6 text-black dark:text-white">
              Enter Password
            </h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </>
    );
  }

  // Main write interface
  return (
    <>
      <Head>
        <title>Write - Damien Henry</title>
      </Head>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Left side: Chat */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Writing Assistant
            </h2>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ChatConversation messages={messages} />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <ChatInput 
                onSendMessage={handleSendMessage}
                status={isLoading ? 'loading' : 'ready'}
                variant="terminal"
              />
            </div>
          </div>
        </div>

        {/* Right side: Markdown Editor */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Markdown Editor
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="w-full h-full p-6 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none resize-none font-mono text-sm"
              placeholder="Start writing in markdown..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}

