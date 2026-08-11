# Fundsroom Case Study — Frontend (Mini ERP + CRM)

React + TypeScript + Vite admin-style UI for the ERP/CRM case study,
covering login, customer CRM, product/inventory, and sales challans.

## Tech Stack

- React 19, TypeScript, Vite
- React Router for navigation
- Axios for API calls
- Plain CSS (no component library) for a clean admin look

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env`:
   ```
   VITE_API_URL=http://localhost:4000
   ```
   Point this at your deployed backend URL for production builds.

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:5173` by default.

4. **Build for production**
   ```bash
   npm run build
   ```
   Output goes to `dist/`.

## Test Logins

Use the credentials seeded by the backend (`npm run seed` in the backend
project):

| Role      | Email                          | Password      |
|-----------|---------------------------------|---------------|
| Admin     | admin@fundsroom-test.com       | Password123!  |
| Sales     | sales@fundsroom-test.com       | Password123!  |
| Warehouse | warehouse@fundsroom-test.com   | Password123!  |
| Accounts  | accounts@fundsroom-test.com    | Password123!  |

## Pages

- **Login** — JWT auth, redirects to Customers on success
- **Customers** — searchable/filterable list, add/edit modal, detail page
  with follow-up notes and challan history
- **Products** — searchable list, low-stock filter, add product, manual
  stock adjustment (IN/OUT) with reason logging
- **Sales Challans** — multi-product challan creation (draft or confirm
  immediately), list with status filter, confirm/cancel actions from the
  list view

## Deployment (free tier)

Deploy to **Vercel** or **Netlify**:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` set to your deployed backend URL

## Known Limitations

- No client-side route-level role restrictions yet — the backend enforces
  role permissions on every request, but the UI currently shows all nav
  items to all roles (a Warehouse user attempting to edit a customer would
  get a 403 from the API, but the "Edit" button isn't hidden client-side).
- No toast/notification system — errors surface inline in forms; challan
  cancel uses a plain `alert` for API error feedback rather than a
  polished modal.
