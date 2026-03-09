# Deployment Guide

This app requires **no server-side environment variables**. Users configure their Typesense connection through the browser login page.

---

## Table of Contents

- [Vercel (Recommended)](#vercel-recommended)
- [Docker](#docker)
- [Node.js](#nodejs)
- [Behind a Reverse Proxy (nginx)](#behind-a-reverse-proxy-nginx)

---

## Vercel (Recommended)

This app is optimized for [Vercel](https://vercel.com/) — the platform built by the creators of Next.js.

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/typesense-admin-ui&project-name=typesense-admin-ui)

> Replace `YOUR_USERNAME/typesense-admin-ui` with your actual GitHub repository URL.

After deployment, open the app and enter your Typesense connection details on the login page.

### Deploy via Vercel CLI

```bash
# Install
npm i -g vercel

# Login
vercel login

# Deploy (preview)
vercel

# Deploy (production)
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account or team
- **Link to existing project?** No (first deploy)
- **Project name?** `typesense-admin-ui`
- **Directory?** `./`
- **Override settings?** No

### Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **Import** next to your repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
5. Click **Deploy** — no environment variables needed

Every push to `main` triggers an automatic production deployment. Pull requests get preview deployments.

### Custom Domain

1. Go to your Vercel project > **Settings** > **Domains**
2. Add your custom domain (e.g., `admin.example.com`)
3. Update DNS records as instructed
4. SSL is provisioned automatically

### Recommended Project Settings

| Setting | Value | Location |
|---|---|---|
| Framework Preset | Next.js | General |
| Node.js Version | 20.x | General |
| Build Command | `next build` | General |
| Output Directory | `.next` | General |
| Function Region | Closest to your Typesense server | Functions |

> **Tip:** Select a Vercel Function Region close to your Typesense server to minimize latency. For example, if your Typesense server is in `us-east-1`, choose `iad1` (Washington, D.C.).

---

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t typesense-admin-ui .
docker run -p 3000:3000 typesense-admin-ui
```

---

## Node.js

```bash
npm run build
npm start
```

The app listens on port 3000 by default. Set the `PORT` environment variable to change it:

```bash
PORT=8080 npm start
```

---

## Behind a Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name admin.example.com;

    ssl_certificate /etc/ssl/certs/admin.example.com.pem;
    ssl_certificate_key /etc/ssl/private/admin.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Important:** Always use HTTPS in production so that cookies with the `Secure` flag are transmitted correctly.
