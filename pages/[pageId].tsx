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

interface PageProps {
  recordMap: any
  pageId: string
}

export default function NotionPage({ recordMap, pageId }: PageProps) {
  const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
  
  // Extract page title and build breadcrumb path
  const breadcrumbData = useMemo(() => {
    if (!recordMap) return { title: '', breadcrumbs: [] }
    
    const cleanPageId = pageId.replace(/-/g, '')
    const block = recordMap.block?.[cleanPageId]?.value
    
    let pageTitle = ''
    if (block && 'properties' in block && block.properties?.title) {
      pageTitle = block.properties.title[0]?.[0] || ''
    }
    
    // Build breadcrumb trail by walking up parent pages
    const breadcrumbs: Array<{ title: string; href: string }> = []
    let currentBlockId = cleanPageId
    let depth = 0
    const maxDepth = 10 // Prevent infinite loops
    
    while (currentBlockId && depth < maxDepth) {
      const currentBlock = recordMap.block?.[currentBlockId]?.value
      if (!currentBlock || !('properties' in currentBlock)) break
      
      const title = currentBlock.properties?.title?.[0]?.[0] || 'Untitled'
      const parentId = currentBlock.parent_id?.replace(/-/g, '')
      
      // Only add to breadcrumbs if this isn't the root page
      if (parentId && recordMap.block?.[parentId]) {
        breadcrumbs.unshift({
          title,
          href: `/${currentBlockId}`
        })
      }
      
      currentBlockId = parentId || ''
      depth++
    }
    
    return { title: pageTitle, breadcrumbs }
  }, [recordMap, pageId])
  
  if (!recordMap) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>{breadcrumbData.title ? `${breadcrumbData.title} - Damien Henry` : 'Damien Henry'}</title>
        <meta name="description" content="Personal website powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {revalidateSecret && <RevalidateButton pageId={pageId} secret={revalidateSecret} />}
      <Breadcrumb breadcrumbs={breadcrumbData.breadcrumbs} />
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
            nextLink: Link,
          }}
          mapPageUrl={(pageId) => {
            const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
            // Remove dashes from page IDs for comparison
            const cleanPageId = pageId.replace(/-/g, '')
            const cleanRootId = rootPageId.replace(/-/g, '')
            
            // If it's the root page, link to home
            if (cleanPageId === cleanRootId) {
              return '/'
            }
            // Otherwise link to the dynamic route
            return `/${pageId}`
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
    const { getAllPageIds } = await import('../lib/getAllPageIds')
    const pageIds = await getAllPageIds(rootPageId)
    const paths = pageIds.map(id => ({ params: { pageId: id } }))
    
    console.log(`Pre-generating ${paths.length} pages at build time (including nested pages)`)
    
    return {
      paths,
      fallback: 'blocking', // Still generate new pages on-demand if added later
    }
  } catch (error) {
    console.error('Error fetching page IDs for static paths:', error)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const notion = new NotionAPI()
  const pageId = params?.pageId as string

  if (!pageId) {
    return {
      notFound: true,
    }
  }

  try {
    const recordMap = await notion.getPage(pageId)

    return {
      props: {
        recordMap,
        pageId,
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

