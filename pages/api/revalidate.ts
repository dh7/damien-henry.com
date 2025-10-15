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
    const { path, pageId } = req.query

    if (pageId && typeof pageId === 'string') {
      // Revalidate specific page
      await res.revalidate(`/${pageId}`)
      return res.json({ 
        revalidated: true, 
        path: `/${pageId}`,
        timestamp: new Date().toISOString()
      })
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

