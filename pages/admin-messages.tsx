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

export default function AdminMessages() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalSessions: 0, totalEvents: 0 });

  const handleLogin = async () => {
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
      setError('Error loading messages');
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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>Admin - Messages</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter password"
            className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Head>
        <title>Admin - User Sessions</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">User Sessions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.totalSessions} sessions · {stats.totalEvents} total events
          </p>
        </div>
        
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.sessionId} className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleSession(session.sessionId)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {session.sessionId}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(session.firstSeen).toLocaleString()} → {new Date(session.lastSeen).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                      {session.eventCount} events
                    </span>
                    <span className="text-gray-400">
                      {expandedSessions.has(session.sessionId) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </button>
              
              {expandedSessions.has(session.sessionId) && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="space-y-3">
                    {session.events.map((event, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-32 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex-1">
                          {event.eventType === 'page_view' ? (
                            <div className="flex items-start gap-2">
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                                PAGE
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {event.title || 'Untitled'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {event.path}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                                CHAT
                              </span>
                              <p className="text-sm text-gray-900 dark:text-gray-100">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        IP: {session.events[0].ip}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

