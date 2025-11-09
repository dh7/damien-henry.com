import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface RevalidateButtonProps {
  pageId?: string
}

export default function RevalidateButton({ pageId }: RevalidateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const [secret, setSecret] = useState('')
  const [revalidateAll, setRevalidateAll] = useState(false)
  const [regenerateContent, setRegenerateContent] = useState(false)
  const router = useRouter()

  // Check for ?refresh=1 in URL
  useEffect(() => {
    if (router.query.refresh) {
      setVisible(true)
      // Remove the query param from URL
      router.replace(router.pathname, undefined, { shallow: true })
    }
  }, [router])

  const handleRevalidate = async () => {
    if (!secret.trim()) {
      setResult('❌ Please enter a secret')
      return
    }

    setLoading(true)
    setResult('')

    try {
      // If regenerate content is checked, use rebuild API
      if (regenerateContent) {
        const response = await fetch(`/api/rebuild?secret=${encodeURIComponent(secret)}`)
        const data = await response.json()

        if (response.ok) {
          setResult('✅ Full rebuild triggered! This will take a few minutes.')
        } else {
          setResult(`❌ Error: ${data.message}`)
        }
        setLoading(false)
        return
      }

      // Build URL with parameters
      const params = new URLSearchParams()
      params.set('secret', secret)
      
      if (revalidateAll) {
        params.set('all', 'true')
      } else if (pageId) {
        params.set('pageId', pageId)
      }
      
      const url = `/api/revalidate?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        if (revalidateAll) {
          setResult(`✅ ${data.revalidatedCount || 'All'} pages refreshed!`)
        } else {
          setResult('✅ Page refreshed!')
        }
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setResult(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      setResult('❌ Failed to refresh')
    } finally {
      setLoading(false)
    }
  }

  // Keyboard shortcut: Cmd+Shift+R or Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        setVisible(true)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <>
      {/* Refresh button popup */}
      {visible && (
        <div style={{ 
          position: 'fixed',
          top: 20,
          left: 20,
          background: '#000', 
          color: '#fff', 
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 9999,
          minWidth: '250px'
        }}>
          <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 500 }}>
            Refresh Page from Notion
          </div>
          {pageId && (
            <a 
              href={`https://www.notion.so/${pageId.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginBottom: 10,
                fontSize: 12,
                color: '#0070f3',
                textDecoration: 'none'
              }}
            >
              📝 Edit in Notion →
            </a>
          )}
          <input
            type="password"
            placeholder="Enter secret..."
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRevalidate()}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '14px',
              marginBottom: 10,
              boxSizing: 'border-box'
            }}
          />
          
          {/* Options */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: 13,
              marginBottom: 6,
              cursor: 'pointer',
              color: regenerateContent ? '#666' : '#fff'
            }}>
              <input
                type="checkbox"
                checked={revalidateAll}
                onChange={(e) => setRevalidateAll(e.target.checked)}
                disabled={regenerateContent}
                style={{ marginRight: 8, cursor: 'pointer' }}
              />
              Revalidate all pages
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: 13,
              cursor: 'pointer',
              color: regenerateContent ? '#ffa500' : '#fff'
            }}>
              <input
                type="checkbox"
                checked={regenerateContent}
                onChange={(e) => {
                  setRegenerateContent(e.target.checked)
                  if (e.target.checked) setRevalidateAll(false)
                }}
                style={{ marginRight: 8, cursor: 'pointer' }}
              />
              Regenerate content (full rebuild)
            </label>
            {regenerateContent && (
              <div style={{ 
                fontSize: 11, 
                color: '#ffa500', 
                marginTop: 4,
                marginLeft: 24 
              }}>
                ⚠️ Triggers full deployment (~2-3 min)
              </div>
            )}
          </div>
          
          <button
            onClick={handleRevalidate}
            disabled={loading}
            style={{
              background: loading ? '#666' : (regenerateContent ? '#ff6b00' : '#0070f3'),
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            {loading 
              ? '⏳ Processing...' 
              : regenerateContent 
                ? '🔄 Rebuild & Regenerate' 
                : revalidateAll 
                  ? '🔄 Refresh All Pages'
                  : '🔄 Refresh Page'
            }
          </button>
          {result && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {result}
            </div>
          )}
          <button
            onClick={() => {
              setVisible(false)
              setSecret('')
              setResult('')
              setRevalidateAll(false)
              setRegenerateContent(false)
            }}
            style={{
              background: 'transparent',
              color: '#999',
              border: 'none',
              marginTop: 8,
              cursor: 'pointer',
              fontSize: 11,
              width: '100%'
            }}
          >
            Hide
          </button>
        </div>
      )}
    </>
  )
}

