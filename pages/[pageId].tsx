import { GetStaticPaths, GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import { ExtendedRecordMap } from 'notion-types'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'

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
  if (!recordMap) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>Damien Henry</title>
        <meta name="description" content="Personal website powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <NotionRenderer
          recordMap={recordMap}
          fullPage={true}
          darkMode={false}
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
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Return empty paths to enable fallback
  return {
    paths: [],
    fallback: 'blocking',
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
      revalidate: 60,
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      notFound: true,
      revalidate: 60,
    }
  }
}

