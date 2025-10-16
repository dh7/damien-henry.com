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
        <meta name="description" content="Personal website powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
    
    // Download audio files and replace URLs
    recordMap = await downloadAudioFiles(recordMap, pageId, notion)
    
    // Get slug mappings for internal links
    const { generateSlugMappings } = await import('../lib/slugMapping')
    const slugMappings = await generateSlugMappings(pageId)

    return {
      props: {
        recordMap,
        slugMappings,
      },
      revalidate: 3600, // Revalidate every hour to refresh Notion's signed URLs
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

