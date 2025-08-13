<p align="center">
  <img src="https://i.postimg.cc/BvwrbZNC/blog-api-github-banner.png" alt="Blog API Banner" width="900" />
</p>

<div align="center">

# Blog API & React Frontend (Full-Stack Monorepo)

A full-stack blog application with an Express + Prisma backend and a React + Vite frontend.  
Single npm workspaces repo with shared tooling, comprehensive tests, and API docs.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Monorepo](https://img.shields.io/badge/npm-workspaces-CC3534?logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v10/using-npm/workspaces)

</div>

---

## Table of Contents
- [Requirements](#requirements)
- [Live URLs](#live-urls)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Testing & coverage](#testing--coverage)
- [Linting & formatting](#linting--formatting)
- [Notes](#notes)
- [Roadmap](#roadmap-optional-improvements)
- [Deployment (Render + Netlify)](#deployment-render--netlify)

---

## Requirements
- Node.js >= **20** (enforced via `engines`)
- npm >= **9**
- PostgreSQL (local) for the backend

## Live URLs
- **Frontend (Netlify)**: https://blog-api-frontend.netlify.app/  
- **Backend (Render)**: https://blog-api-6fdo.onrender.com/  
- **API Docs (Swagger)**: https://blog-api-6fdo.onrender.com/api-docs

### Demo users (seeded on deploy)
| Role   | Username | Password   |
|--------|----------|------------|
| Admin  | `admin`  | `Admin123!`|
| User   | `user`   | `User123!` |

---

## Quick start (local)

~~~bash
# From the repository root
npm install

# Prepare the backend database
npm run prisma:generate --workspace=backend
npm run prisma:migrate  --workspace=backend
# Optional: open Prisma studio
npm run prisma:studio   --workspace=backend

# Start both apps (backend + frontend) in dev mode
npm run dev
~~~

- Backend: http://localhost:5000  
- Frontend: http://localhost:5173 *(Vite will pick a free port if 5173 is busy)*  
- Swagger (API docs): http://localhost:5000/api-docs

---

## Environment variables

### `backend/.env`
~~~env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-strong-secret
COOKIE_SECRET=replace-with-cookie-secret
CORS_ORIGINS=http://localhost:5173,http://localhost:5000
CSRF_SECRET=replace-with-csrf-secret
~~~

### `frontend/.env.local`
~~~env
VITE_API_URL=http://localhost:5000
~~~

---

## Scripts

### Root (workspaces aware)
- `npm run dev` — start backend and frontend concurrently  
- `npm run build` — build all workspaces  
- `npm run test` — run tests for all workspaces  
- `npm run test:frontend` / `npm run test:backend` — per-workspace tests  
- `npm run test:coverage` — coverage for all workspaces  
- `npm run lint` / `npm run lint:fix` — lint all workspaces  
- `npm run format` — Prettier across all workspaces

### Backend
- `npm run dev --workspace=backend` — start Express with nodemon  
- `npm run test --workspace=backend` — backend tests  
- `npm run test:coverage --workspace=backend` — backend coverage  
- `npm run prisma:generate|migrate|studio --workspace=backend`

### Frontend
- `npm run dev --workspace=frontend` — start Vite dev server  
- `npm run build --workspace=frontend` — frontend build  
- `npm run test --workspace=frontend` — frontend tests  
- `npm run test:coverage --workspace=frontend` — frontend coverage

---

## Tech stack
- **Backend:** Node.js, Express, Prisma (PostgreSQL), express-validator, Helmet, csurf, JWT, Winston, Swagger  
- **Frontend:** React, React Router, React Query, React Hook Form, Tailwind CSS, Vite  
- **Testing:** Vitest, Testing Library, Supertest (backend), jsdom (frontend)  
- **Tooling:** ESLint (flat config) + Prettier, npm workspaces, concurrently

---

## Project structure
~~~
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
│  │  ├─ test/utils.jsx      # renderWithProviders and fixtures
│  │  └─ ...
│  └─ src/**/__tests__/      # component/page/hook/context tests
└─ README.md
~~~

---

## Testing & coverage

~~~bash
# All tests
npm run test

# Coverage
npm run test:coverage
~~~

Recent coverage snapshots:
- **Backend:** Statements 95.55%, Branches 90.52%, Functions 96.42%, Lines 95.55%  
- **Frontend:** Statements 92.22%, Branches 81.46%, Functions 92.59%, Lines 92.22%

---

## Linting & formatting
~~~bash
npm run lint
npm run lint:fix
npm run format
~~~

---

## Notes
<details>
<summary><strong>Auth, CSRF & Session Probe</strong></summary>

- **CSRF:** The backend issues an `XSRF-TOKEN` cookie and returns `{ csrfToken }` at `GET /api/csrf-token`.  
  The frontend automatically fetches a fresh token before state-changing requests and sends it in the `X-XSRF-TOKEN` header.

- **Cookies:** `jwt` uses `SameSite=None; Secure` in production for cross-origin.

- **Session probe:** Use `GET /api/users/session` to check whether a user is authenticated without incurring a 401.  
  Returns `200` with `{ authenticated: true, data: { user } }` or `{ authenticated: false }`.  
  The frontend `AuthProvider` calls this endpoint and sets the user in context to avoid red 401 console noise.
</details>

<details>
<summary><strong>Dev Notes</strong></summary>
Node 20+ is required (matches dependency engines, e.g., `react-router-dom` 7.x).
</details>

---

## Roadmap (optional improvements)
- CI (GitHub Actions): lint, test, coverage gates, build  
- Containerization (Dockerfiles + docker-compose) + health checks  
- End-to-end tests (Playwright/Cypress) for main flows  
- Observability (structured logs shipping, error tracking)

---

## Deployment (Render + Netlify)

### Backend (Render)
Start command (runs migrations, seeds idempotently, then starts server):
~~~bash
npx prisma migrate deploy && node prisma/seed.js && npm start
~~~
Important env vars:
- `PORT` (provided by Render)  
- `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` (include your Netlify domain), `NODE_ENV=production`

### Frontend (Netlify)
- Env: `VITE_API_URL=https://blog-api-6fdo.onrender.com`  
- Build: `npm run build --workspace=frontend`  
- Publish dir: `frontend/dist`
