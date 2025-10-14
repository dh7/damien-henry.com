import { NextApiRequest, NextApiResponse } from 'next'
import { NotionAPI } from 'notion-client'

const notion = new NotionAPI()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pageId } = req.query

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid pageId' })
  }

  try {
    const recordMap = await notion.getPage(pageId)
    res.status(200).json(recordMap)
  } catch (error) {
    console.error('Error fetching Notion page:', error)
    res.status(500).json({ error: 'Failed to fetch Notion page' })
  }
}

