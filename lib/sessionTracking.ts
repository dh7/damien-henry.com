// Client-side session tracking utility with cookie support
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  // Try to get from cookie first (persistent across tabs/windows)
  let sessionId = getCookie('user-session-id');
  
  if (!sessionId) {
    // Fall back to sessionStorage
    sessionId = sessionStorage.getItem('user-session-id') || '';
  }
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Store in both cookie and sessionStorage
    setCookie('user-session-id', sessionId, 30); // 30 days
    sessionStorage.setItem('user-session-id', sessionId);
  } else if (!getCookie('user-session-id')) {
    // Sync cookie if missing
    setCookie('user-session-id', sessionId, 30);
  } else if (!sessionStorage.getItem('user-session-id')) {
    // Sync sessionStorage if missing
    sessionStorage.setItem('user-session-id', sessionId);
  }
  
  return sessionId;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }
  return '';
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
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

