import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Event {
  eventType: 'page_view' | 'chat_message';
  timestamp: string;
  path?: string;
  title?: string;
  content?: string;
  ip?: string;
  userAgent?: string;
}

interface Session {
  sessionId: string;
  events: Event[];
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
}

export default function Usage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalSessions: 0, totalEvents: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOnlyChat, setShowOnlyChat] = useState(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Reset selection state when filter changes
  useEffect(() => {
    setLastClickedIndex(null);
    setSelectedSessions(new Set());
  }, [showOnlyChat]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setStats({ totalSessions: data.totalSessions, totalEvents: data.totalEvents });
        setAuthenticated(true);
        setError('');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Error loading data');
    }
  };

  const handleDeleteSessions = async () => {
    if (selectedSessions.size === 0) return;
    
    const sessionIdsToDelete = Array.from(selectedSessions);
    console.log('Deleting sessions:', sessionIdsToDelete);
    
    if (!confirm(`Delete ${selectedSessions.size} session(s)?`)) return;

    setIsDeleting(true);
    setError('');
    
    try {
      console.log('Sending DELETE request...');
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/messages', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionIds: sessionIdsToDelete }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Delete response:', data);
        const remaining = sessions.filter(s => !selectedSessions.has(s.sessionId));
        setSessions(remaining);
        setStats({
          totalSessions: remaining.length,
          totalEvents: remaining.reduce((sum, s) => sum + s.eventCount, 0)
        });
        setSelectedSessions(new Set());
        setLastClickedIndex(null);
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('Delete failed:', data);
        setError(`Failed to delete sessions: ${data.error || response.statusText}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Delete operation timed out - the server may be slow. Try refreshing.');
      } else {
        setError(`Error deleting sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      console.log('Delete operation complete');
      setIsDeleting(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const toggleSelectSession = (sessionId: string, currentIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newSelected = new Set(selectedSessions);
    
    // Get filtered sessions (respecting the chat filter)
    const filteredSessions = sessions.filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message'));
    
    // Handle shift-click for range selection
    if ((e.nativeEvent as MouseEvent).shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      
      // Ensure we don't go out of bounds
      for (let i = start; i <= end && i < filteredSessions.length; i++) {
        if (filteredSessions[i]) {
          newSelected.add(filteredSessions[i].sessionId);
        }
      }
    } else {
      // Normal toggle
      if (newSelected.has(sessionId)) {
        newSelected.delete(sessionId);
      } else {
        newSelected.add(sessionId);
      }
    }
    
    setSelectedSessions(newSelected);
    setLastClickedIndex(currentIndex);
  };

  const toggleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.sessionId)));
    }
    setLastClickedIndex(null);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <Head>
          <title>Usage Analytics - Login</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Usage Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">Enter password to access</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                autoFocus
              />
              
              <button
                onClick={handleLogin}
                disabled={!password.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-blue-500/30 dark:shadow-blue-900/30"
              >
                Access Analytics
              </button>
              
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <Head>
        <title>Usage Analytics</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Usage Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {stats.totalSessions} sessions · {stats.totalEvents} events
            </p>
          </div>
          
          {sessions.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnlyChat(!showOnlyChat)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  showOnlyChat
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                💬 {showOnlyChat ? 'Show All' : 'Chat Only'}
              </button>
              
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                {selectedSessions.size === sessions.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedSessions.size > 0 && (
                <button
                  onClick={handleDeleteSessions}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isDeleting ? 'Deleting...' : `Delete ${selectedSessions.size}`}
                </button>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No sessions recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions
              .filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message'))
              .map((session, index) => (
              <div key={session.sessionId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center">
                  <div className="p-4 border-r border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.sessionId)}
                      onChange={(e) => toggleSelectSession(session.sessionId, index, e)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <button
                    onClick={() => toggleSession(session.sessionId)}
                    className="flex-1 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                          {session.sessionId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(session.firstSeen).toLocaleString()} → {new Date(session.lastSeen).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {session.events.some(e => e.eventType === 'chat_message') && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Contains chat messages">
                            💬
                          </span>
                        )}
                        {session.events.some(e => e.title?.toLowerCase().includes('404') || e.title?.toLowerCase().includes('not found')) && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Contains 404 error">
                            ⚠️
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                          {session.eventCount} events
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 text-lg">
                          {expandedSessions.has(session.sessionId) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
                
                {expandedSessions.has(session.sessionId) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                    <div className="space-y-2">
                      {session.events.map((event, idx) => (
                        <div key={idx} className="flex gap-3 py-2">
                          <div className="flex-shrink-0 w-24 text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="flex-1">
                            {event.eventType === 'page_view' ? (
                              <div className="flex items-start gap-2">
                                <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded font-medium">
                                  PAGE
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {event.title || 'Untitled'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                    {event.path}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded font-medium">
                                  CHAT
                                </span>
                                <p className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                                  {event.content}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {session.events[0]?.ip && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          IP: {session.events[0].ip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

