import { NotionAPI } from 'notion-client'

export interface PageSlugMapping {
  slug: string
  pageId: string
  title: string
}

// Cache to avoid regenerating mappings on every request
let cachedMappings: PageSlugMapping[] | null = null
let cacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in dev

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

export async function generateSlugMappings(rootPageId: string): Promise<PageSlugMapping[]> {
  // Return cached version if still valid
  if (cachedMappings && Date.now() - cacheTime < CACHE_TTL) {
    return cachedMappings
  }
  const notion = new NotionAPI()
  const mappings: PageSlugMapping[] = []
  const usedSlugs = new Set<string>()
  const processedPages = new Set<string>()

  async function fetchPageRecursively(pageId: string) {
    const cleanId = pageId.replace(/-/g, '')
    
    if (processedPages.has(cleanId)) {
      return
    }
    
    processedPages.add(cleanId)
    
    try {
      const recordMap = await notion.getPage(pageId)
      const cleanRootId = rootPageId.replace(/-/g, '')
      
      // Extract all page IDs from the record map
      Object.keys(recordMap.block).forEach((blockId) => {
        const block = recordMap.block[blockId]?.value
        const cleanBlockId = blockId.replace(/-/g, '')
        
        if (block && block.type === 'page' && cleanBlockId !== cleanRootId) {
          const title = (block as any).properties?.title?.[0]?.[0] || 'untitled'
          
          // Check if we already have this page
          if (!mappings.find(m => m.pageId.replace(/-/g, '') === cleanBlockId)) {
            let slug = generateSlug(title)
            
            // Handle duplicate slugs
            let counter = 1
            let uniqueSlug = slug
            while (usedSlugs.has(uniqueSlug)) {
              uniqueSlug = `${slug}-${counter}`
              counter++
            }
            
            usedSlugs.add(uniqueSlug)
            mappings.push({
              slug: uniqueSlug,
              pageId: blockId,
              title
            })
          }
        }
      })
    } catch (error) {
      console.error(`Error fetching page ${cleanId}:`, error)
    }
  }

  try {
    // Start with root page
    await fetchPageRecursively(rootPageId)
    
    // Process all discovered pages recursively
    const initialMappings = [...mappings]
    for (const mapping of initialMappings) {
      await fetchPageRecursively(mapping.pageId)
    }
    
    // Continue processing new pages until no more are found
    let previousCount = 0
    while (mappings.length > previousCount) {
      previousCount = mappings.length
      const currentMappings = [...mappings]
      for (const mapping of currentMappings) {
        if (!processedPages.has(mapping.pageId.replace(/-/g, ''))) {
          await fetchPageRecursively(mapping.pageId)
        }
      }
    }
  } catch (error) {
    console.error('Error generating slug mappings:', error)
  }

  // Cache the results
  cachedMappings = mappings
  cacheTime = Date.now()
  
  return mappings
}

export function getPageIdFromSlug(mappings: PageSlugMapping[], slug: string): string | null {
  const mapping = mappings.find(m => m.slug === slug)
  return mapping ? mapping.pageId : null
}

export function getSlugFromPageId(mappings: PageSlugMapping[], pageId: string): string | null {
  const cleanId = pageId.replace(/-/g, '')
  const mapping = mappings.find(m => m.pageId.replace(/-/g, '') === cleanId)
  return mapping ? mapping.slug : null
}

