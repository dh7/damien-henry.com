import { GetServerSideProps } from 'next'
import { NotionAPI } from 'notion-client'

function generateSiteMap(pageIds: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damien-henry.com'
  
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${baseUrl}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     ${pageIds
       .map((id) => {
         return `
       <url>
         <loc>${baseUrl}/${id}</loc>
         <changefreq>daily</changefreq>
         <priority>0.8</priority>
       </url>
     `
       })
       .join('')}
   </urlset>
 `
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const notion = new NotionAPI()
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
  const pageIds: string[] = []

  try {
    const recordMap = await notion.getPage(rootPageId)
    
    Object.keys(recordMap.block).forEach((blockId) => {
      const block = recordMap.block[blockId]?.value
      if (block && block.type === 'page' && blockId !== rootPageId) {
        pageIds.push(blockId)
      }
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  const sitemap = generateSiteMap(pageIds)

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}

export default function SiteMap() {
  return null
}

