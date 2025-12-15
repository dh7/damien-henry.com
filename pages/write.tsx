'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [previewMode, setPreviewMode] = useState(false);

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
        } else if (response.status === 401) {
          // 401 is expected when not authenticated, just show login form
          setIsAuthenticated(false);
        } else {
          console.error('Auth check failed with status:', response.status);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Load markdown content and messages from localStorage
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('draft_content');
      if (savedDraft) {
        setMarkdownContent(savedDraft);
      }

      const savedMessages = localStorage.getItem('write_messages');
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed);
        } catch (error) {
          console.error('Failed to parse saved messages:', error);
        }
      }
    }
  }, [isAuthenticated]);

  // Save markdown content to localStorage when it changes
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      localStorage.setItem('draft_content', markdownContent);
    }
  }, [markdownContent, isAuthenticated]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      localStorage.setItem('write_messages', JSON.stringify(messages));
    }
  }, [messages, isAuthenticated]);

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

  const handleClearMessages = () => {
    if (confirm('Clear all messages? This cannot be undone.')) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm here to help you write content. I have access to all your existing content for reference. What would you like to work on?"
      };
      setMessages([welcomeMessage]);
      localStorage.setItem('write_messages', JSON.stringify([welcomeMessage]));
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
              autoComplete="current-password"
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
      <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Left side: Chat */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div
              className="flex items-center justify-between w-full"
              style={{ paddingLeft: '16px', paddingRight: '16px' }}
            >
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Writing Assistant
              </h2>
              <button
                onClick={handleClearMessages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Clear conversation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <ChatConversation messages={messages} />
            <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <ChatInput
                onSendMessage={handleSendMessage}
                status={isLoading ? 'loading' : 'ready'}
                variant="terminal"
              />
            </div>
          </div>
        </div>

        {/* Right side: Markdown Editor/Preview */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800">
          <div className="py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div
              className="flex items-center justify-between w-full"
              style={{ paddingLeft: '16px', paddingRight: '16px' }}
            >
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Markdown Editor
              </h2>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!previewMode ? 'text-black dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  Edit
                </span>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${previewMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${previewMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className={`text-sm ${previewMode ? 'text-black dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  Preview
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              className="h-full w-full"
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}
            >
              {previewMode ? (
                <div className="w-full h-full p-6 overflow-y-auto prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent || '*No content yet. Switch to Edit mode to start writing.*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  className="w-full h-full p-6 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none resize-none font-mono text-sm"
                  placeholder="Start writing in markdown..."
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

