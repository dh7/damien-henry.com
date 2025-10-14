import { GetStaticProps } from 'next'
import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'
import { ExtendedRecordMap } from 'notion-types'
import Head from 'next/head'
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

interface HomeProps {
  recordMap: ExtendedRecordMap
}

export default function Home({ recordMap }: HomeProps) {
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
          }}
        />
      </main>
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
      revalidate: 60, // Revalidate every 60 seconds
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

