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
npx wrangler deploy
```

---

## License

This project is developed for government use.
