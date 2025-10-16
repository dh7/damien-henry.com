import { GetStaticPaths, GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import RevalidateButton from '@/components/RevalidateButton'
import Breadcrumb from '@/components/Breadcrumb'
import { useMemo } from 'react'

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
  slugMappings?: Array<{ slug: string; pageId: string; title: string }>
}

export default function NotionPage({ recordMap, pageId, slugMappings = [] }: PageProps) {
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
        <meta name="description" content="Personal website powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RevalidateButton pageId={pageId} />
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
          mapPageUrl={(notionPageId) => {
            const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
            const cleanPageId = notionPageId.replace(/-/g, '')
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
            return `/${notionPageId}`
          }}
        />
        </main>
      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
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
    const paths = mappings.map(mapping => ({ params: { pageId: mapping.slug } }))
    
    return {
      paths,
      fallback: 'blocking', // Still generate new pages on-demand if added later
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
  const slug = params?.pageId as string // This is actually a slug now
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''

  if (!slug) {
    return {
      notFound: true,
    }
  }

  try {
    // Get slug mappings to find the actual page ID
    const { generateSlugMappings, getPageIdFromSlug } = await import('../lib/slugMapping')
    const mappings = await generateSlugMappings(rootPageId)
    const actualPageId = getPageIdFromSlug(mappings, slug)
    
    if (!actualPageId) {
      return {
        notFound: true,
      }
    }

    const recordMap = await notion.getPage(actualPageId)

    return {
      props: {
        recordMap,
        pageId: actualPageId,
        slugMappings: mappings,
      },
      revalidate: false, // Use on-demand revalidation only (via button)
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      notFound: true,
      revalidate: 60,
    }
  }
}

