# cnighut.com

Personal blog built with [Astro](https://astro.build) using the [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) theme.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Writing a Post

Create a new file in `src/content/post/`:

```markdown
---
title: "My Post Title"
description: "A brief description"
publishDate: "2026-01-27"
---

Your content here...
```

### Frontmatter Options

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title (max 60 chars) |
| `description` | Yes | SEO description |
| `publishDate` | Yes | Publication date |
| `updatedDate` | No | Last updated date |
| `draft` | No | Set `true` to hide in production |
| `coverImage` | No | Hero image `{ src, alt }` |
| `pinned` | No | Pin to top of list |

## Deployment

Hosted on Cloudflare Pages:

1. Push to GitHub
2. Connect to Cloudflare Pages
3. Build settings:
   - **Build command**: `npm run build && npm run postbuild`
   - **Output directory**: `dist`
4. Custom domain: `cnighut.com`

## Features

- Dark/Light mode
- Search (Pagefind)
- RSS feed
- SEO optimized
- Markdown/MDX support
- Table of Contents (collapsible on mobile, sticky sidebar on desktop)

## License

MIT
