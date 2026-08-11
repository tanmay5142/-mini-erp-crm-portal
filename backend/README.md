# Fundsroom Case Study — Backend (Mini ERP + CRM)

Node.js + TypeScript + Express + PostgreSQL (Prisma ORM) backend for the
ERP/CRM case study: auth & roles, customer CRM, product/inventory, and
sales challans with stock deduction logic.

## Tech Stack

- Node.js, TypeScript, Express
- PostgreSQL via Prisma ORM
- JWT auth, bcrypt password hashing
- Zod for request validation

## Project Structure

```
src/
  controllers/   business logic per module
  routes/        route definitions + role guards
  middleware/    auth (JWT + role check), central error handler
  utils/         prisma client, jwt helpers, zod validators
prisma/
  schema.prisma  DB schema
  seed.ts        creates one test user per role + 2 sample products
```

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env` and fill in:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   JWT_SECRET="a-long-random-string"
   PORT=4000
   ```
   `DATABASE_URL` can point to a free Postgres instance on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com) — no local
   Postgres install needed.

3. **Run migrations & generate the Prisma client**
   ```bash
   npx prisma migrate dev --name init
   ```
   This also runs `prisma/seed.ts` automatically (configured in
   `package.json`), creating one login per role:

   | Role      | Email                          | Password      |
   |-----------|---------------------------------|---------------|
   | Admin     | admin@fundsroom-test.com       | Password123!  |
   | Sales     | sales@fundsroom-test.com       | Password123!  |
   | Warehouse | warehouse@fundsroom-test.com   | Password123!  |
   | Accounts  | accounts@fundsroom-test.com    | Password123!  |

   Two sample products (SKU-001, SKU-002) are also seeded so the challan
   flow can be tested immediately.

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:4000`. Health check: `GET /health`.

## Build & Run for Production

```bash
npm run build
npm start
```

## Deployment (free tier)

- **Database**: Neon or Supabase Postgres — copy the connection string into
  `DATABASE_URL`.
- **Backend**: Render or Railway.
  - Build command: `npm install && npm run build && npx prisma migrate deploy`
  - Start command: `npm start`
  - Add `DATABASE_URL`, `JWT_SECRET`, `PORT` as environment variables in the
    platform's dashboard — never commit `.env`.
- **Frontend**: Vercel or Netlify, pointing its API base URL at the deployed
  backend.

AWS was not used for this submission (per the case study, it's optional/
bonus) — Render + Neon were chosen to keep setup free and fast within the
48-hour window.

## API Overview

All routes except `/auth/login` and `/auth/register` require:
`Authorization: Bearer <token>`

| Method | Route                              | Roles                          |
|--------|--------------------------------------|---------------------------------|
| POST   | /auth/register                     | public (used to create test users) |
| POST   | /auth/login                        | public                          |
| POST   | /customers                         | Admin, Sales                    |
| GET    | /customers                         | all roles                       |
| GET    | /customers/:id                     | all roles                       |
| PUT    | /customers/:id                     | Admin, Sales                    |
| POST   | /customers/:id/follow-ups          | Admin, Sales                    |
| POST   | /products                          | Admin, Warehouse                |
| GET    | /products                          | all roles                       |
| GET    | /products/:id                      | all roles                       |
| PUT    | /products/:id                      | Admin, Warehouse                |
| POST   | /products/:id/stock-movements      | Admin, Warehouse                |
| POST   | /challans                          | Admin, Sales                    |
| GET    | /challans                          | all roles                       |
| GET    | /challans/:id                      | all roles                       |
| PATCH  | /challans/:id/status                | Admin, Sales                    |

`GET /customers` and `GET /products` support `?search=`, `?page=`,
`?pageSize=`, plus module-specific filters (`status`, `customerType` for
customers; `category`, `lowStock=true` for products).

## Key Business Logic

- **Challan stock deduction**: stock is only reduced when a challan's status
  is (or transitions to) `CONFIRMED`. Every deduction is wrapped in a
  Prisma transaction alongside a `StockMovement` log entry, so stock level
  and movement history never go out of sync.
- **Negative stock guard**: before confirming a challan, current stock is
  checked against requested quantity for every line item; if any item is
  short, the whole request is rejected with a 400 and no partial writes
  occur.
- **Product snapshot on challan items**: `ChallanItem` stores
  `productNameSnap`, `skuSnap`, and `unitPriceSnap` at creation time (in
  addition to `productId`), so historical challans stay accurate even if a
  product is later renamed or repriced.
- **Challan numbering**: auto-generated as `CH-<year>-<sequence>`.

## Assumptions

- `CONFIRMED -> CANCELLED` restocks the items (not explicitly specified in
  the brief, but necessary for the data to stay consistent).
- `DRAFT -> CANCELLED` does not touch stock, since none was ever deducted.
- Role permissions (e.g. Warehouse manages products, Sales manages
  customers/challans, Accounts is read-only across modules) were inferred
  from the described job functions since the brief didn't specify an exact
  permission matrix.
- `/auth/register` is left open (not admin-gated) purely so all 4 test
  logins can be created without a chicken-and-egg admin bootstrap problem.
  In a real product this would be Admin-only.

## Known Limitations

- Challan number generation uses a `count()`-based sequence, which is not
  perfectly race-safe under concurrent writes. A Postgres sequence or
  advisory lock would be used in a production system.
- No refresh-token flow — JWT simply expires after 8 hours.
- No automated test suite included given the 48-hour window; manual testing
  was done via Postman (collection included).
- Frontend is a functional admin-style UI covering all 4 modules, not a
  fully polished design system.
