# Deployment

## Option A: Cloudflare Pages Git Integration

1. Push this repo to GitHub.
2. In Cloudflare dashboard, create a new Pages project.
3. Connect the GitHub repository.
4. Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
5. Deploy.

## Option B: Direct Upload via Wrangler

1. Install dependencies and build:
```bash
npm install
npm run build
```
2. Deploy static output:
```bash
npx wrangler pages deploy dist --project-name marketdata-pages
```

This repository requires no Cloudflare Functions; static assets only.
