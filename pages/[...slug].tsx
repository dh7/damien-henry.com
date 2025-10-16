import { GetStaticPaths, GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import RevalidateButton from '@/components/RevalidateButton'
import Breadcrumb from '@/components/Breadcrumb'
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
}

// Download and save audio files, replace URLs with local paths
async function downloadAudioFiles(recordMap: any, pageId: string, notion: any): Promise<any> {
  const fs = require('fs')
  const path = require('path')
  const https = require('https')
  
  const modifiedRecordMap = JSON.parse(JSON.stringify(recordMap))
  
  for (const blockId of Object.keys(modifiedRecordMap.block)) {
    const block = modifiedRecordMap.block[blockId]?.value
    if (block?.type === 'audio' && block.properties?.source?.[0]?.[0]) {
      const filename = `${blockId}.wav`
      const publicPath = path.join(process.cwd(), 'public', 'audio', filename)
      const audioDir = path.join(process.cwd(), 'public', 'audio')
      
      // Create audio directory if it doesn't exist
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true })
      }
      
      // Download if not already cached or file is empty/invalid
      const needsDownload = !fs.existsSync(publicPath) || fs.statSync(publicPath).size < 1000
      
      if (needsDownload) {
        // Fetch fresh recordMap to get non-expired signed URL
        console.log('Fetching fresh audio URL for:', blockId)
        const freshRecordMap = await notion.getPage(pageId)
        const cleanBlockId = blockId.replace(/-/g, '')
        const freshBlock = freshRecordMap.block[cleanBlockId]?.value
        
        if (freshBlock?.properties?.source?.[0]?.[0]) {
          const notionUrl = freshBlock.properties.source[0][0]
          console.log('Downloading audio from:', notionUrl.substring(0, 100) + '...')
          
          await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(publicPath)
            https.get(notionUrl, (response: any) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`))
                return
              }
              response.pipe(file)
              file.on('finish', () => {
                file.close()
                const size = fs.statSync(publicPath).size
                console.log('Saved audio:', publicPath, `(${(size / 1024 / 1024).toFixed(2)} MB)`)
                resolve(true)
              })
            }).on('error', (err: any) => {
              fs.unlink(publicPath, () => {})
              reject(err)
            })
          })
        }
      }
      
      // Replace with absolute URL (required for SSR)
      // In development, always use localhost
      const isDev = process.env.NODE_ENV === 'development'
      const baseUrl = isDev ? 'http://localhost:3000' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://damien-henry.com')
      block.properties.source[0][0] = `${baseUrl}/audio/${filename}`
    }
  }
  
  return modifiedRecordMap
}

export default function NotionPage({ recordMap, pageId, slugMappings = [] }: PageProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && resolvedTheme === 'dark'
  
  // Extract page title for meta tag
  const pageTitle = useMemo(() => {
    if (!recordMap) return ''
    const cleanPageId = pageId.replace(/-/g, '')
    const block = recordMap.block?.[cleanPageId]?.value
    if (block && 'properties' in block && block.properties?.title) {
      return block.properties.title[0]?.[0] || ''
    }
    return ''
  }, [recordMap, pageId])
  
  if (!recordMap) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>{pageTitle ? `${pageTitle} - Damien Henry` : 'Damien Henry'}</title>
        <meta name="description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle ? `${pageTitle} - Damien Henry` : 'Damien Henry'} />
        <meta property="og:description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta property="og:site_name" content="Damien Henry" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:image" content="https://damien-henry.com/og-image.png" />
        <meta property="og:image:alt" content="Damien Henry" />
        <meta property="og:type" content="article" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle ? `${pageTitle} - Damien Henry` : 'Damien Henry'} />
        <meta name="twitter:description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta name="twitter:image" content="https://damien-henry.com/og-image.png" />
        <meta name="twitter:image:alt" content="Damien Henry" />
        
        <link rel="icon" href="/favicon.png" />
      </Head>
      <RevalidateButton pageId={pageId} />
      <Breadcrumb />
      <div style={{ paddingTop: '50px' }}>
        <main>
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
      </div>
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

  if (!fullSlug) {
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
    
    // Skip audio download in dev mode for speed
    if (!isDev) {
      recordMap = await downloadAudioFiles(recordMap, actualPageId, notion)
    }

    return {
      props: {
        recordMap,
        pageId: actualPageId,
        slugMappings: mappings,
      },
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      notFound: true,
    }
  }
}

