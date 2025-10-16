import { GetServerSideProps } from 'next'

function generateSiteMap(slugs: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damien-henry.com'
  
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${baseUrl}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     ${slugs
       .map((slug) => {
         return `
       <url>
         <loc>${baseUrl}/${slug}</loc>
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
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
  const slugs: string[] = []

  try {
    const { generateSlugMappings } = await import('../lib/slugMapping')
    const mappings = await generateSlugMappings(rootPageId)
    
    slugs.push(...mappings.map(m => m.slug))
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  const sitemap = generateSiteMap(slugs)

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

