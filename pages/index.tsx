import { GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import { ExtendedRecordMap } from 'notion-types'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import RevalidateButton from '@/components/RevalidateButton'
import Breadcrumb from '@/components/Breadcrumb'

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

export default function Home({ recordMap, slugMappings = [] }: HomeProps) {
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
      <div style={{ paddingTop: '60px' }}>
        <main>
        <NotionRenderer
          recordMap={recordMap}
          fullPage={true}
          darkMode={false}
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
      revalidate: 60,
    }
  }

  try {
    let recordMap = await notion.getPage(pageId)
    
    // Skip audio download in dev mode for speed
    if (!isDev) {
      recordMap = await downloadAudioFiles(recordMap, pageId, notion)
    }
    
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
      revalidate: isDev ? false : 3600, // No revalidation in dev
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      props: {
        recordMap: {},
        slugMappings: [],
      },
      revalidate: 60,
    }
  }
}

