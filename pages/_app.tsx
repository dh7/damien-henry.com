import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import Layout from '@/components/Layout'
import { trackPageView } from '@/lib/sessionTracking'
import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import 'katex/dist/katex.min.css'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    // Keyboard shortcut: Shift+Cmd+U to open usage page
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        router.push('/all-usage')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  useEffect(() => {
    // Load lite-youtube-embed script
    if (typeof window !== 'undefined') {
      import('lite-youtube-embed').catch(() => {
        // Silently handle import error
      })
    }

    // Track initial page view
    trackPageView(router.asPath, document.title)

    // Handle scrolling to hash element
    const scrollToHash = (hash: string) => {
      if (!hash) return false

      const id = hash.replace('#', '')
      // Try multiple times to find the element (content might still be loading)
      let attempts = 0
      const tryScroll = () => {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
          return true
        }
        attempts++
        if (attempts < 10) {
          setTimeout(tryScroll, 100)
        }
        return false
      }
      tryScroll()
      return true
    }

    // Handle hash on initial page load
    if (window.location.hash) {
      // Wait for content to load before scrolling
      setTimeout(() => scrollToHash(window.location.hash), 300)
    }

    // Track page view on route change
    const handleRouteChange = (url: string) => {
      const hash = url.split('#')[1]
      if (hash) {
        // If URL has a hash, scroll to that element
        setTimeout(() => scrollToHash(`#${hash}`), 100)
      } else {
        // No hash, scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
      // Wait a bit for title to update
      setTimeout(() => {
        trackPageView(url, document.title)
      }, 100)
    }

    // Handle hash-only changes (e.g., clicking anchor links on same page)
    const handleHashChange = () => {
      if (window.location.hash) {
        scrollToHash(window.location.hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  useEffect(() => {
    // Replace YouTube iframes and static previews with lite-youtube
    const replaceYouTubeEmbeds = () => {
      // Replace iframes
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
          liteYt.setAttribute('posterquality', 'maxresdefault')

          const parent = iframe.parentElement
          if (parent) {
            parent.replaceChild(liteYt, iframe)
          }
        }
      })

      // Replace static thumbnail previews
      const thumbnails = document.querySelectorAll('.notion-yt-thumbnail')
      thumbnails.forEach((img) => {
        const src = img.getAttribute('src')
        if (!src) return

        // Extract video ID from thumbnail URL (format: i.ytimg.com/vi/VIDEO_ID/...)
        const videoIdMatch = src.match(/\/vi\/([^\/]+)\//)
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1]
          const liteYt = document.createElement('lite-youtube')
          liteYt.setAttribute('videoid', videoId)
          liteYt.setAttribute('playlabel', 'Play')
          liteYt.setAttribute('posterquality', 'maxresdefault')

          // Find the wrapper container and replace it
          const wrapper = img.closest('.notion-asset-wrapper-video')
          if (wrapper) {
            wrapper.innerHTML = ''
            wrapper.appendChild(liteYt)
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

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  )
}

