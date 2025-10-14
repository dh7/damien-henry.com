import { NotionAPI } from 'notion-client'

export async function getAllPageIds(rootPageId: string): Promise<string[]> {
  const notion = new NotionAPI()
  const pageIds = new Set<string>()
  const processedPages = new Set<string>()
  
  async function fetchPageRecursively(pageId: string) {
    const cleanId = pageId.replace(/-/g, '')
    
    // Avoid processing the same page twice
    if (processedPages.has(cleanId)) {
      return
    }
    
    processedPages.add(cleanId)
    
    try {
      console.log(`Fetching page: ${cleanId}`)
      const recordMap = await notion.getPage(pageId)
      
      // Extract all page IDs from the record map
      Object.keys(recordMap.block).forEach((blockId) => {
        const block = recordMap.block[blockId]?.value
        const cleanBlockId = blockId.replace(/-/g, '')
        const cleanRootId = rootPageId.replace(/-/g, '')
        
        if (block && block.type === 'page' && cleanBlockId !== cleanRootId) {
          pageIds.add(blockId)
        }
      })
    } catch (error) {
      console.error(`Error fetching page ${cleanId}:`, error)
    }
  }
  
  // Start with root page
  await fetchPageRecursively(rootPageId)
  
  // Process all discovered pages recursively
  const pagesToProcess = Array.from(pageIds)
  for (const pageId of pagesToProcess) {
    await fetchPageRecursively(pageId)
  }
  
  return Array.from(pageIds)
}

