# Typesense Admin UI

A modern, full-featured admin dashboard for [Typesense](https://typesense.org/) — built with Next.js 16, TypeScript, and Tailwind CSS. Manage collections, documents, synonyms, overrides, and API keys through an intuitive web interface.

## Screenshots

> Add screenshots of the dashboard, collection detail, and document search views here.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Connecting to Typesense](#connecting-to-typesense)
- [Feature Guide](#feature-guide)
  - [Dashboard](#dashboard)
  - [Collections](#collections)
  - [Documents](#documents)
  - [Schema Editor](#schema-editor)
  - [Synonyms](#synonyms)
  - [Search Overrides (Curation)](#search-overrides-curation)
  - [API Keys](#api-keys)
  - [Settings](#settings)
- [Deploying to Vercel](#deploying-to-vercel)
  - [One-Click Deploy](#one-click-deploy)
  - [Deploy via Vercel CLI](#deploy-via-vercel-cli)
  - [Deploy via GitHub Integration](#deploy-via-github-integration)
  - [Custom Domain](#custom-domain)
  - [Vercel Project Settings](#vercel-project-settings)
- [Self-Hosting](#self-hosting)
- [Security](#security)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Responsive Design](#responsive-design)
- [License](#license)

---

## Features

- **Dashboard** — Server health, collection stats, quick actions
- **Collection Management** — Create, view, delete collections with full schema control
- **Document Search & Browse** — Full-text search with faceted filtering, range sliders, list/grid views
- **Inline Document Editing** — Edit document JSON directly, delete with confirmation
- **Schema Editor** — Add, edit, and drop fields with property toggles (facet, sort, index, etc.)
- **Synonyms** — Global synonym set management with one-way and multi-way support, bulk upload
- **Search Overrides** — Curate search results with include/exclude rules and filter conditions
- **API Key Management** — Create, view, copy, and delete API keys with scoped permissions
- **Connection Settings** — Configure Typesense connection via login page or settings
- **Session Management** — Auto-logout on idle, remembered credentials, secure client-side storage
- **Responsive Design** — Mobile-first layout with collapsible sidebar, bottom-sheet modals, adaptive grids

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | React framework (App Router) |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [React 19](https://react.dev/) | UI library |
| [Tailwind CSS 3.4](https://tailwindcss.com/) | Styling |
| [Typesense SDK 1.8.2](https://typesense.org/docs/) | Server-side Typesense client |
| [lucide-react](https://lucide.dev/) | Icons |
| [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Class utilities |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+ (or yarn/pnpm)
- A running **Typesense** server (v0.25+ recommended, v26+ for synonym sets)

### Installation

```bash
git clone <repository-url>
cd typesense-admin-ui
npm install
```

### Running the App

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Lint check
npm run lint
```

The app will be available at [http://localhost:3000](http://localhost:3000).

On first visit you will be redirected to the **Login** page to enter your Typesense server connection details. No server-side environment variables are needed.

---

## Connecting to Typesense

All connection credentials are configured through the browser — no server-side environment variables required.

### Login Page

1. Navigate to `/login` (you are redirected here automatically if not connected)
2. Enter your Typesense server's **Protocol**, **Host**, **Port**, and **API Key**
3. Click **Test Connection** to verify
4. Click **Connect** to save credentials

### Settings Page

Already connected? You can update your connection at any time from `/settings`:

- Change host, port, protocol, or API key
- Test the connection before saving
- Reset to clear all stored credentials

### How Credentials Are Stored

Credentials are stored entirely in your browser — the server is stateless:

| Storage | Purpose | Lifetime |
|---|---|---|
| Browser Cookie (`typesense_connection`) | Active session — sent to API proxy routes | 1 year |
| localStorage | "Remember me" — pre-fills login form on return | 30-day sliding window |

Credentials are **never** stored on the server, sent to third parties, or exposed in the browser bundle.

### Session Management

- The app auto-logs you out after **1 hour of inactivity** (idle timer)
- You can manually log out from the sidebar or header dropdown
- Saved credentials can be cleared from the login page ("Forget credentials") or settings page ("Reset")

---

## Feature Guide

### Dashboard

**Route:** `/`

The landing page provides an at-a-glance overview of your Typesense server:

- **Server Status** — Green/red indicator showing if the server is reachable
- **Collections Count** — Total number of collections
- **Total Documents** — Sum of documents across all collections
- **API Keys** — Number of configured API keys
- **Recent Collections** — Quick preview cards for up to 6 collections (click to navigate)
- **Quick Actions** — Links to Manage Collections, API Keys, and Connection Settings
- **Active Connection** — Displays the connected host, port, and protocol

### Collections

**Route:** `/collections`

Browse and manage all your Typesense collections:

- **Search** — Filter collections by name
- **Create Collection** — Opens a modal to define a new collection:
  - Set the collection name
  - Add fields with name, type, and options (facet, optional, sort, index, infix, stem, store, range_index)
  - Set default sorting field
- **Collection Cards** — Each card shows:
  - Collection name and creation date
  - Document count, field count, and faceted field count
  - Click to open collection detail
  - Delete button with confirmation modal

### Documents

**Route:** `/collections/[name]` (Documents tab)

Search, browse, edit, and delete documents within a collection:

#### Searching
- Enter a search query and click **Search** (or press Enter)
- Use `*` (default) to browse all documents
- The search uses all indexed string fields automatically
- Search time is displayed in milliseconds

#### View Modes
- **List View** — Algolia-style key-value layout with right-aligned field names. Shows up to 10 fields per document with a "Show more" link for the rest.
- **Grid View** — Card layout with image thumbnails. Automatically detects title, subtitle, and price fields from common naming patterns.

#### Image Detection
Documents are scanned for image URLs using a multi-pass strategy:
1. Fields with image-related names (e.g., `image`, `thumbnail`, `cover`, `photo`)
2. Top-level string values matching image URL patterns
3. Deep scan into nested objects/arrays (up to 3-4 levels)

Detected images appear as thumbnails in list view and as card covers in grid view.

#### Inline Editing
- Click the **pencil icon** on any document to open the JSON editor modal
- Edit the raw JSON and click **Update Document** to save (uses Typesense PATCH API)
- Invalid JSON is caught with an error message before saving

#### Deleting Documents
- Click the **trash icon** once to arm the delete
- Click again within 3 seconds to confirm deletion
- The document is removed from the list immediately on success

#### Faceted Filtering
The facet panel appears on the left sidebar (desktop) or as a toggleable panel (mobile):

- **Value Facets** — Checkboxes for each facet value with document counts. Shows 8 values initially with a "Show N more" link to expand.
- **Range Sliders** — Numeric fields (int32, int64, float) display dual-handle range sliders. Drag the handles to filter by range (uses Typesense `field:[min..max]` syntax).
- **Search Facets** — Type to filter the list of facet sections by field name
- **Active Filters** — Shown as chips above the results. Value filters are blue; range filters are purple. Click X to remove individual filters.
- **Clear All** — Removes all active filters at once

#### Pagination
- 25 documents per page
- Previous/Next buttons with numbered page navigation
- Smart page number display (shows up to 7 page buttons centered around the current page)

### Schema Editor

**Route:** `/collections/[name]` (Schema tab)

View and modify the collection's field schema:

#### Viewing Fields
Each field displays:
- Field name (monospace)
- Type badge (e.g., `string`, `int32`, `float[]`)
- Property badges showing active options (facet, sort, optional, index, infix, stem, store, range_index)

#### Adding Fields
1. Click **Add Field**
2. Enter the field name
3. Select the field type from the dropdown:
   - `string`, `string[]`, `int32`, `int32[]`, `int64`, `int64[]`, `float`, `float[]`
   - `bool`, `bool[]`, `geopoint`, `geopoint[]`
   - `auto`, `object`, `object[]`, `image`, `string*`
4. Toggle desired options (facet, optional, sort, infix, index, stem, store, range_index)
5. Optionally set a locale
6. Click **Add Field** to submit

#### Editing Fields
1. Click the **edit icon** on any field to expand the inline editor
2. Toggle property badges on/off (facet, sort, optional, etc.)
3. Modify the locale if needed
4. An "Unsaved changes" indicator appears when properties differ from the saved state
5. Click **Save Changes** to apply (uses Typesense PATCH API with drop + re-add pattern)

#### Dropping Fields
1. Click the **trash icon** on any field
2. Confirm in the modal — this permanently removes the field and its data from all documents

> **Note:** Typesense requires dropping and re-adding a field to change its properties. The UI handles this automatically in a single PATCH request.

### Synonyms

**Route:** `/collections/[name]/synonyms` or `/synonyms`

Manage synonym sets for improving search relevance:

#### Synonym Types
- **Multi-way** — All terms are interchangeable (e.g., "blazer", "jacket", "coat")
- **One-way** — A root term maps to synonyms (e.g., "pants" → "trousers", "slacks")

#### Creating Synonym Sets
1. Click **New Synonym Set**
2. Enter a set name
3. Add items:
   - For **multi-way**: enter comma-separated synonyms
   - For **one-way**: enter a root term and comma-separated synonyms
4. Add multiple items to a single set
5. Click **Create** to save

#### Bulk Upload
1. Click **Bulk Upload**
2. Paste synonym data in CSV or JSON format
3. The modal provides format instructions and examples
4. Click **Upload** to create multiple sets at once

#### Managing Sets
- **Expand** a set to see all its synonym items with type badges and term details
- **Edit** a set to modify its items
- **Delete** a set with confirmation modal

> **Note:** In Typesense v26+, synonym sets are global resources independent of collections. The synonyms page accessible from a collection detail page manages these global sets.

### Search Overrides (Curation)

**Route:** `/collections/[name]/overrides`

Create rules to curate search results for specific queries:

#### Creating an Override
1. Click **Add Override**
2. Configure the rule:
   - **Query** — The search query to match
   - **Match Type** — `exact` (query must match exactly) or `contains` (query contains the term)
3. Optionally add:
   - **Includes** — Pin specific document IDs to specific positions in results
   - **Excludes** — Remove specific document IDs from results
   - **Filter** — Apply a Typesense `filter_by` expression
4. Click **Create** to save

#### Managing Overrides
- View all rules in a table showing query, match type, includes/excludes, and filter
- **Edit** any rule to modify its configuration
- **Delete** rules with confirmation

### API Keys

**Route:** `/keys`

Manage Typesense API keys with scoped permissions:

#### Creating a Key
1. Click **New API Key**
2. Fill in:
   - **Description** — Human-readable label
   - **Actions** — Select permissions (e.g., `documents:search`, `documents:get`, `collections:*`)
   - **Collections** — Scope to specific collections or `*` for all
   - **Expires** — Optional expiration date/time
3. Click **Create**
4. The generated key value is displayed in a banner — **copy it immediately** as it won't be shown in full again

#### Managing Keys
- **View** all keys in a table with ID, description, masked value, actions, collections, and expiry
- **Reveal/Hide** key values with the eye icon (masked by default)
- **Copy** any key value to clipboard with the copy button
- **Delete** keys with confirmation modal

### Settings

**Route:** `/settings`

Configure the Typesense connection:

- **Host** — Server hostname or IP address
- **Port** — Server port number
- **Protocol** — HTTP or HTTPS
- **API Key** — Admin API key (hidden by default, toggle visibility)
- **Test Connection** — Verify the connection before saving
- **Save Settings** — Store in browser cookie
- **Reset** — Clear all stored credentials from this browser

---

## Deploying to Vercel

This app is optimized for [Vercel](https://vercel.com/) — the platform built by the creators of Next.js. No environment variables are required — users configure their Typesense connection through the login page.

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/typesense-admin-ui&project-name=typesense-admin-ui)

> Replace `YOUR_USERNAME/typesense-admin-ui` with your actual GitHub repository URL.

That's it — no environment variables to configure. After deployment, open your app and enter your Typesense connection details on the login page.

### Deploy via Vercel CLI

1. Install the Vercel CLI:

```bash
npm i -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

3. From the project root, deploy:

```bash
vercel
```

4. Follow the prompts:
   - **Set up and deploy?** Yes
   - **Which scope?** Select your Vercel account or team
   - **Link to existing project?** No (for first deploy)
   - **Project name?** `typesense-admin-ui` (or your preferred name)
   - **Directory?** `./` (default)
   - **Override settings?** No

5. Deploy to production:

```bash
vercel --prod
```

6. Open the deployed URL and log in with your Typesense server details.

### Deploy via GitHub Integration

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **Import** next to your repository
4. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
5. Click **Deploy** — no environment variables needed
6. Open the deployed URL and log in with your Typesense connection details

After the initial deploy, every push to `main` will automatically trigger a new production deployment. Pull requests get automatic preview deployments.

### Custom Domain

1. Go to your Vercel project → **Settings** → **Domains**
2. Add your custom domain (e.g., `admin.example.com`)
3. Update your DNS records as instructed by Vercel
4. SSL certificates are provisioned automatically

### Vercel Project Settings

Recommended settings for production:

| Setting | Value | Location |
|---|---|---|
| Framework Preset | Next.js | General |
| Node.js Version | 20.x | General |
| Build Command | `next build` | General |
| Output Directory | `.next` | General |
| Function Region | Choose closest to your Typesense server | Functions |

**Tip:** Select a Vercel Function Region close to your Typesense server to minimize latency. For example, if your Typesense server is in `us-east-1`, choose `iad1` (Washington, D.C.) as your function region.

---

## Self-Hosting

You can also deploy this app on any platform that supports Node.js:

### Docker

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

### Node.js

```bash
npm run build
npm start
```

The app listens on port 3000 by default. Set the `PORT` environment variable to change it.

### Behind a Reverse Proxy (nginx)

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

---

## Security

### How Credentials Are Handled

This application is fully stateless on the server — **no API keys or Typesense credentials are stored on the server**. All credential storage is client-side:

| Storage | Purpose | Lifetime | Scope |
|---|---|---|---|
| Browser Cookie (`typesense_connection`) | Active session — forwarded to API proxy routes via headers | 1 year | Same-site only |
| localStorage | "Remember me" — pre-fills login form on return visits | 30-day sliding window | Browser only |

### Security Measures

- **No server-side credential storage** — The server is completely stateless. Credentials are provided per-request via cookies or headers.
- **No environment variables needed** — No `TYPESENSE_*` or `NEXT_PUBLIC_*` env vars. Nothing to leak from your deployment config.
- **API keys are masked in the UI** — Only the first 4 and last 4 characters are shown (e.g., `abcd••••••wxyz`).
- **Cookies use `SameSite=Strict`** — Prevents CSRF attacks. The `Secure` flag is added automatically on HTTPS connections.
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` are set on all responses.
- **No credentials in URLs** — API keys are transmitted via HTTP headers, never in query parameters or URL paths.
- **Error messages are sanitized** — Internal server details and API keys are never included in error responses.
- **Session idle timeout** — Users are automatically logged out after 1 hour of inactivity.
- **No third-party data sharing** — All API calls go either to the same-origin Next.js API proxy or directly to your Typesense server.

### Recommendations for Production

1. **Always use HTTPS** — Vercel provides this automatically. For self-hosted deployments, use a reverse proxy (nginx, Caddy) with SSL.
2. **Use scoped API keys** — Create a Typesense API key with only the permissions this UI needs, rather than using the admin master key.
3. **Restrict network access** — If possible, limit your Typesense server's firewall to accept connections only from your deployment's IP range.
4. **Enable Vercel Authentication** — For added security, enable [Vercel Authentication](https://vercel.com/docs/security/deployment-protection) to require Vercel login before accessing the admin UI.

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Dashboard (/)
│   ├── layout.tsx                # Root layout (sidebar, toast, shell)
│   ├── not-found.tsx             # 404 page
│   ├── login/page.tsx            # Login/connection page
│   ├── collections/
│   │   ├── page.tsx              # Collections list
│   │   └── [name]/
│   │       ├── page.tsx          # Collection detail (documents + schema tabs)
│   │       ├── synonyms/page.tsx # Synonyms management
│   │       └── overrides/page.tsx# Overrides management
│   ├── synonyms/page.tsx         # Global synonyms page
│   ├── keys/page.tsx             # API keys management
│   ├── settings/page.tsx         # Connection settings
│   └── api/                      # API route handlers
│       ├── health/route.ts
│       ├── collections/
│       │   ├── route.ts          # GET all / POST create
│       │   └── [name]/
│       │       ├── route.ts      # GET / DELETE / PATCH collection
│       │       ├── documents/route.ts
│       │       ├── synonyms/[id]/route.ts
│       │       ├── overrides/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       └── keys/
│           ├── route.ts          # GET all / POST create
│           └── [id]/route.ts     # GET / DELETE / PATCH key
├── components/
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Button.tsx            # Variants: primary, secondary, danger, ghost, outline
│   │   ├── Input.tsx             # Text input with icons, error state
│   │   ├── Select.tsx            # Dropdown select
│   │   ├── Modal.tsx             # Dialog with mobile bottom-sheet
│   │   ├── Badge.tsx             # Status/type labels
│   │   ├── Table.tsx             # Table components (Head, Body, Row, Cell, Empty)
│   │   └── Toast.tsx             # Notification provider + useToast hook
│   ├── layout/
│   │   ├── Sidebar.tsx           # Navigation sidebar / mobile drawer
│   │   ├── Header.tsx            # Top bar with breadcrumbs and server info
│   │   ├── AppShell.tsx          # Layout wrapper
│   │   └── IdleTimer.tsx         # Session timeout handler
│   ├── collections/
│   │   ├── CollectionList.tsx    # Collection cards grid
│   │   ├── CollectionCard.tsx    # Individual collection card
│   │   ├── CreateCollectionModal.tsx
│   │   ├── DocumentsTable.tsx    # Document search, facets, list/grid views
│   │   └── SchemaEditor.tsx      # Field management with add/edit/drop
│   ├── synonyms/
│   │   ├── SynonymsList.tsx      # Synonym sets table with expand/collapse
│   │   ├── CreateSynonymModal.tsx
│   │   └── BulkUploadSynonymsModal.tsx
│   ├── overrides/
│   │   ├── OverridesList.tsx     # Override rules table
│   │   └── CreateOverrideModal.tsx
│   ├── keys/
│   │   ├── KeysList.tsx          # API keys table
│   │   └── CreateKeyModal.tsx
│   └── settings/
│       └── SettingsForm.tsx      # Connection configuration form
├── hooks/
│   └── useConnectionConfig.ts    # Connection state hook (getConfig, getBaseUrl, getHeaders, etc.)
├── lib/
│   ├── typesense.ts              # Typesense client factory and request config extraction
│   ├── savedConfig.ts            # localStorage persistence (30-day remember me)
│   └── utils.ts                  # formatNumber, formatDate, cn() class utility
└── types/
    └── typesense.ts              # TypeScript interfaces for all Typesense entities
```

---

## API Routes

All API routes are Next.js route handlers that proxy requests to the Typesense server. The Typesense connection details are extracted from the request headers (injected by `useConnectionConfig`) or the session cookie. Some components also make direct calls to the Typesense server from the browser.

| Route | Methods | Description |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/collections` | GET, POST | List all / create collection |
| `/api/collections/[name]` | GET, DELETE, PATCH | Get / delete / update collection |
| `/api/collections/[name]/documents` | GET, POST, PATCH | Search / create / bulk update documents |
| `/api/collections/[name]/synonyms/[id]` | GET, DELETE, PATCH | Synonym CRUD |
| `/api/collections/[name]/overrides` | GET, POST | List / create overrides |
| `/api/collections/[name]/overrides/[id]` | GET, PUT, DELETE | Override CRUD |
| `/api/keys` | GET, POST | List all / create API key |
| `/api/keys/[id]` | GET, DELETE, PATCH | Key CRUD |

---

## Responsive Design

The UI is fully responsive with a mobile-first approach:

- **Sidebar** — Full sidebar on desktop (`lg:` breakpoint), hamburger-toggled drawer on mobile
- **Modals** — Centered dialogs on desktop, slide-up bottom sheets on mobile
- **Document Views** — Single column on mobile, multi-column grids on larger screens
- **Facet Panel** — Sticky sidebar on desktop, collapsible toggle on mobile
- **Forms** — Stacked inputs on mobile, side-by-side on desktop
- **Tables** — Horizontal scroll on small screens
- **Navigation** — Abbreviated labels on mobile (e.g., "Syn" vs "Synonyms")

---

## License

MIT
