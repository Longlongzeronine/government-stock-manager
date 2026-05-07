# Government Inventory Management System — Build Plan

## Stack confirmed
- TanStack Start (file-based routing) + React 19 + Vite 7
- Tailwind v4 (existing `src/styles.css` with oklch tokens)
- External Supabase (URL + publishable key you provided) — no Lovable Cloud DB
- Supabase Auth (email/password) + roles via `user_roles` table
- Recharts, lucide-react, TanStack Table, TanStack Query (already in template)
- AI assistant via Lovable AI Gateway (server function, model `google/gemini-3-flash-preview`)

## Heads-up on AI key
Lovable AI Gateway needs `LOVABLE_API_KEY`. Since you're using external Supabase (not Lovable Cloud), I'll add it as a project secret so the server function can call the gateway. I'll prompt for it after the rest is wired.

## SQL schema you'll run in your Supabase
I'll generate one SQL script with:
- `app_role` enum (`admin`, `staff`, `viewer`)
- `profiles` (id → auth.users, full_name)
- `user_roles` (user_id, role) + `has_role()` security-definer fn
- `categories`, `suppliers`
- `items` (name, description, category_id, quantity, unit, reorder_level, supplier_id, status, timestamps)
- `transactions` (item_id, qty, type IN/OUT, staff user_id, remarks, created_at) + trigger to auto-adjust `items.quantity`
- `audit_logs` (actor, action, table_name, row_id, payload, created_at) + triggers on items/transactions
- RLS: viewers read-only, staff can insert transactions + read inventory, admin full
- Indexes on FKs, `items.status`, `transactions.created_at`
- Trigger to auto-create profile + default `viewer` role on signup

You'll paste this into Supabase SQL editor. I'll surface it as a downloadable artifact and inline in chat.

## App structure
```
src/
  integrations/supabase/
    client.ts                    # browser client (publishable key from VITE_*)
    types.ts                     # hand-written DB types
  contexts/AuthContext.tsx       # session + role + helpers
  components/
    layout/Sidebar.tsx           # fixed nav (Dashboard, Inventory, Stock, Categories, Suppliers, Users, Audit, AI)
    layout/Topbar.tsx
    layout/AppShell.tsx
    inventory/ItemTable.tsx, ItemFormDialog.tsx, StatusBadge.tsx
    stock/StockMovementDialog.tsx, TransactionsTable.tsx
    dashboard/StatCard.tsx, UsageChart.tsx, LowStockList.tsx, RecentTransactions.tsx
    ai/AIAssistantPanel.tsx
    common/ConfirmDialog.tsx, EmptyState.tsx, RoleGate.tsx
  routes/
    __root.tsx                   # providers + shell
    index.tsx                    # redirect to /dashboard or /login
    login.tsx, signup.tsx
    _app.tsx                     # auth-gated layout (sidebar + outlet)
    _app/dashboard.tsx
    _app/inventory.tsx
    _app/stock.tsx
    _app/categories.tsx
    _app/suppliers.tsx
    _app/users.tsx               # admin only
    _app/audit.tsx               # admin only
    _app/assistant.tsx
    api/ai-assistant.ts          # server route → Lovable AI Gateway (SSE)
  server/
    ai.functions.ts              # createServerFn wrapper for AI calls
  lib/
    export.ts                    # CSV/XLSX + PDF (jspdf, xlsx)
    format.ts, status.ts
```

## Features in v1 (everything-at-once)
- Auth: email/password login + signup; auto-profile + default viewer role
- Role-based UI (Admin / Staff / Viewer) using `RoleGate` + route guards
- Dashboard: total items, low stock, out of stock, recent txns, monthly usage line chart, quick actions
- Inventory CRUD with TanStack Table (search, category filter, pagination, sorting), status auto-derived (Normal/Low/Critical/Out)
- Stock In/Out dialog, transactions list, item quantities auto-update via DB trigger
- Categories + Suppliers CRUD
- Users page (admin): list users, change role
- Audit log viewer (admin)
- Realtime subscription on `items` + `transactions` for live dashboard
- AI Assistant: chat panel, server function pulls live inventory snapshot, streams response via Lovable AI
- Export: CSV + XLSX (xlsx) + PDF (jspdf + autotable) for inventory and transactions
- Toasts (sonner), confirm dialogs, loading skeletons
- SEO head() per route

## Design
- Navy primary (`oklch(0.28 0.09 260)`) + dark blue accent, white/gray surfaces
- Status: green/yellow/red tokens
- Inter for body, a clean serif (Source Serif) for headings to give "government office" feel
- Spreadsheet-like dense tables, minimal animation
- Responsive: sidebar collapses on mobile

## Out-of-scope for v1 (can add later)
- Email notifications, dark mode toggle, multi-warehouse, barcode scanning

## Build order
1. Schema SQL artifact + Supabase client + types
2. Auth context + login/signup + route guard
3. App shell + sidebar
4. Categories + Suppliers (simplest CRUD)
5. Inventory CRUD + table
6. Stock In/Out + transactions
7. Dashboard + charts + realtime
8. Users + audit pages
9. Exports
10. AI assistant (server fn + UI) — request `LOVABLE_API_KEY` here

## Technical notes
- Supabase browser client uses your `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. I'll write these into the Lovable env (.env equivalent is handled by the platform).
- Auto-quantity update happens in a Postgres trigger so it's atomic and audit-safe.
- AI server function: pulls top-N low-stock items + 30-day txn aggregates and includes them as system context so the model can answer real questions.
- All tables get RLS; nothing is exposed without auth.
