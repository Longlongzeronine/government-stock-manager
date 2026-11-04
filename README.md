# Government Stock Manager

A full-stack inventory management system built for government agencies to track, manage, and report on stock items, suppliers, and transactions. Deployed on Cloudflare Workers with Supabase as the backend database.

**Live Demo:** https://tanstack-start-app.stockmanagerph.workers.dev/dashboard

---

## Features

### Inventory Management
- **Items** — Full CRUD for stock items with categories, suppliers, quantities, units, and reorder levels
- **Categories** — Organize items into logical groups
- **Suppliers** — Manage vendor information including contact details and addresses
- **Stock Transactions** — Record stock IN (receiving) and OUT (issuing) with staff attribution and remarks
- **Reorder Alerts** — Visual indicators when stock falls below configured reorder levels

### Dashboard & Analytics
- Real-time inventory summary cards (total items, low stock, out of stock)
- Interactive charts (bar, line, pie) for stock distribution, transaction trends, and category breakdowns
- Recent transaction feed
- Export reports to **CSV**, **XLSX**, and **PDF**

### User Management & Role-Based Access
Three roles with escalating permissions:

| Role    | Permissions |
|---------|-------------|
| Viewer  | Read-only access to inventory, reports, and dashboard |
| Staff   | Can create/edit items, record transactions, manage categories and suppliers |
| Admin   | Full access including user management, role assignment, account approval/decline |

- **Approval Flow** — New signups are created with `pending` status and must be approved by an admin before they can access the system
- **Admin Panel** — Approve, decline, or disable user accounts; assign or change roles; reset passwords

### AI Assistant
- Built-in AI chat widget that answers inventory-related questions
- Provides real-time stock summaries, reorder priorities, and transaction insights
- Works with both online (OpenAI-compatible API) and offline modes

### Audit Trail
- All significant actions are logged with actor identity, timestamp, and payload
- Searchable audit log for compliance and accountability

### Export & Reporting
- Export any data table (items, transactions, users, etc.) to CSV, Excel, or PDF
- Dashboard charts can be exported as images

---

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| **Frontend** | React 19, TanStack Router, TanStack Start, Tailwind CSS v4, shadcn/ui |
| **Backend**  | TanStack Start Server Functions (Cloudflare Workers) |
| **Database** | Supabase (PostgreSQL) |
| **Auth**     | Supabase Auth with Row-Level Security (RLS) |
| **Hosting**  | Cloudflare Workers + Cloudflare Pages (static assets) |
| **Charts**   | Recharts |
| **Export**   | jsPDF, xlsx (SheetJS) |
| **AI**       | OpenAI-compatible API (configurable) |
| **Build**    | Vite 7, TypeScript |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- A Supabase project
- A Cloudflare account (for deployment)

### Install & Run Locally

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

This is a **Workers** app, not a static Pages site. The build emits a Worker
(`dist/server/index.js`) plus the browser assets (`dist/client`). Deploy both
through the generated Wrangler config. In Cloudflare, use a Workers project
with `npm run deploy` as its deploy command; do not point Pages at `dist/client`
or upload that folder as a static site. That drops SSR and TanStack Start server
functions, which makes routes and app actions disappear.

Set runtime secrets on the Worker once (and again when rotating them):

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put DEVELOPER_USERNAME
npx wrangler secret put DEVELOPER_PASSWORD
npx wrangler secret put DEVELOPER_SESSION_SECRET
```

Paste each value when Wrangler prompts. These values must be Cloudflare Worker
secrets; `.env` is local-only and is not uploaded by `npm run deploy`. The
Supabase URL and publishable key are already configured as non-secret Worker
variables in `wrangler.jsonc`. Add `LOVABLE_API_KEY` as a Worker secret only if
using the hosted AI provider.

Apply database migrations to the linked Supabase project before deploying:

```bash
npx supabase db push
```

`npm run deploy` publishes the Worker but does not apply database migrations.
If Supabase CLI is not linked, run pending SQL files from `supabase/migrations`
in the project's SQL Editor first.

For local Cloudflare preview, put the same runtime secrets in the ignored
`dist/server/.dev.vars` file after building. Never put service-role or
developer credentials in `wrangler.jsonc` or any `VITE_*` variable.

---

## License

This project is developed for government use.
