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

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components (MobileCard, RoleGate, StatusBadge)
│   ├── layout/          # App shell, sidebar, AI chat widget
│   └── ui/              # shadcn/ui primitives (button, dialog, table, etc.)
├── contexts/
│   └── AuthContext.tsx   # Authentication state & role management
├── hooks/
│   └── use-mobile.tsx    # Responsive detection hook
├── integrations/
│   └── supabase/
│       └── client.ts     # Supabase client & type definitions
├── lib/
│   ├── admin.functions.ts  # Server functions for user management
│   ├── ai.functions.ts     # Server functions for AI assistant
│   ├── error-capture.ts    # Error boundary & logging
│   ├── error-page.ts       # Error page component
│   ├── export.ts           # CSV/XLSX/PDF export utilities
│   └── utils.ts            # General utilities
├── routes/
│   ├── __root.tsx          # Root layout
│   ├── _app.tsx            # Authenticated app layout
│   ├── index.tsx           # Landing/redirect page
│   ├── login.tsx           # Login page
│   ├── signup.tsx          # Signup page
│   └── _app/
│       ├── dashboard.tsx   # Dashboard with charts & summaries
│       ├── inventory.tsx   # Full inventory management
│       ├── stock.tsx       # Stock transactions (IN/OUT)
│       ├── categories.tsx  # Category management
│       ├── suppliers.tsx   # Supplier management
│       ├── users.tsx       # User management (admin only)
│       ├── audit.tsx       # Audit log viewer
│       └── assistant.tsx   # AI assistant page
├── server/
│   └── ai.server.ts        # AI server-side logic
├── router.tsx              # Router configuration
├── routeTree.gen.ts        # Auto-generated route tree
├── server.ts               # Cloudflare Workers entry point
├── start.ts                # Application bootstrap
└── styles.css              # Global styles
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- A Supabase project
- A Cloudflare account (for deployment)

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key      # Optional, for AI assistant
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional, for custom AI endpoint
```

### Install & Run Locally

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

---

## Database Schema

The application uses Supabase with the following core tables:

- **profiles** — User profiles with `status` (pending/active/declined)
- **user_roles** — Role assignments (admin/staff/viewer)
- **items** — Inventory items with category, supplier, quantity, reorder level
- **categories** — Item categories
- **suppliers** — Vendor/supplier information
- **transactions** — Stock IN/OUT records
- **audit_logs** — Action audit trail

Row-Level Security (RLS) policies enforce access control at the database level.

---

## Deployment

The app is deployed to Cloudflare Workers using Wrangler:

```bash
# Deploy to production
npx wrangler deploy

# Deploy with specific environment
npx wrangler deploy --env production
```

The live site is available at:
- **https://tanstack-start-app.stockmanagerph.workers.dev/dashboard**

---

## License

This project is developed for government use.