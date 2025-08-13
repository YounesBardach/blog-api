<p align="center">
  <img src="https://i.postimg.cc/BvwrbZNC/blog-api-github-banner.png" alt="Blog API Banner" width="900" />
</p>

# Blog API & React Frontend (Full‑Stack Monorepo)

A full‑stack blog application with an Express + Prisma backend and a React +
Vite frontend. The repository is a single npm workspaces project with shared
tooling, comprehensive tests, and API documentation.

## Requirements

- Node.js >= 20 (enforced via engines)
- npm >= 9
- PostgreSQL (local) for the backend

## Live URLs

- Frontend (Netlify): https://blog-api-frontend.netlify.app/
- Backend (Render): https://blog-api-6fdo.onrender.com/
- API Docs (Swagger): https://blog-api-6fdo.onrender.com/api-docs

Demo users (seeded on deploy):

- Admin: `admin` / `Admin123!`
- Regular: `user` / `User123!`

Notes

- CSRF: The backend issues an `XSRF-TOKEN` cookie and returns `{ csrfToken }` at
  `GET /api/csrf-token`. The frontend automatically fetches a fresh token before
  state‑changing requests and sends it in the `X-XSRF-TOKEN` header.
- Auth: Cookie `jwt` uses `SameSite=None; Secure` in production for
  cross‑origin.

- Session probe: Use `GET /api/users/session` to check whether a user is
  authenticated without incurring a 401. It returns `200` with either
  `{ authenticated: true, data: { user } }` or `{ authenticated: false }`. The
  frontend `AuthProvider` calls this endpoint; if authenticated, it sets the
  user in context and avoids red console errors from a 401-only probe.

## Quick start (local)

```bash
# From the repository root
npm install

# Prepare the backend database (create DB first, then):
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
# Optional: open Prisma studio
npm run prisma:studio --workspace=backend

# Start both apps (backend + frontend) in dev mode
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173 (Vite will choose another free port if 5173 is
  busy)
- Swagger (API docs): http://localhost:5000/api/docs

## Environment variables (backend/.env)

Create `backend/.env` with values similar to:

```

Frontend (Vite): create `frontend/.env.local`

```

VITE_API_URL=http://localhost:5000

```
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-strong-secret
COOKIE_SECRET=replace-with-cookie-secret
CORS_ORIGINS=http://localhost:5173,http://localhost:5000
CSRF_SECRET=replace-with-csrf-secret
```

## Scripts

Root (workspaces aware):

- `npm run dev` — start backend and frontend concurrently
- `npm run build` — run build for all workspaces
- `npm run test` — run tests for all workspaces
- `npm run test:frontend` / `npm run test:backend` — run tests for a single
  workspace
- `npm run test:coverage` — run coverage for all workspaces
- `npm run lint` / `npm run lint:fix` — lint all workspaces
- `npm run format` — Prettier format all workspaces

Backend:

- `npm run dev --workspace=backend` — start Express with nodemon
- `npm run test --workspace=backend` — run backend tests
- `npm run test:coverage --workspace=backend` — backend coverage
- `npm run prisma:generate|migrate|studio --workspace=backend`

Frontend:

- `npm run dev --workspace=frontend` — start Vite dev server
- `npm run build --workspace=frontend` — frontend build
- `npm run test --workspace=frontend` — run frontend tests
- `npm run test:coverage --workspace=frontend` — frontend coverage

## Tech stack

- Backend: Node.js, Express, Prisma (PostgreSQL), express‑validator, Helmet,
  csurf, JWT, Winston, Swagger
- Frontend: React, React Router, React Query, React Hook Form, Tailwind CSS,
  Vite
- Testing: Vitest, Testing Library, Supertest (backend), jsdom (frontend)
- Tooling: ESLint (flat config) + Prettier, npm workspaces, concurrently

## Project structure

```
.
├─ backend/
│  ├─ prisma/                 # Schema, migrations, seed
│  ├─ src/
│  │  ├─ config/             # logger, prisma, swagger
│  │  ├─ controllers/        # route handlers
│  │  ├─ middleware/         # auth, validation, error
│  │  ├─ routes/             # API routes
│  │  ├─ services/           # business logic
│  │  ├─ app.js, server.js
│  └─ test/                  # route, service, middleware tests
├─ frontend/
│  ├─ src/
│  │  ├─ components/, pages/, hooks/, context/
│  │  ├─ test/utils.jsx      # renderWithProviders and test fixtures
│  │  └─ ...
│  └─ src/**/__tests__/      # component/page/hook/context tests
└─ README.md
```

## Testing and coverage

```bash
# All tests (root)
npm run test

# Coverage (root)
npm run test:coverage
```

Recent coverage snapshots:

- Backend: Statements 95.55%, Branches 90.52%, Functions 96.42%, Lines 95.55%
- Frontend: Statements 92.22%, Branches 81.46%, Functions 92.59%, Lines 92.22%

## Linting and formatting

```bash
npm run lint
npm run lint:fix
npm run format
```

## Notes

- The 401 entries you may see in the browser console for `GET /users/profile`
  when logged‑out are expected. They are a lightweight way to check session
  state. To remove the red console lines entirely, you can switch to a public
  `GET /api/session` endpoint that returns `{ authenticated: false }` with
  HTTP 200.
- The backend uses CSRF protection and secure cookie practices; adjust
  `CORS_ORIGINS` and cookie flags for your deployment environment.
- Node 20+ is required across the project to match dependency engines (e.g.,
  react‑router‑dom 7.x).

## Roadmap (optional improvements)

- Continuous Integration (GitHub Actions): lint, test, coverage gates, build
- Containerization (Dockerfiles + docker‑compose) and health checks
- End‑to‑end tests (Playwright/Cypress) for main flows
- Observability (structured logs shipping, error tracking)

## Deployment (Render + Netlify)

Backend (Render)

- Start command (runs migrations, seeds idempotently, then starts server):

  ```bash
  npx prisma migrate deploy && node prisma/seed.js && npm start
  ```

- Important env vars:
  - `PORT` (provided by Render)
  - `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` (include your Netlify domain),
    `NODE_ENV=production`

Frontend (Netlify)

- Set env var:
  - `VITE_API_URL=https://blog-api-6fdo.onrender.com`
- Build command: `npm run build --workspace=frontend`
- Publish directory: `frontend/dist`
