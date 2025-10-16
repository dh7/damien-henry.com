import { NotionAPI } from 'notion-client'

export interface PageSlugMapping {
  slug: string
  pageId: string
  title: string
  parentSlug: string | null
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
    console.log('✓ Using cached slug mappings')
    return cachedMappings
  }
  
  console.log('⚠ Fetching all pages from Notion (this may take 20-30 seconds)...')
  const notion = new NotionAPI()
  const pageMap = new Map<string, { title: string; parentId: string | null; pageId: string }>()
  const processedPages = new Set<string>()

  async function fetchPageRecursively(pageId: string, parentId: string | null = null) {
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
          
          // Determine parent: if this is the current page being fetched, use parentId
          // Otherwise, the parent is the current page
          const blockParentId = cleanBlockId === cleanId ? parentId : cleanId
          
          if (!pageMap.has(cleanBlockId)) {
            pageMap.set(cleanBlockId, {
              title,
              parentId: blockParentId,
              pageId: blockId
            })
          }
        }
      })
      
      // Recursively fetch child pages
      for (const [blockId, info] of pageMap.entries()) {
        if (!processedPages.has(blockId)) {
          await fetchPageRecursively(info.pageId, cleanId)
        }
      }
    } catch (error) {
      console.error(`Error fetching page ${cleanId}:`, error)
    }
  }

  try {
    // Start with root page
    await fetchPageRecursively(rootPageId, null)
  } catch (error) {
    console.error('Error generating slug mappings:', error)
  }

  // Build hierarchical slugs
  const mappings: PageSlugMapping[] = []
  const usedSlugs = new Set<string>()
  const slugCache = new Map<string, string>() // cleanId -> full slug path

  function buildSlugPath(cleanId: string): string {
    if (slugCache.has(cleanId)) {
      return slugCache.get(cleanId)!
    }

    const info = pageMap.get(cleanId)
    if (!info) return ''

    let baseSlug = generateSlug(info.title)
    
    // Build path from parent
    let fullSlug = baseSlug
    if (info.parentId) {
      const parentSlug = buildSlugPath(info.parentId)
      if (parentSlug) {
        fullSlug = `${parentSlug}/${baseSlug}`
      }
    }

    // Handle duplicate slugs by adding counter
    let uniqueSlug = fullSlug
    let counter = 1
    while (usedSlugs.has(uniqueSlug)) {
      const parts = fullSlug.split('/')
      parts[parts.length - 1] = `${baseSlug}-${counter}`
      uniqueSlug = parts.join('/')
      counter++
    }

    usedSlugs.add(uniqueSlug)
    slugCache.set(cleanId, uniqueSlug)
    return uniqueSlug
  }

  // Generate mappings for all pages
  for (const [cleanId, info] of pageMap.entries()) {
    const fullSlug = buildSlugPath(cleanId)
    const parentSlug = info.parentId ? buildSlugPath(info.parentId) : null
    
    mappings.push({
      slug: fullSlug,
      pageId: info.pageId,
      title: info.title,
      parentSlug
    })
  }

  // Cache the results
  cachedMappings = mappings
  cacheTime = Date.now()
  
  console.log(`✓ Cached ${mappings.length} page mappings for 5 minutes`)
  
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
