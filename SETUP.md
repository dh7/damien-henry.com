# Quick Setup Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure Notion

1. Create or open a Notion page
2. Make it **public**: Share → Publish to web
3. Copy the page ID from the URL:
   - URL: `https://www.notion.so/My-Page-1234567890abcdef1234567890abcdef`
   - Page ID: `1234567890abcdef1234567890abcdef`

## 3. Create `.env.local`

```bash
# Required
NEXT_PUBLIC_NOTION_PAGE_ID=your-notion-page-id

# Recommended (for hidden refresh button)
REVALIDATE_SECRET=abc123xyz
NEXT_PUBLIC_REVALIDATE_SECRET=abc123xyz

# Optional (for production)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

## 4. Run Locally

```bash
npm run dev
```

Visit: http://localhost:3000

## 5. Refresh Content from Notion

After editing your Notion page, use any of these methods:

**Method 1: URL Parameter (Easiest)**
- Visit: `http://localhost:3000/?refresh=abc123xyz`
- Replace `abc123xyz` with your actual secret
- Refresh button appears automatically

**Method 2: Keyboard Shortcut**
- Go to your site
- Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
- Click "🔄 Refresh Page"

**Method 3: Bookmark (Recommended for Production)**
- Create browser bookmark: `https://yoursite.com/?refresh=your-secret`
- One-click access to refresh button

**Method 4: Direct API Call**
```bash
curl "http://localhost:3000/api/revalidate?secret=abc123xyz"
```

## 6. Deploy to Vercel

1. Push to GitHub
2. Import on [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_NOTION_PAGE_ID`
   - `REVALIDATE_SECRET`
   - `NEXT_PUBLIC_REVALIDATE_SECRET`
   - `NEXT_PUBLIC_SITE_URL` (your production URL)
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

