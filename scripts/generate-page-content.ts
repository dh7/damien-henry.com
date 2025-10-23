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
  
  // Determine environment
  const isDev = process.env.NODE_ENV === 'development' && !process.env.VERCEL
  const environment = isDev ? 'dev' : 'prod'
  
  console.log(`📚 Generating page content for mindcache (${environment} mode)...\n`)
  
  try {
    const pageContents = await generatePageContent(rootPageId)
    
    // Save to public directory with environment-specific filename
    const outputPath = path.join(process.cwd(), 'public', `page-content-${environment}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(pageContents, null, 2))
    
    // Also save as the default for backward compatibility
    const defaultPath = path.join(process.cwd(), 'public', 'page-content.json')
    fs.writeFileSync(defaultPath, JSON.stringify(pageContents, null, 2))
    
    console.log(`\n💾 Saved page content to: ${outputPath}`)
    console.log(`💾 Also saved as default: ${defaultPath}`)
    console.log(`📊 Total pages: ${pageContents.length}`)
    console.log(`📏 Total size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)
    console.log(`🌍 Environment: ${environment}`)
  } catch (error) {
    console.error('❌ Error generating page content:', error)
    process.exit(1)
  }
}

main()

