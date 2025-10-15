import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify secret token to prevent unauthorized rebuilds
  const token = req.headers['x-rebuild-token'] || req.query.token
  const expectedToken = process.env.REBUILD_SECRET_TOKEN

  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid or missing token' })
  }

  try {
    // Trigger Vercel deployment via Deploy Hook
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL
    
    if (!deployHookUrl) {
      return res.status(500).json({ error: 'Deploy hook URL not configured' })
    }

    const response = await fetch(deployHookUrl, { method: 'POST' })
    
    if (!response.ok) {
      throw new Error(`Deploy hook failed: ${response.statusText}`)
    }

    return res.status(200).json({ 
      message: 'Rebuild triggered successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error triggering rebuild:', error)
    return res.status(500).json({ 
      error: 'Failed to trigger rebuild',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

