# Fundsroom Infotech — Full Stack Developer Case Study

Mini ERP + CRM Operations Portal, submitted per the case study brief.

## Structure

```
backend/    Node.js + TypeScript + Express + PostgreSQL (Prisma) API
frontend/   React + TypeScript + Vite admin UI
```

Each folder has its own README with full setup, environment variable, and
deployment instructions — start there.

## Quick Start (local)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL (e.g. from Neon) and JWT_SECRET
npx prisma migrate dev --name init   # also seeds 4 test users + 2 products
npm run dev                 # runs on http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm run dev                 # runs on http://localhost:5173
```

Login with any of the 4 seeded test accounts — see `backend/README.md`
for credentials.

## Architecture Summary

- **Auth**: JWT-based, 4 roles (Admin, Sales, Warehouse, Accounts), enforced
  via Express middleware on every protected route.
- **Data layer**: PostgreSQL via Prisma. Schema models Users, Customers,
  FollowUps, Products, StockMovements, SalesChallans, and ChallanItems
  (with product snapshot fields as required by the brief).
- **Core business logic**: Sales Challan confirmation is the critical path —
  stock levels are validated and deducted inside a single Prisma
  transaction alongside a StockMovement audit log entry, so a challan can
  never be confirmed with insufficient stock, and stock/movement history
  never drift out of sync.
- **Frontend**: Role-agnostic admin shell (sidebar + main content) with
  dedicated pages per module, talking to the backend over a shared Axios
  client that attaches the JWT and redirects to login on 401.

## Deployment

Both projects are set up for free-tier deployment:
- Database: Neon or Supabase (Postgres)
- Backend: Render or Railway
- Frontend: Vercel or Netlify

Full steps are in each subfolder's README.

## Assumptions & Known Limitations

See `backend/README.md` and `frontend/README.md` for the complete,
itemized list (challan cancellation/restock behavior, role-permission
inference, no automated test suite given the 48-hour window, etc.).
