import { NotionAPI } from 'notion-client'

interface PageContent {
  pageId: string;
  slug: string;
  title: string;
  content: string;
}

// Extract text content from Notion blocks
function extractTextFromBlock(block: any): string {
  if (!block) return '';
  
  const texts: string[] = [];
  
  // Extract title/text from properties
  if (block.properties) {
    if (block.properties.title) {
      const titleText = block.properties.title
        .map((item: any) => (Array.isArray(item) ? item[0] : item))
        .filter((t: any) => typeof t === 'string')
        .join(' ');
      if (titleText) texts.push(titleText);
    }
    
    // Check other text properties
    ['caption', 'description'].forEach(prop => {
      if (block.properties[prop]) {
        const text = block.properties[prop]
          .map((item: any) => (Array.isArray(item) ? item[0] : item))
          .filter((t: any) => typeof t === 'string')
          .join(' ');
        if (text) texts.push(text);
      }
    });
  }
  
  return texts.join(' ');
}

// Extract all text content from a recordMap
function extractTextFromRecordMap(recordMap: any): string {
  const texts: string[] = [];
  
  if (recordMap.block) {
    Object.values(recordMap.block).forEach((blockWrapper: any) => {
      const block = blockWrapper?.value;
      if (block) {
        const text = extractTextFromBlock(block);
        if (text.trim()) {
          texts.push(text.trim());
        }
      }
    });
  }
  
  return texts.join('\n\n');
}

// Generate page content for all pages
export async function generatePageContent(rootPageId: string): Promise<PageContent[]> {
  const notion = new NotionAPI();
  const pageContents: PageContent[] = [];
  const processedPages = new Set<string>();
  
  // Import slug mapping
  const { generateSlugMappings } = await import('./slugMapping');
  const slugMappings = await generateSlugMappings(rootPageId);
  
  console.log('🔍 Extracting content from pages...');
  
  // Process root page
  try {
    const rootMapping = slugMappings.find(m => m.pageId.replace(/-/g, '') === rootPageId.replace(/-/g, ''));
    const recordMap = await notion.getPage(rootPageId);
    const content = extractTextFromRecordMap(recordMap);
    
    pageContents.push({
      pageId: rootPageId,
      slug: '/',
      title: rootMapping?.title || 'Home',
      content: content
    });
    
    console.log(`  ✅ / (${content.length} chars)`);
  } catch (error) {
    console.error(`  ❌ Error processing root page:`, error);
  }
  
  // Process all other pages
  for (const mapping of slugMappings) {
    const cleanId = mapping.pageId.replace(/-/g, '');
    const cleanRootId = rootPageId.replace(/-/g, '');
    
    // Skip root page (already processed)
    if (cleanId === cleanRootId) continue;
    
    // Skip if already processed
    if (processedPages.has(cleanId)) continue;
    processedPages.add(cleanId);
    
    try {
      const recordMap = await notion.getPage(mapping.pageId);
      const content = extractTextFromRecordMap(recordMap);
      
      pageContents.push({
        pageId: mapping.pageId,
        slug: mapping.slug,
        title: mapping.title,
        content: content
      });
      
      console.log(`  ✅ /${mapping.slug} (${content.length} chars)`);
    } catch (error) {
      console.error(`  ❌ Error processing ${mapping.slug}:`, error);
    }
  }
  
  console.log(`\n✨ Extracted content from ${pageContents.length} pages`);
  
  return pageContents;
}

