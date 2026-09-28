# FinanceWise — System Documentation

FinanceWise is a **single-user** personal finance tracker with an AI financial advisor. One person logs income/expenses, sets budgets, tracks debt payoff, sets savings goals, and gets Gemini-powered financial advice grounded in their live data.

- Currency: Philippine Peso (₱)
- Architecture: TypeScript SPA (client) + Express REST API (server) + PostgreSQL
- Auth model: single shared password, no multi-tenancy, no user table

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla TypeScript SPA (no framework), Vite 5, custom hash router |
| Charts | Chart.js 4 |
| Markdown/sanitization | `marked` + `DOMPurify` (advisor chat) |
| Backend | Node.js, Express 4, TypeScript |
| DB access | `pg` (node-postgres), raw parameterized SQL — **no ORM** |
| Validation | Zod v4 |
| Auth | `jsonwebtoken` + `bcryptjs` |
| AI | `@google/genai` (Gemini `gemini-2.5-flash`) |
| Database | PostgreSQL (Supabase in production) |
| Migrations | `node-pg-migrate` |
| Testing | Vitest (client + server), Supertest (server HTTP tests) |
| Lint/format | ESLint 9 flat config + Prettier |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Hosting | Render.com (web service + static site) |

---

## 2. Architecture

```
client/                  Vite SPA
  src/ts/
    main.ts              app bootstrap (menu, logout, calculator widget, router)
    router.ts             minimal hash router
    api.ts                fetch wrapper (credentials: 'include', auto-reload on 401)
    auth.ts               login/logout/session check
    views/                one module per page (dashboard, transactions, budget,
                           debts, savings, advisor, login)
    utils/                pure, DOM-free logic + matching *.test.ts
                           (sanitize.ts, calculator-engine.ts, savings-calc.ts)

server/                  Express API
  src/
    app.ts               builds the Express app (importable by tests)
    index.ts              DB init + listen (separated from app.ts for testability)
    routes/*.ts           → middleware/{auth,validate}.ts → controllers/*.ts
    controllers/*.ts      business logic, raw parameterized SQL via pool.query
    db/connection.ts      pg Pool, numeric type parser, SSL config
    db/init.ts            defensive auto-create fallback (schema.sql) on boot
    validation/schemas.ts zod schemas for every write endpoint
    services/advisor-engine.ts   builds Gemini prompt from live financial context
    knowledge/financial-literacy.ts  static advisor knowledge base
  migrations/             node-pg-migrate — source of truth for schema
  scripts/migrate.cjs     migration runner (derives DATABASE_URL from DB_* vars)
```

**Client ↔ server**: REST/JSON over HTTPS, cookie-based session auth, CORS locked to an explicit origin allow-list with `credentials: true`. Client targets `VITE_API_URL` (defaults to `/api`, proxied to `localhost:3001` in dev).

---

## 3. Core Features

- **Transactions** — CRUD, filter by type/category/date range/search, paginated.
- **Budgets** — Monthly per-category budgets, spent-vs-budget rollups, 50/30/20 (needs/wants/savings) summary, and a `/budgets/suggest?income=` endpoint that proposes a 50/30/20 split.
- **Debts** — CRUD plus a payoff simulator supporting **snowball** (smallest balance first) and **avalanche** (highest interest first), simulated up to 360 months.
- **Savings goals** — CRUD, contributions, auto-completion, plus a client-side goal calculator (months-to-goal at a given contribution, or required monthly contribution to hit a deadline).
- **General-purpose calculator** — Floating 4-function widget persisted across pages, backed by a pure state machine.
- **Dashboard** — Balance, income/expense totals (all-time + monthly), a computed 0–100 financial health score, spending-by-category and 6-month trend chart data, recent transactions, active debt total, savings progress.
- **Categories** — Pre-seeded income/expense/both categories, each optionally tagged `needs`/`wants`/`savings`.
- **AI Advisor** — Gemini chat grounded in the user's live financial context (income, expenses, debts, savings, budget status); history persisted and rendered as sanitized Markdown.
- **Login gate** — Single shared-password screen before the SPA renders.
- **Demo Mode** — A landing page (`client/src/ts/views/landing.ts`) offers a "Try Live Demo" path that never touches the real backend. `client/src/ts/demo/` swaps every `api.ts` call for an in-browser mock (sessionStorage-backed dummy data + a keyword-matched offline advisor, `demo/financial-literacy.ts`), so visitors can use every feature with realistic sample data without logging in, and without ever reaching the real database, JWT auth, or Gemini API key. See §11.

---

## 4. Database Schema

Managed by **node-pg-migrate**; the single baseline migration (`server/migrations/1786181568312_baseline-schema.sql`) captures what `db/init.ts` previously created on every boot. Future schema changes must go through new migrations, not edits to `db/init.ts`.

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `icon`, `type` (`income`/`expense`/`both`), `budget_group` (`needs`/`wants`/`savings`, nullable) | |
| `transactions` | `id`, `type` (`income`/`expense`), `amount DECIMAL(12,2) CHECK(>0)`, `category_id → categories.id ON DELETE SET NULL`, `description`, `date` | Indexed on `date DESC`, `type`, `category_id` |
| `budgets` | `id`, `category_id → categories.id ON DELETE CASCADE`, `amount CHECK(>=0)`, `month CHECK(1-12)`, `year CHECK(>=2020)` | `UNIQUE(category_id, month, year)` enables upsert |
| `debts` | `id`, `name`, `total_amount`/`current_balance CHECK(>0)`, `interest_rate DEFAULT 0`, `minimum_payment DEFAULT 0`, `due_date CHECK(1-31)`, `is_active` | |
| `savings_goals` | `id`, `name`, `target_amount`/`current_amount CHECK(>0)`, `deadline`, `icon DEFAULT '🎯'`, `is_completed` | |
| `chat_messages` | `id`, `role` (`user`/`advisor`), `content`, `created_at` | Indexed on `created_at DESC` |

`debts`, `savings_goals`, and `chat_messages` have no foreign keys — expected for a single-user app with no per-user scoping.

**Numeric handling**: `server/src/db/connection.ts` registers a global `pg` type parser for `NUMERIC` (OID 1700) that runs `parseFloat` at the driver level, so money columns always come back as JS numbers rather than strings — fixes a class of `NaN` bugs from string/number ambiguity.

Migration commands: `npm run migrate:up|down|create` (server workspace).

---

## 5. Authentication & Authorization

**Account-based authentication with user isolation and an explicit administrator role.**

- `POST /api/auth/login` compares the posted password against the bcrypt hash stored for the selected account via `bcrypt.compare`.
- Registration stores a bcrypt password hash and creates a normal `user` account. On success, the server signs a JWT (`sub`, account role, `JWT_SECRET`, 7-day expiry) and sets it as an **httpOnly cookie** (`fw_token`).
- Cookie flags: `httpOnly: true` always; `secure: true` in production; `sameSite: 'none'` in production (client/server are on different Render origins) vs `'lax'` in dev; 7-day `maxAge`.
- `requireAuth` middleware verifies the JWT on every request and 401s on missing/invalid/expired tokens; it 500s (fails closed) if `JWT_SECRET` isn't configured.
- Every resource router (`transactions`, `budgets`, `debts`, `savings`, `dashboard`, `categories`, `advisor`) sits behind `requireAuth`. Only `/api/auth/*` and `/api/health` are public.
- Every protected request re-checks that the account still exists and is active. Admin/support access is separate and requires `role = 'admin'`.
- Promote the developer account after registering it with `npm run promote-user -- developer@example.com` from the server directory. This command uses database credentials and never returns or changes a password.
- `GET /api/admin/users` lists account metadata only. `GET /api/admin/users/:id/overview` is read-only support access, excludes password hashes, and records each lookup in `admin_access_log`.
- `npm run hash-password -- "pw"` generates a bcrypt hash for `ADMIN_PASSWORD_HASH`, so production never needs to store a plaintext password.

---

## 6. Security

Hardened in commit `20a8c64` ("prevent stored XSS, validate all inputs with zod, fix numeric type bug") and maintained since.

- **Input validation** — Zod schemas (`server/src/validation/schemas.ts`) cover every write endpoint, using `z.coerce.number().positive()/.nonnegative()` so a malformed numeric string returns a clean `400` instead of reaching the DB as `NaN`/500. Applied via `validateBody()` middleware, which `safeParse`s the body, replaces `req.body` with the coerced result, and returns the first Zod issue message on failure. **Exception**: `POST /api/advisor/chat` is not Zod-validated — only a manual non-empty check.
- **Stored XSS prevention** — `client/src/ts/utils/sanitize.ts` exports `escapeHtml()`, applied everywhere DB-sourced strings (descriptions, category/debt/goal names) are interpolated into `innerHTML`. The AI advisor's chat bubbles run both user and model content through `marked.parse()` → `DOMPurify.sanitize()` before insertion, since Gemini output is treated as untrusted.
- **SQL injection prevention** — Every query across every controller uses parameterized `pool.query(sql, [params])` with `$1, $2, …` placeholders; no string concatenation of untrusted input into SQL, including in the dynamic transaction-filter builder.
- **CORS** — Explicit allow-list from `CLIENT_ORIGIN` (comma-separated); any other `Origin` is rejected; `credentials: true`.
- **Session cookie hardening** — `httpOnly`, `secure` in prod, `sameSite: 'none'` in prod (paired with `secure`), 7-day expiry, JWT-signed.
- **Password hashing** — bcrypt (`bcryptjs`), cost factor 10.
- **Fail-closed misconfiguration handling** — auth middleware and login both 500 if `JWT_SECRET` is unset, rather than silently allowing access.
- **Log hygiene** — request logging is disabled in `production`/`test` to avoid leaking query strings.
- **DB transport** — production pool uses `ssl: { rejectUnauthorized: false }`: encrypts the connection but does **not** verify the Supabase CA certificate.

**Known gaps** (not currently implemented):
- Login attempts are rate-limited in-process (20 attempts per IP per 15 minutes; use a shared store before scaling to multiple instances)
- No `helmet` or equivalent security-headers middleware
- `rejectUnauthorized: false` on the DB TLS connection weakens MITM protection to the database

---

## 7. API Reference

All routes are under `/api`. Everything except `/api/auth/*` and `/api/health` requires the `fw_token` session cookie.

**Auth**
- `POST /api/auth/login` — verify password, set session cookie
- `POST /api/auth/register` — create a user account
- `POST /api/auth/logout` — clear session cookie
- `GET /api/auth/me` — check session validity

**Administrator support** (admin accounts only)
- `GET /api/admin/users?limit=&offset=` — list users without credentials
- `GET /api/admin/users/:id/overview` — read-only financial overview for support; access is logged

**Transactions**
- `GET /api/transactions?type=&category_id=&from=&to=&search=&limit=&offset=`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

**Budgets**
- `GET /api/budgets/suggest?income=` — 50/30/20 suggestion
- `GET /api/budgets?month=&year=`
- `POST /api/budgets` — create/upsert
- `DELETE /api/budgets/:id`

**Debts**
- `GET /api/debts/payoff?method=snowball|avalanche&extra_payment=`
- `GET /api/debts?active=`
- `POST /api/debts`
- `PUT /api/debts/:id`
- `DELETE /api/debts/:id`

**Savings**
- `GET /api/savings`
- `POST /api/savings`
- `PUT /api/savings/:id`
- `DELETE /api/savings/:id`
- `POST /api/savings/:id/contribute`

**Dashboard / Categories**
- `GET /api/dashboard/summary`
- `GET /api/dashboard/categories` (also aliased as `GET /api/categories?type=`)

**Advisor**
- `POST /api/advisor/chat` — send message, get Gemini reply, persists both
- `GET /api/advisor/history?limit=`
- `DELETE /api/advisor/history`

**Health**
- `GET /api/health` — status, DB connectivity, category count (public)

---

## 8. Testing & CI

- **Server tests** (`server/tests/`, Vitest + Supertest, `pg` mocked — no real DB needed):
  - `auth.test.ts` — protected routes 401 without a session; login/logout flow
  - `validation.test.ts` — bad input returns 400 (not 500) without touching the DB; numeric coercion
  - `transactions.test.ts` — pagination clamping (`limit` capped at 200, `offset` floored at 0), filter-parity between the page query and the count query
- **Client tests** — co-located `*.test.ts` for pure logic: `calculator-engine`, `savings-calc`, `sanitize` (`escapeHtml`)
- **CI** (`.github/workflows/ci.yml`) — on push/PR to `master`/`main`, two parallel jobs on Node 20:
  - `server`: `npm ci` → lint → `tsc --noEmit` → test → build
  - `client`: `npm ci` → lint → test → build
  - No deploy step; Render deploys independently on push

---

## 9. Environment Variables

**Server**
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Full Postgres connection string (production); presence flips the pool into production mode (SSL, smaller pool size) |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | Local Postgres connection, used when `DATABASE_URL` is absent |
| `PORT` | Server port (default 3001) |
| `JWT_SECRET` | Signs session JWTs — required, fails closed if unset |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` | Developer/support account to ensure at server startup when paired with `ADMIN_PASSWORD_HASH`. |
| `ADMIN_PASSWORD_HASH` | bcrypt hash for the developer/support account (generate via `npm run hash-password`) |
| `CLIENT_ORIGIN` | Comma-separated allowed CORS origins |
| `GEMINI_API_KEY` | Google Gemini API key for the advisor (advisor degrades gracefully if unset) |
| `NODE_ENV` | Affects cookie flags, request logging, CORS defaults |

**Client**
| Var | Purpose |
|---|---|
| `VITE_API_URL` | Absolute API base URL for production builds (defaults to `/api`, dev-proxied to `localhost:3001`) |

---

## 10. Deployment

Defined in `render.yaml` — two Render services, no Dockerfile:

- **`financewise-server`** (Node web service, `rootDir: server`) — build: `npm install && npm run build && npm run migrate:up` (migrations run as part of the build); start: `npm start`. Requires `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (never plaintext in prod), and `CLIENT_ORIGIN`.
- **`financewise-client`** (static site, `rootDir: client`) — build: `npm install && npm run build`, publishes `./dist`; requires `VITE_API_URL` pointing at the deployed server.

Production database is Supabase-hosted PostgreSQL.

---

## 11. Demo Mode

Public portfolio visitors land on a marketing page, not the login screen. Anyone unauthenticated sees `renderLandingScreen()` (`client/src/ts/views/landing.ts`) with two choices: **Owner Login** (the real, unchanged password flow) or **Try Live Demo**.

**Design goal:** the demo must be completely safe to expose publicly — zero risk to the real database, JWT secret, admin password hash, or `GEMINI_API_KEY`. It achieves this by never making a single network request to the server.

- `client/src/ts/demo/demo-state.ts` — `isDemoMode()`/`enterDemoMode()`/`exitDemoMode()`, backed by a `sessionStorage` flag (`fw_demo_mode`). A fresh tab always starts clean; a reload mid-demo keeps edits.
- `client/src/ts/demo/mock-data.ts` — generates realistic ₱-denominated dummy data (6 months of transactions, budgets, 3 debts, 4 savings goals) relative to the visitor's current date, so the demo never looks stale.
- `client/src/ts/demo/mock-store.ts` — the in-browser "database": reads/writes the generated data to `sessionStorage` (key `fw_demo_data`).
- `client/src/ts/demo/mock-api.ts` — a drop-in reimplementation of every method on `api` (`client/src/ts/api.ts`), replicating each server controller's logic (health score formula, 50/30/20 budget grouping, snowball/avalanche payoff simulation, etc.) against the mock store instead of Postgres.
- `client/src/ts/demo/financial-literacy.ts` — a keyword-matched knowledge base standing in for the Gemini-backed AI Advisor, so the demo needs no API key and costs nothing to run. Falls back to a data-aware summary (referencing the visitor's own mock debts/savings) when no keyword matches.
- `client/src/ts/api.ts` exports `api` as a `Proxy` that re-checks `isDemoMode()` on every property access (not once at module load) and dispatches to `mockApi` or the real `liveApi` accordingly — every view (`dashboard.ts`, `transactions.ts`, etc.) is unmodified and unaware which one it's talking to.

Exiting demo mode (`Exit Demo` in the sidebar or the persistent demo banner) clears both sessionStorage keys and reloads back to the landing page. Nothing about the real login, real API, or real database was touched to build this — `server/` has no demo-related code at all.
