# Damien Henry - Personal Website

A personal website powered by [Next.js](https://nextjs.org/) and [React-Notion-X](https://github.com/NotionX/react-notion-x), rendering content directly from Notion.

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

- ✅ Renders Notion pages with full formatting support
- ✅ **Subpage navigation** - All Notion subpages work automatically
- ✅ Code syntax highlighting
- ✅ Math equations (KaTeX)
- ✅ Image support
- ✅ Collections/Databases
- ✅ Static site generation with ISR (revalidates every 60 seconds)
- ✅ Fully responsive design
- ✅ Dynamic routing for unlimited Notion pages
- ✅ **SEO optimized** - Dynamic sitemap & robots.txt
- ✅ Server-side rendering for crawlers (fallback: 'blocking')

## Customization

- Edit `styles/globals.css` to customize the appearance
- Modify `pages/index.tsx` to adjust the page layout and settings
- Update `next.config.js` to add more image domains if needed

