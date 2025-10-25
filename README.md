# Notion-Powered Website

A Next.js website that renders your Notion pages as a beautiful, fast website. Built with [React-Notion-X](https://github.com/NotionX/react-notion-x).

**Perfect for:** Personal websites, documentation, blogs, portfolios - anything you can create in Notion.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Configure your Notion page:**
   - Create or open a Notion page that you want to use as your homepage
   - Make the page **public** (Share → Publish to web)
   - Copy the page ID from the URL
     - Example URL: `https://www.notion.so/Your-Page-Title-1234567890abcdef1234567890abcdef`
     - Page ID: `1234567890abcdef1234567890abcdef`

3. **Set environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_NOTION_PAGE_ID=your-notion-page-id-here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see your site.

## Deploy on Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in your Vercel project settings:
   - `NEXT_PUBLIC_NOTION_PAGE_ID`
   - `NEXT_PUBLIC_SITE_URL` (your production URL)
4. Deploy!

The easiest way to deploy is to use the [Vercel Platform](https://vercel.com/new).

## Features

- ✅ **Full Notion Support** - Renders all Notion formatting (headings, lists, code blocks, tables, etc.)
- ✅ **Subpage Navigation** - All Notion subpages work automatically with dynamic routing
- ✅ **AI Chatbot** - Built-in chat interface with MindCache STM (context memory)
- ✅ **Easy Content Updates** - Hidden refresh button to pull latest Notion changes
- ✅ **Code Highlighting** - Syntax highlighting for code blocks
- ✅ **Math Support** - KaTeX for equations
- ✅ **Images & Media** - Full image and embed support
- ✅ **Collections/Databases** - Notion database views
- ✅ **Fast & SEO-Friendly** - Static generation with ISR, dynamic sitemap, server-side rendering
- ✅ **Fully Responsive** - Works on all devices
- ✅ **Auto-redirect** - Invalid pages redirect to homepage

## Updating Content from Notion

**Option 1: Hidden Refresh Button (Recommended)**

A hidden refresh button is built into every page:

1. **Setup:**
   Add to your `.env.local`:
   ```bash
   REVALIDATE_SECRET=your-secret-here
   ```
   
   Note: The secret is NOT exposed in client-side code - you enter it manually when needed.

2. **Usage (3 ways):**
   
   **A) URL Parameter:**
   - Visit: `https://yoursite.com/?refresh=1`
   - Button appears with a text field - enter your secret
   
   **B) Keyboard Shortcut:**
   - Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
   - Button appears with a text field - enter your secret
   
   **C) Bookmark:**
   - Create a bookmark with URL: `https://yoursite.com/?refresh=1`
   - Click bookmark to show the refresh popup
   - Enter your secret and click "🔄 Refresh Page" to pull latest Notion content

**Option 2: API Endpoint**

Refresh programmatically:
```bash
curl "https://yoursite.com/api/revalidate?secret=your-secret&pageId=page-id"
```

**Option 3: Full Rebuild (for new pages)**

To automatically rebuild your site when you update Notion:

1. **Create a Deploy Hook in Vercel:**
   - Go to your Vercel project → Settings → Git → Deploy Hooks
   - Create a new hook (name it "Notion Updates")
   - Copy the webhook URL

2. **Add environment variables:**
   ```bash
   REBUILD_SECRET_TOKEN=your-random-secret-here
   VERCEL_DEPLOY_HOOK_URL=your-deploy-hook-url
   ```

3. **Trigger rebuild:**
   ```bash
   curl -X POST https://yoursite.com/api/rebuild \
     -H "x-rebuild-token: your-secret-token"
   ```

## AI Chat Feature

The site includes an AI chatbot that knows your entire website:

1. Add `OPENAI_API_KEY` to your environment variables
2. During build, all page content is extracted to `public/page-content.json`
3. The chatbot uses this content to answer visitor questions

See `SETUP.md` for detailed configuration.

## Customization

- Edit `styles/globals.css` to customize the appearance
- Modify `pages/index.tsx` to adjust the page layout and settings
- Update `next.config.js` to add more image domains if needed

## How It Works

1. **Build Time**: Fetches all Notion pages and generates static HTML
2. **Runtime**: ISR (Incremental Static Regeneration) keeps pages fresh
3. **Updates**: Use the hidden refresh button to pull latest Notion changes
4. **New Pages**: Auto-generate on first visit or trigger full rebuild

