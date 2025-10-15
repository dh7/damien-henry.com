import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface RevalidateButtonProps {
  pageId?: string
  secret: string
}

export default function RevalidateButton({ pageId, secret }: RevalidateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  // Check for ?refresh=secret in URL
  useEffect(() => {
    if (router.query.refresh === secret) {
      setVisible(true)
      // Remove the query param from URL
      router.replace(router.pathname, undefined, { shallow: true })
    }
  }, [router, secret])

  const handleRevalidate = async () => {
    setLoading(true)
    setResult('')

    try {
      const url = pageId 
        ? `/api/revalidate?secret=${secret}&pageId=${pageId}`
        : `/api/revalidate?secret=${secret}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setResult('✅ Page refreshed!')
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
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 9999
        }}>
          <button
            onClick={handleRevalidate}
            disabled={loading}
            style={{
              background: loading ? '#666' : '#0070f3',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh Page'}
          </button>
          {result && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {result}
            </div>
          )}
          <button
            onClick={() => setVisible(false)}
            style={{
              background: 'transparent',
              color: '#999',
              border: 'none',
              marginTop: 8,
              cursor: 'pointer',
              fontSize: 11
            }}
          >
            Hide
          </button>
        </div>
      )}
    </>
  )
}

