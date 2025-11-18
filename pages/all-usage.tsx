import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import Head from 'next/head';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Generate a consistent color for a prefix/project name
function getProjectColor(prefix: string): { bg: string; text: string; darkBg: string; darkText: string } {
  // Hash the prefix to get a consistent index
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    hash = prefix.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Color palette with good contrast
  const colors = [
    { bg: 'bg-indigo-100', text: 'text-indigo-800', darkBg: 'dark:bg-indigo-900/50', darkText: 'dark:text-indigo-300' },
    { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/50', darkText: 'dark:text-blue-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/50', darkText: 'dark:text-purple-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', darkBg: 'dark:bg-pink-900/50', darkText: 'dark:text-pink-300' },
    { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/50', darkText: 'dark:text-red-300' },
    { bg: 'bg-orange-100', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/50', darkText: 'dark:text-orange-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/50', darkText: 'dark:text-yellow-300' },
    { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900/50', darkText: 'dark:text-green-300' },
    { bg: 'bg-teal-100', text: 'text-teal-800', darkBg: 'dark:bg-teal-900/50', darkText: 'dark:text-teal-300' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', darkBg: 'dark:bg-cyan-900/50', darkText: 'dark:text-cyan-300' },
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

interface Event {
  eventType: 'page_view' | 'chat_message' | 'chat_answer';
  timestamp: string;
  path?: string;
  title?: string;
  content?: string;
  question?: string;
  answer?: string;
  ip?: string;
  country?: string | null;
  countryName?: string | null;
  userAgent?: string;
}

interface Session {
  sessionId: string;
  events: Event[];
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  prefix?: string | null;
}

export default function AllUsage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalSessions: 0, totalEvents: 0, prefix: 'all' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOnlyChat, setShowOnlyChat] = useState(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState<string>('');
  const [sortBy, setSortBy] = useState<'lastActivity' | 'eventCount'>('lastActivity');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // Load available prefixes
  useEffect(() => {
    if (authenticated && password) {
      loadPrefixes();
    }
  }, [authenticated, password]);

  // Load sessions when prefix changes
  useEffect(() => {
    if (authenticated && password) {
      loadSessions();
    }
  }, [selectedPrefix, authenticated, password]);

  const loadPrefixes = async () => {
    try {
      const response = await fetch('/api/all-messages?listPrefixes=true', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPrefixes(data.prefixes || []);
      }
    } catch (err) {
      console.error('Failed to load prefixes:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const url = selectedPrefix 
        ? `/api/all-messages?prefix=${encodeURIComponent(selectedPrefix)}`
        : '/api/all-messages';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setStats({ 
          totalSessions: data.totalSessions, 
          totalEvents: data.totalEvents,
          prefix: data.prefix || 'all'
        });
        setError('');
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Error loading data');
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    try {
      const response = await fetch('/api/all-messages?listPrefixes=true', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrefixes(data.prefixes || []);
        await loadSessions();
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/api/all-messages', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          sessionIds: sessionIdsToDelete,
          prefix: selectedPrefix || undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await loadSessions();
        setSelectedSessions(new Set());
        setLastClickedIndex(null);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(`Failed to delete sessions: ${data.error || response.statusText}`);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Delete operation timed out - the server may be slow. Try refreshing.');
      } else {
        setError(`Error deleting sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
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
    
    const filteredSessions = sessions.filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer'));
    
    if ((e.nativeEvent as MouseEvent).shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      
      for (let i = start; i <= end && i < filteredSessions.length; i++) {
        if (filteredSessions[i]) {
          newSelected.add(filteredSessions[i].sessionId);
        }
      }
    } else {
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
    const filteredSessions = sortedSessions.filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer'));
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.sessionId)));
    }
    setLastClickedIndex(null);
  };

  // Reset selection state when filter changes
  useEffect(() => {
    setLastClickedIndex(null);
    setSelectedSessions(new Set());
  }, [showOnlyChat, selectedPrefix]);

  // Sort sessions based on current sort mode
  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'eventCount') {
      return b.eventCount - a.eventCount; // Most events first
    } else {
      // Sort by last activity (default)
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    }
  });

  // Process data for graph view
  const graphData = useMemo(() => {
    // Filter sessions based on current filters
    const filteredSessions = sortedSessions.filter(session => {
      if (showOnlyChat && !session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer')) {
        return false;
      }
      if (selectedPrefix && session.prefix !== selectedPrefix) {
        return false;
      }
      return true;
    });

    // Group events by date and project
    const eventsByDate: Record<string, Record<string, { pageViews: number; chatEvents: number }>> = {};
    
    filteredSessions.forEach(session => {
      const prefix = session.prefix || 'unknown';
      session.events.forEach(event => {
        // Skip page views if chat-only filter is active
        if (showOnlyChat && event.eventType === 'page_view') {
          return;
        }
        
        const date = new Date(event.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!eventsByDate[date]) {
          eventsByDate[date] = {};
        }
        if (!eventsByDate[date][prefix]) {
          eventsByDate[date][prefix] = { pageViews: 0, chatEvents: 0 };
        }
        
        if (event.eventType === 'page_view') {
          eventsByDate[date][prefix].pageViews++;
        } else if (event.eventType === 'chat_message' || event.eventType === 'chat_answer') {
          eventsByDate[date][prefix].chatEvents++;
        }
      });
    });

    // Get all unique dates and sort them
    const dates = Object.keys(eventsByDate).sort();
    if (dates.length === 0) return [];

    // Get all unique prefixes
    const allPrefixes = new Set<string>();
    dates.forEach(date => {
      Object.keys(eventsByDate[date]).forEach(prefix => allPrefixes.add(prefix));
    });

    // Build chart data - daily counts per project (not cumulative)
    return dates.map(date => {
      const dataPoint: Record<string, any> = { date };
      
      // For each project, use daily counts
      Array.from(allPrefixes).forEach(prefix => {
        const prefixData = eventsByDate[date][prefix] || { pageViews: 0, chatEvents: 0 };
        dataPoint[`${prefix}_pageViews`] = prefixData.pageViews;
        dataPoint[`${prefix}_chatEvents`] = prefixData.chatEvents;
      });
      
      return dataPoint;
    });
  }, [sessions, showOnlyChat, selectedPrefix, sortBy]);

  // Get chart colors for projects
  const getChartColor = (prefix: string, isChat: boolean) => {
    const color = getProjectColor(prefix);
    // Use a darker shade for chat events
    if (isChat) {
      return color.text.replace('800', '600');
    }
    return color.text;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <Head>
          <title>All Projects Usage Analytics - Login</title>
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
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage Analytics</h1>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'graph' : 'list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === 'graph'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                title={viewMode === 'graph' ? 'Switch to List View' : 'Switch to Graph View'}
              >
                {viewMode === 'graph' ? '📊 Graph' : '📋 List'}
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {stats.totalSessions} sessions · {stats.totalEvents} events
              {stats.prefix !== 'all' && ` · Prefix: ${stats.prefix}`}
            </p>
          </div>
          
          {sessions.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedPrefix}
                onChange={(e) => setSelectedPrefix(e.target.value)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <option value="">All Projects</option>
                {prefixes.map(prefix => (
                  <option key={prefix} value={prefix}>{prefix}</option>
                ))}
              </select>
              
              <button
                onClick={() => setSortBy(sortBy === 'lastActivity' ? 'eventCount' : 'lastActivity')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  sortBy === 'eventCount'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                title={sortBy === 'eventCount' ? 'Sort by: Event Count' : 'Sort by: Last Activity'}
              >
                {sortBy === 'eventCount' ? '📊 Events' : '🕐 Recent'}
              </button>
              
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
                {selectedSessions.size === sortedSessions.filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer')).length ? 'Deselect All' : 'Select All'}
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
        ) : viewMode === 'graph' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Events Over Time
            </h2>
            {graphData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No data to display</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} animationDuration={0}>
                  <defs>
                    {Array.from(new Set(sessions.map(s => s.prefix).filter(Boolean))).map((prefix) => {
                      // Map Tailwind colors to hex values
                      const colorMap: Record<string, { page: string; chat: string }> = {
                        'indigo': { page: '#6366f1', chat: '#818cf8' },
                        'blue': { page: '#3b82f6', chat: '#60a5fa' },
                        'purple': { page: '#a855f7', chat: '#c084fc' },
                        'pink': { page: '#ec4899', chat: '#f472b6' },
                        'red': { page: '#ef4444', chat: '#f87171' },
                        'orange': { page: '#f97316', chat: '#fb923c' },
                        'yellow': { page: '#eab308', chat: '#facc15' },
                        'green': { page: '#22c55e', chat: '#4ade80' },
                        'teal': { page: '#14b8a6', chat: '#2dd4bf' },
                        'cyan': { page: '#06b6d4', chat: '#22d3ee' },
                      };
                      const color = getProjectColor(prefix!);
                      const colorName = color.text.replace('text-', '').replace('-800', '').split('-')[0];
                      const colors = colorMap[colorName] || { page: '#6366f1', chat: '#818cf8' };
                      return (
                        <React.Fragment key={prefix}>
                          <linearGradient id={`gradientPageViews-${prefix}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.page} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={colors.page} stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id={`gradientChatEvents-${prefix}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.chat} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={colors.chat} stopOpacity={0.1}/>
                          </linearGradient>
                        </React.Fragment>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: '#111827' }}
                    formatter={(value: any, name: string) => {
                      const [prefix, type] = name.split('_');
                      return [value, `${prefix} ${type === 'pageViews' ? 'Page Views' : 'Chat Events'}`];
                    }}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value: string) => {
                      const [prefix, type] = value.split('_');
                      return `${prefix} ${type === 'pageViews' ? 'Page Views' : 'Chat Events'}`;
                    }}
                  />
                  {Array.from(new Set(sessions.map(s => s.prefix).filter(Boolean))).map((prefix) => {
                    const colorMap: Record<string, { page: string; chat: string }> = {
                      'indigo': { page: '#6366f1', chat: '#818cf8' },
                      'blue': { page: '#3b82f6', chat: '#60a5fa' },
                      'purple': { page: '#a855f7', chat: '#c084fc' },
                      'pink': { page: '#ec4899', chat: '#f472b6' },
                      'red': { page: '#ef4444', chat: '#f87171' },
                      'orange': { page: '#f97316', chat: '#fb923c' },
                      'yellow': { page: '#eab308', chat: '#facc15' },
                      'green': { page: '#22c55e', chat: '#4ade80' },
                      'teal': { page: '#14b8a6', chat: '#2dd4bf' },
                      'cyan': { page: '#06b6d4', chat: '#22d3ee' },
                    };
                    const color = getProjectColor(prefix!);
                    const colorName = color.text.replace('text-', '').replace('-800', '').split('-')[0];
                    const colors = colorMap[colorName] || { page: '#6366f1', chat: '#818cf8' };
                    return (
                      <React.Fragment key={prefix}>
                        {!showOnlyChat && (
                          <Area
                            type="monotone"
                            dataKey={`${prefix}_pageViews`}
                            stackId={`${prefix}_stack`}
                            stroke={colors.page}
                            fill={`url(#gradientPageViews-${prefix})`}
                            name={`${prefix}_pageViews`}
                            isAnimationActive={false}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey={`${prefix}_chatEvents`}
                          stackId={`${prefix}_stack`}
                          stroke={colors.chat}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill={`url(#gradientChatEvents-${prefix})`}
                          fillOpacity={0.7}
                          name={`${prefix}_chatEvents`}
                          isAnimationActive={false}
                        />
                      </React.Fragment>
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSessions
              .filter(session => !showOnlyChat || session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer'))
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
                        <div className="flex items-center gap-2">
                          {session.prefix && (() => {
                            const color = getProjectColor(session.prefix);
                            return (
                              <span className={`text-xs ${color.bg} ${color.text} ${color.darkBg} ${color.darkText} px-2 py-1 rounded-full font-medium flex-shrink-0`} title={`Project: ${session.prefix}`}>
                                {session.prefix}
                              </span>
                            );
                          })()}
                          <p className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                            {session.sessionId}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(session.firstSeen).toLocaleString()} → {new Date(session.lastSeen).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {session.events[0]?.countryName && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium" title={`Country: ${session.events[0].countryName}`}>
                            {session.events[0].countryName}
                          </span>
                        )}
                        {session.events.some(e => e.eventType === 'chat_message' || e.eventType === 'chat_answer') && (
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
                            ) : event.eventType === 'chat_answer' ? (
                              <div className="flex items-start gap-2">
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded font-medium">
                                  ANSWER
                                </span>
                                <p className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                                  {event.answer}
                                </p>
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
                          {session.events[0].countryName && (
                            <span className="ml-2 text-gray-600 dark:text-gray-500">
                              ({session.events[0].countryName})
                            </span>
                          )}
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

