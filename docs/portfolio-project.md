# Portfolio Project: Supplify Government Inventory System

## Project title

Supplify — Government Inventory and Procurement Workflow System

## One-line description

A full-stack inventory and government supply workflow platform that helps agencies track stock, manage requisitions, process accountability forms, enforce role-based approvals, and generate official procurement reports.

## Portfolio card copy

**Supplify** is a full-stack inventory management system designed for government offices. It centralizes item records, suppliers, stock movements, requisition and issue slips, approval workflows, audit history, barcode/QR scanning, AI-powered inventory questions, and APP-CSE reporting in one responsive web application.

## Case study summary

Government inventory operations often rely on disconnected spreadsheets, paper forms, and manual stock checks. Supplify brings those workflows together in a single system where authorized personnel can monitor stock levels, record receipts and issues, prepare requisitions, route requests for approval, and maintain a traceable history of actions.

The dashboard provides a live view of total inventory, low-stock items, out-of-stock items, recent transactions, and 30-day usage trends. Staff can scan a barcode or QR code to open an item record, review its movement history, and print inventory labels. The system also supports government-oriented documents and reporting, including IAR, RIS, ICS, PAR, stock card, RSMI, physical count, and APP-CSE exports.

## Key features

- Inventory CRUD with categories, suppliers, stock numbers, item types, units, reorder levels, acquisition costs, and monthly quantity planning.
- Stock In / Stock Out transactions with quantity validation, staff attribution, remarks, and source-form references.
- Low-stock and out-of-stock monitoring with dashboard alerts and usage analytics.
- Requisition and RIS workflows with pending, approved, rejected, issued, and cancelled states.
- Approval workspace for reviewing requests and recording review notes.
- Government form workflows for IAR, RIS, ICS, and PAR records.
- Stock-card, RSMI, and annual physical-count reporting flows.
- QR/barcode scanner for locating inventory records and generating printable QR labels.
- Public RIS verification through a tokenized verification page.
- Role-based access for viewer, staff, accounting, and admin users.
- Admin account approval, role assignment, disabling, deletion, and password-reset actions.
- Audit log for system activity, actors, timestamps, and payloads.
- AI inventory assistant that answers questions using a live inventory and transaction snapshot.
- CSV, XLSX, and PDF exports, including an APP-CSE 2026 workbook/PDF layout.
- Responsive navigation and mobile-friendly inventory cards for field and office use.

## Technology stack

- **Frontend:** React 19, TypeScript, TanStack Router, TanStack Start, Tailwind CSS v4, shadcn/ui
- **Data and backend:** TanStack Start server functions, PostgreSQL/Supabase, Supabase Auth
- **Security:** PostgreSQL Row-Level Security, role-aware navigation, server-side authorization checks
- **Deployment:** Cloudflare Workers and Cloudflare Pages assets
- **Charts and reporting:** Recharts, SheetJS, xlsx-js-style, jsPDF, jspdf-autotable
- **Scanning and utilities:** ZXing browser scanner, QRCode, date-fns, React Hook Form, Zod
- **AI:** OpenAI-compatible API with an offline/local inventory snapshot fallback

## Architecture and engineering highlights

The application uses file-based TanStack routes for the user experience and server functions for data mutations. Inventory changes are persisted through transactional database operations; stock-out requests lock the item row and reject issues that exceed available quantity. Database migrations define role policies, workflow tables, verification functions, indexes, and constraints. The frontend uses React Query polling to keep dashboard and inventory views current.

## Suggested impact statement

Supplify reduces the friction between inventory monitoring, procurement planning, accountability documentation, and approval by giving government personnel one auditable source of truth for supplies and materials.

## Short resume/project-listing version

Built Supplify, a full-stack government inventory and procurement workflow platform with React, TypeScript, TanStack Start, Supabase/PostgreSQL, and Cloudflare Workers. Implemented role-based access, approval workflows, stock transaction controls, QR/barcode scanning, audit logs, AI inventory assistance, and CSV/XLSX/PDF government report exports.

## Recommended portfolio presentation

Use these screenshots or demo sections:

1. Dashboard with KPI cards, low-stock alerts, recent transactions, and usage chart.
2. Inventory table with filters, item details, and export controls.
3. Requisition or approval screen showing a request moving through its status lifecycle.
4. QR/barcode scanner and printable inventory label.
5. Forms/reporting screen showing APP-CSE or stock-card output.

## Copy-ready prompt for an AI portfolio builder

```text
Create a polished portfolio case-study section for a project called “Supplify — Government Inventory and Procurement Workflow System.”

Project context:
Supplify is a full-stack web application built for government office inventory operations. It replaces disconnected spreadsheets and paper-based tracking with a centralized system for supplies, materials, stock movements, requisitions, approvals, accountability forms, and reporting.

Highlight these capabilities:
- Live inventory dashboard with total items, low-stock alerts, out-of-stock alerts, recent transactions, and 30-day usage analytics.
- Inventory management with categories, suppliers, stock numbers, item types, reorder levels, acquisition costs, and monthly planning quantities.
- Stock In / Stock Out transactions with validation so users cannot issue more stock than is available.
- Requisition and RIS workflows with pending, approved, rejected, issued, and cancelled states.
- IAR, RIS, ICS, PAR, stock-card, RSMI, and annual physical-count workflows.
- Role-based permissions for viewer, staff, accounting, and admin users.
- Admin approval of new accounts, role assignment, account disabling, and user management.
- QR/barcode scanning, searchable inventory records, and printable QR labels.
- Public RIS verification using a secure tokenized verification page.
- Audit logs for accountability and traceability.
- AI inventory assistant for stock summaries, transaction insights, and reorder priorities.
- CSV, XLSX, PDF, and APP-CSE 2026 report exports.

Technology:
React 19, TypeScript, TanStack Router, TanStack Start, Tailwind CSS v4, shadcn/ui, Supabase Auth, PostgreSQL, Row-Level Security, Cloudflare Workers, Recharts, SheetJS, jsPDF, ZXing, and an OpenAI-compatible API.

Write the case study in a confident but clear professional tone. Include:
1. A strong project headline.
2. A two-sentence overview.
3. The operational problem being solved.
4. The solution and the most important user workflows.
5. Five to eight concise feature highlights.
6. A technology stack section.
7. Three engineering challenges with how they were addressed.
8. A short outcome statement focused on visibility, accountability, and workflow efficiency.
9. A call-to-action for viewing the live demo or project walkthrough.

Avoid invented user counts, revenue figures, performance metrics, or claims that are not supported by the project description. Make the copy suitable for a developer portfolio and emphasize practical product thinking, secure access control, reliable inventory transactions, and government reporting requirements.
```

## Notes before publishing

- Replace or confirm the live-demo URL and add screenshots from the deployed application.
- If the portfolio is public, avoid displaying real emails, account records, supplier details, or sensitive inventory data.
- Present APP-CSE as a supported export/reporting capability and clarify that the system is designed around government workflows.
