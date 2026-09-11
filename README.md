# E-commerce Backend API

Express + TypeScript REST API for the Velora marketplace frontend.

## Setup

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

After tables are created, the server seeds:

- Email: `seller@velora.studio`
- Password: `sellwell1`
