// Client-side session tracking utility
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('user-session-id');
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('user-session-id', sessionId);
  }
  
  return sessionId;
}

export async function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  
  const sessionId = getSessionId();
  
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType: 'page_view',
        path,
        title,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

