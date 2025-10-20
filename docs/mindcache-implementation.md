# MindCache Implementation Guide

## Overview

This project implements a comprehensive MindCache STM (Short-Term Memory) system that:
1. **Extracts page content during build time**
2. **Loads content into mindcache on site initialization**
3. **Persists user data in cookies**
4. **Provides debug tools for inspection**

## Architecture

### Build-Time Content Extraction

**Files:**
- `lib/extractPageContent.ts` - Extracts text from Notion pages
- `scripts/generate-page-content.ts` - Build script that generates JSON file
- `public/page-content.json` - Generated file with all page content

**How it works:**
1. During `npm run build`, the `prebuild` script runs first
2. It fetches all pages from Notion via the API
3. Extracts text content from each page's blocks
4. Saves to `public/page-content.json` with format:
   ```json
   [
     {
       "pageId": "abc-123",
       "slug": "my-page",
       "title": "My Page Title",
       "content": "All the text content..."
     }
   ]
   ```

### Runtime MindCache Initialization

**Files:**
- `lib/MindCacheContext.tsx` - React Context provider for MindCache

**How it works:**
1. App wraps with `<MindCacheProvider>` in `_app.tsx`
2. On initialization:
   - Fetches `/page-content.json`
   - Loads each page as `page:/{slug}` key in mindcache
   - Tags each page with `page` and `content` tags
   - Marks pages as readonly (not saved to cookies)
   - Loads user's custom data from cookies
3. On changes:
   - Saves user data to cookies (excludes page content)
   - Auto-saves with 30-day expiry

### Debug Interface

**Files:**
- `components/Layout.tsx` - Adds keyboard shortcut
- `components/STMEditor.tsx` - Visual STM inspector

**Usage:**
- Press **Cmd+Shift+D** (or **Ctrl+Shift+D**) anywhere
- Opens full-screen debug popup showing all mindcache keys
- Filter by tags: `page`, `content`
- Edit, delete, or inspect any key-value pair
- Press **Escape** to close

## Usage Examples

### Accessing Page Content in Chat

The AI chat interface automatically has access to all page content through the mindcache system prompt:

```typescript
// In ChatInterface.tsx
const systemPrompt = mindcacheRef.get_system_prompt()
// Includes all page: keys automatically
```

### Accessing Specific Pages

```typescript
import { useMindCache } from '@/lib/MindCacheContext'

function MyComponent() {
  const mindcache = useMindCache()
  
  // Get home page content
  const homeContent = mindcache.get_value('page:/')
  
  // Get specific page
  const aboutContent = mindcache.get_value('page:/about')
  
  // Get all pages
  const allPages = mindcache.getTagged('page')
  
  return <div>{homeContent}</div>
}
```

### Adding Custom Data

```typescript
const mindcache = useMindCache()

// Add user preference (auto-saved to cookie)
mindcache.set_value('user_name', 'John Doe')

// Add with metadata
mindcache.set_value('theme', 'dark', {
  readonly: false,
  visible: true,
  type: 'text'
})

// Add tags for organization
mindcache.addTag('theme', 'preference')
mindcache.addTag('theme', 'ui')
```

## Development Workflow

### First Time Setup
```bash
npm install
# Create .env.local with NEXT_PUBLIC_NOTION_PAGE_ID
npm run generate-content  # Generate page content
npm run dev
```

### After Content Updates
```bash
# Regenerate page content from Notion
npm run generate-content

# Or rebuild everything
npm run build
```

### Production Build
```bash
npm run build  # Automatically runs generate-content first
npm start
```

## File Structure

```
damien-henry.com/
├── lib/
│   ├── MindCacheContext.tsx      # React Context + initialization
│   ├── extractPageContent.ts     # Content extraction utilities
│   └── slugMapping.ts            # Notion slug mappings
├── scripts/
│   └── generate-page-content.ts  # Build-time script
├── public/
│   └── page-content.json         # Generated content (gitignored in prod)
├── components/
│   ├── Layout.tsx                # Keyboard shortcuts
│   ├── STMEditor.tsx             # Debug UI
│   ├── ChatInterface.tsx         # Uses mindcache
│   └── ChatInput.tsx             # Uses mindcache
└── pages/
    └── _app.tsx                  # Wraps with MindCacheProvider
```

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_NOTION_PAGE_ID=your-page-id
OPENAI_API_KEY=your-api-key
```

## Key Features

✅ **Build-time content extraction** - All pages processed once during build
✅ **Automatic initialization** - Mindcache loads page content on startup
✅ **Cookie persistence** - User data survives page reloads
✅ **Debug interface** - Visual inspector with Cmd+Shift+D
✅ **Tag-based filtering** - Organize and filter keys by tags
✅ **Readonly protection** - Page content can't be accidentally modified
✅ **Separation of concerns** - Page content (build) vs user data (cookies)

## Troubleshooting

**Q: Page content not showing up?**
- Run `npm run generate-content` manually
- Check `public/page-content.json` exists and has data
- Verify `NEXT_PUBLIC_NOTION_PAGE_ID` is set

**Q: Changes not persisting?**
- Check browser cookies (should see `mindcache_state`)
- Clear cookies and reload if corrupted
- User data is separate from page content

**Q: Debug popup not opening?**
- Make sure you're using Cmd/Ctrl + Shift + D (not lowercase d)
- Check browser console for errors
- Try Escape key to close if it's hidden

## Performance Considerations

- **Build time**: ~5-10 seconds per 100 pages
- **Load time**: Instant (JSON is ~100KB for typical site)
- **Memory**: Minimal (text-only, no images)
- **Cookie size**: Only stores user data, not page content

