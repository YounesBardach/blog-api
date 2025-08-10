# Temporary README.md

# Blog API & React Frontend (Full‑Stack Monorepo)

A full‑stack blog application with an Express + Prisma backend and a React +
Vite frontend. The repository is a single npm workspaces project with shared
tooling, comprehensive tests, and API documentation.

## Requirements

- Node.js >= 20 (enforced via engines)
- npm >= 9
- PostgreSQL (local) for the backend

## Quick start

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blog_api?schema=public
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

- The backend uses CSRF protection and secure cookie practices; adjust
  `CORS_ORIGINS` and cookie flags for your deployment environment.
- Node 20+ is required across the project to match dependency engines (e.g.,
  react‑router‑dom 7.x).

## Roadmap (optional improvements)

- Continuous Integration (GitHub Actions): lint, test, coverage gates, build
- Containerization (Dockerfiles + docker‑compose) and health checks
- End‑to‑end tests (Playwright/Cypress) for main flows
- Observability (structured logs shipping, error tracking)
