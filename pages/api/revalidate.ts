import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for secret to confirm this is a valid request
  const secret = req.query.secret || req.headers['x-revalidate-secret']
  
  if (secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    const { path, pageId, all } = req.query

    // Revalidate all pages
    if (all === 'true') {
      const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
      const { generateSlugMappings } = await import('../../lib/slugMapping')
      const mappings = await generateSlugMappings(rootPageId)
      
      // Revalidate homepage
      await res.revalidate('/')
      
      // Revalidate all mapped pages
      const revalidationPromises = mappings.map(mapping => 
        res.revalidate(`/${mapping.slug}`)
      )
      
      await Promise.all(revalidationPromises)
      
      return res.json({ 
        revalidated: true, 
        revalidatedCount: mappings.length + 1, // +1 for homepage
        timestamp: new Date().toISOString()
      })
    }

    if (pageId && typeof pageId === 'string') {
      // Convert pageId to nested slug path
      const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID || ''
      const { generateSlugMappings, getSlugFromPageId } = await import('../../lib/slugMapping')
      const mappings = await generateSlugMappings(rootPageId)
      const slug = getSlugFromPageId(mappings, pageId)
      
      if (slug) {
        await res.revalidate(`/${slug}`)
        return res.json({ 
          revalidated: true, 
          path: `/${slug}`,
          timestamp: new Date().toISOString()
        })
      } else {
        return res.status(404).json({ message: 'Page not found' })
      }
    }

    if (path && typeof path === 'string') {
      // Revalidate specific path
      await res.revalidate(path)
      return res.json({ 
        revalidated: true, 
        path,
        timestamp: new Date().toISOString()
      })
    }

    // Revalidate homepage
    await res.revalidate('/')
    
    return res.json({ 
      revalidated: true, 
      path: '/',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    return res.status(500).json({ 
      message: 'Error revalidating',
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}

