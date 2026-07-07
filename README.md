# StoreFlow

StoreFlow is a polished multi-tenant marketplace starter that combines a merchant dashboard, public storefronts, and a checkout flow into one cohesive product experience.

It is designed as a portfolio-ready full-stack application with strong UI details, secure auth, and realistic commerce features such as inventory tracking, low-stock alerts, and recent order activity.

## What is included

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Features:
  - Merchant authentication and protected dashboard
  - Public storefront catalog per store
  - Product management with image support
  - Checkout experience with mock fallback and order creation
  - Recent order monitoring and live merchant activity

## Project structure

- `backend/` contains the Express API, Prisma schema, auth routes, checkout logic, and admin metrics endpoints.
- `frontend/` contains the React app for the marketplace, storefront catalog, merchant dashboard, and cart experience.

## Key capabilities

- Multi-tenant store model with isolated products and orders
- Secure JWT-based merchant access
- Inventory warnings for low-stock products
- Responsive merchant dashboard with live sales insights
- Public shopping experience for customers to browse and buy

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A Stripe test key if you want to enable real checkout processing

## Local setup

### 1 Backend

```bash
cd StoreFlow/backend
npm install
cp .env.example .env
```

Update the `.env` file with:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `STRIPE_SECRET_KEY` (optional for real checkout)
- `STRIPE_WEBHOOK_SECRET` (optional)

Then generate Prisma artifacts and start the API:

```bash
npm run prisma:generate
npm run dev
```

### 2) Frontend

```bash
cd StoreFlow/frontend
npm install
npm run dev
```

The frontend will run on Vite's local development server, while the backend API runs on port `4000` by default.

## Useful commands

```bash
# Backend
cd StoreFlow/backend
npm run build
npm run prisma:generate

# Frontend
cd StoreFlow/frontend
npm run build
```

## Notes

If Stripe credentials are not configured, the checkout flow automatically falls back to a local mock checkout experience so the app remains usable during development.
