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

interface HomeProps {
  recordMap: any
}

export default function Home({ recordMap }: HomeProps) {
  const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
  
  return (
    <>
      <Head>
        <title>Damien Henry</title>
        <meta name="description" content="Personal website powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {revalidateSecret && <RevalidateButton secret={revalidateSecret} />}
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
    const recordMap = await notion.getPage(pageId)

    return {
      props: {
        recordMap,
      },
      revalidate: false, // Use on-demand revalidation only (via button)
    }
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    return {
      props: {
        recordMap: {},
      },
      revalidate: 60,
    }
  }
}

