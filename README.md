# Blog API Backend

This is the backend for a modern, full-featured blog application. It is built
with Node.js, Express, and Prisma, following best practices for security,
scalability, and maintainability.

## ✨ Features

- **Full CRUD Operations:** For users, posts, and comments.
- **Authentication & Authorization:** Secure JWT-based authentication with
  session cookies and role-based access control (USER vs. ADMIN).
- **Robust Security:** Implements CSRF (Cross-Site Request Forgery) protection
  on all state-changing endpoints, sets security headers with Helmet, and
  includes rate limiting.
- **Comprehensive API Documentation:** Interactive API documentation available
  via Swagger UI.
- **Standardized Error Handling:** Uses RFC 7807 Problem Details for consistent
  and machine-readable error responses.
- **Structured & Scalable:** Organized by feature with a clear separation of
  concerns (routes, controllers, services, middleware).

---

## 🚀 Getting Started

Follow these instructions to get the project set up and running on your local
machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/)
- A running PostgreSQL database (or any other database supported by Prisma)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd blog-api
```

### 2. Install Dependencies

Navigate to the backend directory and install the necessary npm packages.

```bash
cd backend
npm install
```

### 3. Set Up Environment Variables

The backend relies on environment variables for configuration. Create a `.env`
file in the `backend` directory by copying the example file:

```bash
cp .env.example .env
```

Now, edit the `.env` file with your specific configuration:

```dotenv
# Environment (development, test, production)
NODE_ENV=development

# The port the server will run on
PORT=5000

# Connection string for your PostgreSQL database
# Example: DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DATABASE_URL="your_database_connection_string"

# Secret key for signing JSON Web Tokens (JWT)
# Use a long, random, and secret string
JWT_SECRET="your_jwt_secret_key"

# JWT expiration time (e.g., 30d, 1h, 7d)
JWT_EXPIRE=30d

# Comma-separated list of allowed origins for CORS
# Example: CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
CORS_ORIGINS=http://localhost:5000

# Logging level (error, warn, info, http, verbose, debug, silly)
LOG_LEVEL=info
```

### 4. Apply Database Migrations

Use Prisma to apply the database schema.

```bash
npx prisma migrate dev --name init
```

### 5. Start the Server

You can now start the development server.

```bash
npm run dev
```

The server should now be running on the port you specified in your `.env` file
(e.g., `http://localhost:5000`).

---

## 📚 API Documentation

Once the server is running, interactive API documentation is available through
Swagger UI at:

**`http://localhost:5000/api-docs`**

This interface allows you to view all available endpoints, see their
request/response structures, and execute requests directly from your browser.

---

## 🔐 Security Model

### Authentication

The API uses JWTs for authentication. Upon successful login or registration, a
`jwt` token is set as an `HttpOnly`, `secure`, and `strict` cookie. This cookie
is automatically sent with subsequent requests to protected endpoints.

### CSRF Protection

All state-changing endpoints (`POST`, `PUT`, `DELETE`, etc.) are protected
against Cross-Site Request Forgery attacks.

To interact with protected endpoints, a client must:

1.  First make a `GET` request to any endpoint (e.g., the root `/` endpoint).
    The server will respond by setting a readable `XSRF-TOKEN` cookie.
2.  For every subsequent state-changing request, the value of the `XSRF-TOKEN`
    cookie must be included in the `X-XSRF-TOKEN` HTTP header.

The Swagger UI at `/api-docs` handles this flow automatically. Simply execute
the `GET /` request once, and all subsequent requests from the UI will be
correctly authenticated.

---

## 👥 User Roles

The API has a simple but effective role-based access control system.

- **Anonymous User:**
  - Can read posts and comments.
- **`USER` Role (Standard User):**
  - Can do everything an anonymous user can.
  - Can manage their own profile.
  - Can create, update, and delete their own comments.
- **`ADMIN` Role:**
  - Can do everything a `USER` can.
  - Can create, update, and delete any post.

---

## 📂 Project Structure

The `backend` directory is structured to separate concerns and group related
files by feature.

```
backend/
├── src/
│   ├── config/           # Configuration files (database, logging, swagger)
│   ├── controllers/      # Express route handlers (request/response logic)
│   ├── docs/             # Swagger/JSDoc documentation files
│   ├── middleware/       # Custom Express middleware (auth, errors, validation)
│   ├── routes/           # Express route definitions
│   ├── services/         # Business logic and database interaction
│   └── server.js         # Main Express server setup and entry point
├── prisma/
│   └── migrations/       # Prisma database migration files
├── .env.example          # Example environment file
├── .gitignore
└── package.json
```
