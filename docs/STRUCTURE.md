# Project Structure

Overview of the codebase organization, components, API routes, hooks, and utilities.

---

## Directory Tree

```
src/
├── app/                              # Next.js App Router pages
│   ├── page.tsx                      # Dashboard (/)
│   ├── layout.tsx                    # Root layout (sidebar, toast, shell)
│   ├── globals.css                   # Global styles
│   ├── not-found.tsx                 # 404 page
│   ├── login/page.tsx                # Login / connection page
│   ├── collections/
│   │   ├── page.tsx                  # Collections list
│   │   └── [name]/
│   │       ├── page.tsx              # Collection detail (documents + schema tabs)
│   │       ├── synonyms/page.tsx     # Synonyms management
│   │       └── rules/
│   │           ├── page.tsx          # Curation rules list
│   │           ├── new/page.tsx      # Create new rule
│   │           └── [id]/edit/page.tsx# Edit existing rule
│   ├── synonyms/page.tsx             # Global synonyms page
│   ├── keys/page.tsx                 # API keys management
│   ├── settings/page.tsx             # Connection settings
│   └── api/                          # API route handlers (proxy to Typesense)
│       ├── health/route.ts
│       ├── collections/
│       │   ├── route.ts              # GET all / POST create
│       │   └── [name]/
│       │       ├── route.ts          # GET / DELETE / PATCH collection
│       │       ├── documents/route.ts
│       │       ├── synonyms/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       └── overrides/
│       │           ├── route.ts
│       │           └── [id]/route.ts
│       └── keys/
│           ├── route.ts              # GET all / POST create
│           └── [id]/route.ts         # GET / DELETE / PATCH key
├── components/
│   ├── ui/                           # Reusable UI primitives
│   │   ├── Button.tsx                # Variants: primary, secondary, danger, ghost, outline
│   │   ├── Input.tsx                 # Text input with icons, error state, helper text
│   │   ├── Select.tsx                # Dropdown select
│   │   ├── Modal.tsx                 # Dialog with mobile bottom-sheet
│   │   ├── Badge.tsx                 # Status/type labels
│   │   ├── Table.tsx                 # Table components (Head, Body, Row, Cell, Empty)
│   │   └── Toast.tsx                 # Notification provider + useToast hook
│   ├── layout/
│   │   ├── AppShell.tsx              # Layout wrapper
│   │   ├── Sidebar.tsx               # Navigation sidebar / mobile drawer
│   │   ├── Header.tsx                # Top bar with breadcrumbs and server info
│   │   └── IdleTimer.tsx             # Session timeout handler (1 hour)
│   ├── dashboard/
│   │   ├── StatsGrid.tsx             # Statistics cards (collections, docs, keys)
│   │   ├── RecentCollections.tsx     # Recent collection preview cards
│   │   └── QuickActions.tsx          # Quick action links
│   ├── collections/
│   │   ├── CollectionList.tsx        # Collection cards grid
│   │   ├── CollectionCard.tsx        # Individual collection card
│   │   ├── CreateCollectionModal.tsx  # New collection modal
│   │   ├── DocumentsTable.tsx        # Document search, facets, list/grid views
│   │   ├── DocumentListItem.tsx      # List view item with key-value layout
│   │   ├── DocumentGridCard.tsx      # Grid card with image thumbnails
│   │   ├── FacetPanel.tsx            # Facet filtering sidebar + active filter chips
│   │   ├── RangeSlider.tsx           # Dual-handle numeric range slider
│   │   ├── SchemaEditor.tsx          # Field management (add/edit/drop)
│   │   ├── FieldOptionsGrid.tsx      # Field property toggle grid
│   │   ├── formatValue.tsx           # Value formatting utilities
│   │   ├── document-utils.ts         # Filter/sort helpers, constants
│   │   └── schema-types.ts           # Schema-related type definitions
│   ├── synonyms/
│   │   ├── SynonymsList.tsx          # Synonym sets table with expand/collapse
│   │   ├── CreateSynonymModal.tsx    # New synonym set modal
│   │   ├── BulkUploadSynonymsModal.tsx # Bulk CSV/JSON import
│   │   └── synonym-parsers.ts        # Parsing utilities for bulk uploads
│   ├── overrides/
│   │   ├── OverridesList.tsx         # Override rules table
│   │   ├── CurationRuleEditor.tsx    # 3-panel rule editor (main orchestrator)
│   │   ├── SectionFormPanel.tsx      # Form sections for each rule property
│   │   ├── PreviewPanel.tsx          # Live preview with search, grid/list, pagination
│   │   ├── FilterBuilder.tsx         # Visual filter_by row builder
│   │   ├── SortBuilder.tsx           # Visual sort_by row builder
│   │   ├── Toggle.tsx                # Toggle switch component
│   │   ├── curation-rule-types.ts    # TypeScript types for rules
│   │   ├── curation-rule-constants.ts # Operator helpers
│   │   └── filter-sort-utils.ts      # Parse/serialize filter and sort strings
│   ├── keys/
│   │   ├── KeysList.tsx              # API keys table with reveal/copy/delete
│   │   └── CreateKeyModal.tsx        # New API key modal
│   └── settings/
│       └── SettingsForm.tsx          # Connection form with test/save/export/reset
├── hooks/
│   └── useConnectionConfig.ts        # Connection state hook
│                                      #   getConfig() — retrieves connection from cookie
│                                      #   getBaseUrl() — constructs Typesense URL
│                                      #   getHeaders() — injects x-typesense-* headers
│                                      #   saveConfig() / clearConfig()
├── lib/
│   ├── typesense.ts                  # typesenseFetch() helper + getConfigFromRequest()
│   ├── savedConfig.ts                # localStorage persistence (30-day remember me)
│   └── utils.ts                      # formatNumber, formatDate, cn() class utility
├── types/
│   └── typesense.ts                  # TypeScript interfaces for all Typesense entities
└── proxy.ts                          # Middleware — redirects to /login if no cookie
```

---

## API Routes

All API routes are Next.js route handlers that proxy requests to the Typesense server. Connection details are extracted from request headers (injected by `useConnectionConfig`) or the session cookie.

| Route | Methods | Description |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/collections` | GET, POST | List all / create collection |
| `/api/collections/[name]` | GET, DELETE, PATCH | Get / delete / update collection |
| `/api/collections/[name]/documents` | GET, POST, PATCH | Search / create / bulk update documents |
| `/api/collections/[name]/synonyms` | GET, POST | List / create synonym sets |
| `/api/collections/[name]/synonyms/[id]` | GET, DELETE, PATCH | Synonym CRUD |
| `/api/collections/[name]/overrides` | GET, POST | List / create overrides |
| `/api/collections/[name]/overrides/[id]` | GET, PUT, DELETE | Override CRUD |
| `/api/keys` | GET, POST | List all / create API key |
| `/api/keys/[id]` | GET, DELETE, PATCH | Key CRUD |

---

## Key Architectural Patterns

### Stateless Server
The server stores no credentials. Every API route extracts connection details from the incoming request's headers or cookies using `getConfigFromRequest()` in `src/lib/typesense.ts`.

### Connection Injection
The `useConnectionConfig` hook provides `getHeaders()` which returns `x-typesense-*` headers. These are attached to every `fetch()` call to the API proxy routes.

### Direct Client Calls
Some components (DocumentsTable, CurationRuleEditor) make direct calls to the Typesense server from the browser using `getBaseUrl()` + `getConfig().apiKey` for better performance and to avoid proxy overhead on search-heavy operations.

### Responsive Design
- **Sidebar** — Full sidebar on desktop (`lg:` breakpoint), hamburger-toggled drawer on mobile
- **Modals** — Centered dialogs on desktop, slide-up bottom sheets on mobile
- **Document Views** — Single column on mobile, multi-column grids on larger screens
- **Facet Panel** — Sticky sidebar on desktop, collapsible toggle on mobile
- **Forms** — Stacked on mobile, side-by-side on desktop
- **Tables** — Horizontal scroll on small screens
