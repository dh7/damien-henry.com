import { GetStaticPaths, GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import RevalidateButton from '@/components/RevalidateButton'
import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then((m) => m.Code)
)
const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then((m) => m.Collection)
)
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Modal = dynamic(() =>
  import('react-notion-x/build/third-party/modal').then((m) => m.Modal)
)
const Tweet = dynamic(() =>
  import('react-tweet').then((m) => m.Tweet)
)

interface PageProps {
  recordMap: any
  pageId: string
  slugMappings?: Array<{ slug: string; pageId: string; title: string; parentSlug: string | null }>
  pageMetadata?: {
    title: string
    description: string
    coverImage: string
    url: string
  }
}

// Replace audio URLs with the fixed local audio file
function replaceAudioUrls(recordMap: any): any {
  const modifiedRecordMap = JSON.parse(JSON.stringify(recordMap))
  const isDev = process.env.NODE_ENV === 'development'
  const baseUrl = isDev ? 'http://localhost:3000' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://damien-henry.com')
  
  for (const blockId of Object.keys(modifiedRecordMap.block)) {
    const block = modifiedRecordMap.block[blockId]?.value
    if (block?.type === 'audio' && block.properties?.source?.[0]?.[0]) {
      block.properties.source[0][0] = `${baseUrl}/audio/notebook_ml.mp3`
    }
  }
  
  return modifiedRecordMap
}

export default function NotionPage({ recordMap, pageId, slugMappings = [], pageMetadata }: PageProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && resolvedTheme === 'dark'
  
  // Extract page title
  const pageTitle = useMemo(() => {
    // Use pageMetadata if available
    if (pageMetadata?.title) return pageMetadata.title
    
    // Otherwise extract from recordMap
    if (!recordMap) return ''
    const block = recordMap.block?.[pageId]?.value
    if (block && 'properties' in block && block.properties?.title) {
      return block.properties.title[0]?.[0] || ''
    }
    return ''
  }, [recordMap, pageId, pageMetadata?.title])
  
  if (!recordMap) {
    return <div>Loading...</div>
  }

  const defaultDescription = "This website contains resources about Damien Henry, Startups and Artificial Intelligence."
  const defaultImage = "https://damien-henry.com/opengraph-image.png"
  
  const metaTitle = pageTitle ? `${pageTitle} - Damien Henry` : 'Damien Henry'
  const metaDescription = pageMetadata?.description || defaultDescription
  const metaImage = pageMetadata?.coverImage || defaultImage
  const metaUrl = pageMetadata?.url || 'https://damien-henry.com'

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content="Damien Henry" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:url" content={metaUrl} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:image:alt" content={pageTitle || 'Damien Henry'} />
        <meta property="og:type" content="article" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />
        <meta name="twitter:image:alt" content={pageTitle || 'Damien Henry'} />
        
        <link rel="icon" href="/favicon.png" />
      </Head>
      <RevalidateButton pageId={pageId} />
      <main className="p-8">
        <NotionRenderer
          key={`notion-${isDark ? 'dark' : 'light'}`}
          recordMap={recordMap}
          fullPage={true}
          darkMode={isDark}
          disableHeader={true}
          components={{
            Code,
            Collection,
            Equation,
            Modal,
            Tweet,
            nextLink: Link,
          }}
          mapPageUrl={(notionPageId) => {
            const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
            const cleanPageId = notionPageId.replace(/-/g, '')
            const cleanRootId = rootPageId.replace(/-/g, '')
            
            if (cleanPageId === cleanRootId) {
              return '/'
            }
            
            // In dev mode (no slug mappings), use page IDs directly
            if (slugMappings.length === 0) {
              return `/${notionPageId}`
            }
            
            // Find slug for this page ID
            const mapping = slugMappings.find(m => m.pageId.replace(/-/g, '') === cleanPageId)
            if (mapping) {
              return `/${mapping.slug}`
            }
            
            // Fallback to page ID if no mapping found
            return `/${notionPageId}`
          }}
        />
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const isDev = process.env.NODE_ENV === 'development'
  
  // In dev mode, skip pre-generation and generate pages on-demand
  if (isDev) {
    return {
      paths: [],
      fallback: 'blocking',
    }
  }

  // In production, pre-generate all pages
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
  
  if (!rootPageId) {
    return {
      paths: [],
      fallback: 'blocking',
    }
  }

  try {
    const { generateSlugMappings } = await import('../lib/slugMapping')
    const mappings = await generateSlugMappings(rootPageId)
    const paths = mappings.map(mapping => ({ 
      params: { slug: mapping.slug.split('/') } 
    }))
    
    return {
      paths,
      fallback: 'blocking',
    }
  } catch (error) {
    console.error('Error fetching page slugs for static paths:', error)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const notion = new NotionAPI()
  const slugParts = params?.slug as string[] // Array of slug segments
  const fullSlug = slugParts?.join('/') || ''
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
  const isDev = process.env.NODE_ENV === 'development'

  // Filter out Next.js internal files (hot-update, static assets, etc.)
  if (!fullSlug || fullSlug.includes('_next') || fullSlug.includes('.json') || fullSlug.includes('webpack')) {
    return {
      notFound: true,
    }
  }

  try {
    let actualPageId: string
    let mappings: Array<{ slug: string; pageId: string; title: string; parentSlug: string | null }> = []

    if (isDev) {
      // In dev mode, assume slug IS the page ID (use page IDs in URLs during dev)
      actualPageId = fullSlug.replace(/\//g, '')
    } else {
      // In production, use slug mappings
      const { generateSlugMappings, getPageIdFromSlug } = await import('../lib/slugMapping')
      mappings = await generateSlugMappings(rootPageId)
      const foundPageId = getPageIdFromSlug(mappings, fullSlug)
      
      if (!foundPageId) {
        return {
          notFound: true,
        }
      }
      actualPageId = foundPageId
    }

    let recordMap = await notion.getPage(actualPageId)
    
    // Replace audio URLs with fixed file
    recordMap = replaceAudioUrls(recordMap)

    // Extract metadata for OpenGraph
    const block = recordMap.block?.[actualPageId]?.value
    
    let title = ''
    let description = ''
    let coverImage = 'https://damien-henry.com/opengraph-image.png'
    
    if (block) {
      // Extract title
      if (block.properties?.title) {
        title = block.properties.title[0]?.[0] || ''
      }
      
      // Extract description from page content (first text block)
      const blockIds = Object.keys(recordMap.block)
      for (const id of blockIds) {
        const contentBlock = recordMap.block[id]?.value
        if (contentBlock?.type === 'text' && contentBlock?.properties?.title) {
          const text = contentBlock.properties.title
            .map((t: any) => t[0])
            .join('')
            .slice(0, 160)
          if (text) {
            description = text
            break
          }
        }
      }
      
      // Extract cover image
      if (block.format?.page_cover) {
        const cover = block.format.page_cover
        if (cover.startsWith('http')) {
          // Already a full URL
          coverImage = cover
        } else if (cover.startsWith('/')) {
          // Relative Notion URL
          coverImage = `https://www.notion.so${cover}`
        } else if (cover.startsWith('attachment:')) {
          // Attachment format: attachment:uuid:filename
          const parts = cover.split(':')
          if (parts.length >= 2) {
            const attachmentId = parts[1]
            // Convert to Notion CDN URL
            coverImage = `https://www.notion.so/image/${encodeURIComponent(cover)}?table=block&id=${actualPageId}`
          }
        } else {
          coverImage = cover
        }
      }
    }
    
    // Construct URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damien-henry.com'
    const url = isDev 
      ? `${baseUrl}/${fullSlug}`
      : `${baseUrl}/${fullSlug}`

    return {
      props: {
        recordMap,
        pageId: actualPageId,
        slugMappings: mappings,
        pageMetadata: {
          title,
          description,
          coverImage,
          url,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      notFound: true,
    }
  }
}

