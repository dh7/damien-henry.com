import { config } from 'dotenv'
import { generatePageContent } from '../lib/extractPageContent'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const rootPageId = process.env.NEXT_PUBLIC_NOTION_PAGE_ID
  
  if (!rootPageId) {
    console.error('❌ NEXT_PUBLIC_NOTION_PAGE_ID is not set')
    process.exit(1)
  }
  
  console.log('📚 Generating page content for mindcache...\n')
  
  try {
    const pageContents = await generatePageContent(rootPageId)
    
    // Save to public directory so it's accessible on client side
    const outputPath = path.join(process.cwd(), 'public', 'page-content.json')
    fs.writeFileSync(outputPath, JSON.stringify(pageContents, null, 2))
    
    console.log(`\n💾 Saved page content to: ${outputPath}`)
    console.log(`📊 Total pages: ${pageContents.length}`)
    console.log(`📏 Total size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('❌ Error generating page content:', error)
    process.exit(1)
  }
}

main()

