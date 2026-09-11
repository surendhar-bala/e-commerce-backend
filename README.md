# E-commerce Backend API

Express + TypeScript REST API for the Velora marketplace frontend.

## Local development

1. Create a PostgreSQL database locally.
2. Run the schema:

```bash
psql -U USER -d DB_NAME -f sql/schema.sql
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Install and start:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

## Deploy to Cloudflare Workers (free tier)

This backend can run on Cloudflare Workers using Express + **Hyperdrive** for PostgreSQL.
Use an external Postgres provider (Neon free tier is recommended — see comment in `sql/schema.sql`).

> **Note:** `pg` is the Node.js PostgreSQL driver your app uses. **pgAdmin** is a separate desktop/web tool for browsing the database — run it locally when you need a GUI; it does not deploy to Workers.

### 1. Create external PostgreSQL (Neon)

1. Sign up at [neon.tech](https://neon.tech) (free tier).
2. Create a project and copy the connection string.
3. Run the schema against Neon:

```bash
psql "YOUR_NEON_CONNECTION_STRING" -f sql/schema.sql
```

### 2. Create Hyperdrive (Cloudflare → Postgres bridge)

From `e-commerce-backend/`:

```bash
npx wrangler hyperdrive create ecommerce-db --connection-string="YOUR_NEON_CONNECTION_STRING"
```

Copy the Hyperdrive **id** into `wrangler.jsonc` → `hyperdrive[0].id`.

Hyperdrive free tier: **100,000 queries/day**, ~20 origin DB connections.

### 3. Configure Worker secrets and vars

Edit `wrangler.jsonc`:

- Set `CORS_ORIGIN` to your frontend Workers URL (e.g. `https://e-com-frontend.xxx.workers.dev`).
- Add optional R2 vars if you use product uploads.

Set secrets:

```bash
npx wrangler secret put JWT_SECRET
# optional:
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

### 4. Deploy

```bash
npm install
npm run deploy
```

Test: `curl https://e-com-backend.YOUR_SUBDOMAIN.workers.dev/health`

### 5. Connect the frontend

Rebuild and redeploy the frontend with the live API URL:

```bash
# in e-commerce-frontend/
VITE_API_URL=https://e-com-backend.YOUR_SUBDOMAIN.workers.dev npm run deploy
```

### Local Worker dev

Uses `localConnectionString` in `wrangler.jsonc` (defaults to local Postgres):

```bash
npm run dev:worker
```

API available at `http://localhost:8787`.

## Health check

```http
GET /health
```

## Main routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register buyer/seller |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current session |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Product details |
| GET | `/api/products/categories/list` | Categories |
| POST | `/api/products` | Create product (seller/admin) |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders (authenticated) |
| POST | `/api/payments/create-intent` | Start payment |
| POST | `/api/payments/verify` | Verify Razorpay payment |

## Demo seller

After tables are created, local dev seeds automatically on startup:

- Email: `seller@velora.studio`
- Password: `sellwell1`

On Workers, run `npm run dev` once locally or insert the seller manually after schema migration.
