import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import 'katex/dist/katex.min.css'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    // Load lite-youtube-embed script
    if (typeof window !== 'undefined') {
      import('lite-youtube-embed').catch(() => {
        // Silently handle import error
      })
    }

    // Scroll to top on route change
    const handleRouteChange = () => {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])
  
  useEffect(() => {
    // Replace YouTube iframes with lite-youtube on client side
    const replaceYouTubeEmbeds = () => {
      const iframes = document.querySelectorAll('.notion-video iframe[src*="youtube.com"]')
      iframes.forEach((iframe) => {
        const src = iframe.getAttribute('src')
        if (!src) return
        
        const videoIdMatch = src.match(/embed\/([^?]+)/)
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1]
          const liteYt = document.createElement('lite-youtube')
          liteYt.setAttribute('videoid', videoId)
          liteYt.setAttribute('playlabel', 'Play')
          
          const parent = iframe.parentElement
          if (parent) {
            parent.replaceChild(liteYt, iframe)
          }
        }
      })
    }

    // Run on initial load and after route changes
    const timer = setTimeout(replaceYouTubeEmbeds, 500)
    router.events.on('routeChangeComplete', () => {
      setTimeout(replaceYouTubeEmbeds, 500)
    })

    return () => {
      clearTimeout(timer)
    }
  }, [router])

  return <Component {...pageProps} />
}

