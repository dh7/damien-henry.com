import { GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import { ExtendedRecordMap } from 'notion-types'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import RevalidateButton from '@/components/RevalidateButton'
import Breadcrumb from '@/components/Breadcrumb'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

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

interface HomeProps {
  recordMap: any
  slugMappings?: Array<{ slug: string; pageId: string; title: string }>
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

export default function Home({ recordMap, slugMappings = [] }: HomeProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && resolvedTheme === 'dark'
  
  return (
    <>
      <Head>
        <title>Damien Henry</title>
        <meta name="description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Damien Henry" />
        <meta property="og:description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta property="og:url" content="https://damien-henry.com" />
        <meta property="og:site_name" content="Damien Henry" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:image" content="https://damien-henry.com/og-image.png" />
        <meta property="og:image:alt" content="Damien Henry" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Damien Henry" />
        <meta name="twitter:description" content="This website contains resources about Damien Henry, Machine Learning, Startups and book summaries." />
        <meta name="twitter:image" content="https://damien-henry.com/og-image.png" />
        <meta name="twitter:image:alt" content="Damien Henry" />
        
        <link rel="icon" href="/favicon.png" />
      </Head>
      <RevalidateButton />
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
          mapPageUrl={(pageId) => {
            const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
            const cleanPageId = pageId.replace(/-/g, '')
            const cleanRootId = rootPageId.replace(/-/g, '')
            
            if (cleanPageId === cleanRootId) {
              return '/'
            }
            
            // In dev mode (no slug mappings), use page IDs directly
            if (slugMappings.length === 0) {
              return `/${pageId}`
            }
            
            // Find slug for this page ID
            const mapping = slugMappings.find(m => m.pageId.replace(/-/g, '') === cleanPageId)
            if (mapping) {
              return `/${mapping.slug}`
            }
            
            // Fallback to page ID if no mapping found
            return `/${pageId}`
          }}
        />
        </main>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const notion = new NotionAPI()
  const pageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
  const isDev = process.env.NODE_ENV === 'development'

  if (!pageId) {
    console.warn('NEXT_PUBLIC_NOTION_PAGE_ID is not set')
    return {
      props: {
        recordMap: {},
      },
    }
  }

  try {
    let recordMap = await notion.getPage(pageId)
    
    // Replace audio URLs with fixed file
    recordMap = replaceAudioUrls(recordMap)
    
    // Get slug mappings for internal links (only in production)
    let slugMappings: Array<{ slug: string; pageId: string; title: string }> = []
    if (!isDev) {
      const { generateSlugMappings } = await import('../lib/slugMapping')
      slugMappings = await generateSlugMappings(pageId)
    }

    return {
      props: {
        recordMap,
        slugMappings,
      },
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      props: {
        recordMap: {},
        slugMappings: [],
      },
    }
  }
}

