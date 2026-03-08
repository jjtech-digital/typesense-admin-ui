# Typesense Admin UI

A modern, full-featured admin dashboard for [Typesense](https://typesense.org/) — built with Next.js 14, TypeScript, and Tailwind CSS. Manage collections, documents, synonyms, overrides, and API keys through an intuitive web interface.

## Screenshots

> Add screenshots of the dashboard, collection detail, and document search views here.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
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
- **Connection Settings** — Configure Typesense connection via UI or environment variables
- **Session Management** — Auto-logout on idle, remembered credentials, secure client-side storage
- **Responsive Design** — Mobile-first layout with collapsible sidebar, bottom-sheet modals, adaptive grids

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 14](https://nextjs.org/) | React framework (App Router) |
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

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Typesense server details:

```env
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=your-api-key-here
TYPESENSE_CONNECTION_TIMEOUT_SECONDS=5
```

| Variable | Description | Default |
|---|---|---|
| `TYPESENSE_HOST` | Typesense server hostname or IP | `localhost` |
| `TYPESENSE_PORT` | Typesense server port | `8108` |
| `TYPESENSE_PROTOCOL` | `http` or `https` | `http` |
| `TYPESENSE_API_KEY` | Admin API key for your Typesense server | — |
| `TYPESENSE_CONNECTION_TIMEOUT_SECONDS` | Connection timeout in seconds | `5` |

> **Note:** You can also configure the connection at runtime via the `/settings` page or the `/login` page. Browser-configured credentials are stored in a cookie and take precedence over environment variables.

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

---

## Connecting to Typesense

There are two ways to connect the admin UI to your Typesense server:

### Option 1: Environment Variables (Server-Side)

Set the `TYPESENSE_*` variables in `.env.local` as described above. The app will use these on startup.

### Option 2: Login Page (Browser-Side)

1. Navigate to `/login`
2. Enter your Typesense server's **Protocol**, **Host**, **Port**, and **API Key**
3. Click **Test Connection** to verify
4. Click **Connect** to save credentials

Credentials are stored in a browser cookie (1-year expiry) and localStorage (30-day "remember me"). They are never sent to any third party — all connections go directly from your browser to the Typesense server or through the Next.js API proxy.

### Session Management

- The app auto-logs you out after **1 hour of inactivity** (idle timer)
- You can manually log out from the sidebar or header dropdown
- Saved credentials can be cleared from the login page ("Forget credentials")

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
- **Reset** — Clear all stored credentials

The settings page also displays the current server-side environment variable configuration (read-only) for reference.

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
│   └── utils.ts                  # formatNumber, formatDate, cn() class utility
└── types/
    └── typesense.ts              # TypeScript interfaces for all Typesense entities
```

---

## API Routes

All API routes are Next.js route handlers that proxy requests to the Typesense server. Some components also make direct calls to the Typesense server from the browser using the stored API key.

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
