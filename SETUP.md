# Quick Setup Guide

This guide will get your Notion-powered website running in 5 minutes.

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure Notion

1. Create or open a Notion page (this will be your homepage)
2. Make it **public**: Share → Publish to web
3. Copy the page ID from the URL:
   - URL: `https://www.notion.so/My-Page-1234567890abcdef1234567890abcdef`
   - Page ID: `1234567890abcdef1234567890abcdef`

## 3. Create `.env.local`

```bash
# Required
NEXT_PUBLIC_NOTION_PAGE_ID=your-notion-page-id

# Recommended (for hidden refresh button - kept secure on server)
REVALIDATE_SECRET=abc123xyz

# Optional (for production)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

**Security Note:** The secret is only stored server-side and never exposed to the client. You'll enter it manually when refreshing.

## 4. Run Locally

```bash
npm run dev
```

Visit: http://localhost:3000

**Note:** In development mode, pages load on-demand. The MindCache STM will be empty until you run a production build.

## 5. Refresh Content from Notion

After editing your Notion page, use any of these methods:

**Method 1: URL Parameter (Easiest)**
- Visit: `http://localhost:3000/?refresh=1`
- A popup appears with options:
  - Enter your secret
  - **Revalidate all pages** - Refresh all cached pages (fast, ~5-10s)
  - **Regenerate content (full rebuild)** - Rebuild + update chatbot content (slow, ~2-3 min)
- Click the appropriate button

**Method 2: Keyboard Shortcut**
- Go to your site
- Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
- Enter your secret in the popup
- Select options as needed
- Click refresh button

**Refresh Options Explained:**

| Option | What it does | Speed | Chatbot Updated? |
|--------|-------------|-------|------------------|
| Single page (default) | Refresh current page only | ~1s | ❌ No |
| Revalidate all pages | Refresh all pages in your site | ~5-10s | ❌ No |
| Regenerate content | Full rebuild + content extraction | ~2-3 min | ✅ Yes |

**Method 3: Bookmark (Recommended for Production)**
- Create browser bookmark: `https://yoursite.com/?refresh=1`
- One-click to show the refresh popup

**Method 4: Direct API Call**
```bash
# Refresh single page
curl "http://localhost:3000/api/revalidate?secret=abc123xyz"

# Refresh all pages
curl "http://localhost:3000/api/revalidate?secret=abc123xyz&all=true"

# Full rebuild (regenerate content)
curl "http://localhost:3000/api/rebuild?secret=abc123xyz"
```

## 6. AI Chat & MindCache (Optional)

This project includes an AI chatbot with MindCache STM (Short-Term Memory):

**What it does:**
- Gives visitors an AI assistant that knows your entire website content
- Uses OpenAI API to answer questions based on your Notion pages

**Setup:**
1. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-...your-key...
   ```

2. **How it works:**
   - During build: All page content is extracted to `public/page-content.json`
   - On load: MindCache STM is initialized with all your pages
   - Visitors can chat with AI that has full context of your site

**Debug Mode:**
- Press **Cmd+Shift+D** to inspect the STM and see what content is loaded

## 7. Deploy to Vercel

1. Push to GitHub
2. Import on [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_NOTION_PAGE_ID`
   - `REVALIDATE_SECRET` (server-only, not exposed to client)
   - `NEXT_PUBLIC_SITE_URL` (your production URL)
   - `OPENAI_API_KEY` (for AI chat functionality)
4. Deploy!

## FAQ

**Q: Do pages auto-update?**
A: No automatic updates. Use the hidden button or redeploy.

**Q: How do I add new pages?**
A: Add them in Notion, then redeploy (or they'll generate on first visit).

**Q: Can I customize the design?**
A: Yes! Edit `styles/globals.css` for custom styling.

**Q: What if I forget the refresh button?**
A: Just redeploy from Vercel dashboard or use the API endpoint.

**Q: What happens if someone visits an invalid page?**
A: Invalid pages automatically redirect to the homepage.

