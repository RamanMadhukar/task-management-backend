# TaskFlow — Full-Stack Task Management App

A production-ready task management application built with the MERN stack, featuring real-time
collaboration via Socket.io, role-based access control, and a clean responsive UI.

---

## Live URLs

| Service  | URL |
|----------|-----|
| Frontend | `https://task-management-frontend-gules.vercel.app` |

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, Vite, Redux Toolkit, React Router v6, Tailwind CSS |
| Backend    | Node.js, Express 4, MongoDB + Mongoose |
| Real-time  | Socket.io (WebSockets) |
| Auth       | JWT + bcryptjs, httpOnly cookies |
| Testing    | Jest + Supertest (BE), Vitest + RTL (FE) |
| Deployment | Render (BE), Vercel (FE), MongoDB Atlas |
| DevOps     | Docker, docker-compose, GitHub Actions CI/CD |

---

## Project Structure

```
/
├── task-manager-backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/     # authController, taskController, userController
│   │   ├── middleware/       # auth, asyncHandler, errorHandler, validate
│   │   ├── models/           # User, Task (Mongoose schemas)
│   │   ├── routes/           # authRoutes, taskRoutes, userRoutes
│   │   ├── sockets/          # Socket.io server + event emitters
│   │   ├── utils/            # logger (Winston), errorResponse
│   │   ├── validations/      # Joi schemas for all routes
│   │   └── app.js            # Express app (middleware stack)
│   ├── tests/                # Jest + Supertest (auth, tasks, users)
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js             # Entry point (http.createServer + Socket.io)
│
├── task-manager-frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── store.js
│   │   │   └── slices/       # authSlice, tasksSlice, usersSlice, notificationsSlice
│   │   ├── components/
│   │   │   ├── auth/         # ProtectedRoute, AdminRoute, GuestRoute, AuthForms
│   │   │   ├── dashboard/    # StatsCard, RecentActivity
│   │   │   ├── layout/       # AppLayout, Sidebar, Topbar
│   │   │   ├── tasks/        # TaskCard, TaskModal, TaskFilters, Pagination
│   │   │   └── ui/           # Button, Modal, Badge, Spinner, Avatar, etc.
│   │   ├── hooks/            # useSocket, useTheme, useDebounce
│   │   ├── pages/            # Login, Register, Dashboard, Tasks, Board, AdminUsers, Profile
│   │   ├── tests/            # Vitest + RTL (LoginPage, TaskCard, slices)
│   │   └── utils/            # axiosInstance, socket.js, helpers
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
│
├── docker-compose.yml
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- MongoDB (local) or a MongoDB Atlas connection string
- npm >= 9

### 1 — Clone the repositories

```bash
git clone https://github.com/RamanMadhukar/task-management-frontend.git
git clone https://github.com/RamanMadhukar/task-management-backend.git
```

### 2 — Backend setup

```bash
cd task-manager-backend
cp .env.example .env        # Fill in your values
npm install
npm run dev                  # Starts on http://localhost:5000
```

**Required `.env` variables:**

| Variable          | Example                                  | Notes |
|-------------------|------------------------------------------|-------|
| `NODE_ENV`        | `development`                            | |
| `PORT`            | `5000`                                   | |
| `MONGO_URI`       | `mongodb+srv://user:pass@cluster/taskflow` | Atlas or local |
| `MONGO_URI_TEST`  | `mongodb://localhost:27017/taskflow_test`| For `npm test` |
| `JWT_SECRET`      | 64-char random hex string                | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRE`      | `7d`                                     | |
| `JWT_COOKIE_EXPIRE` | `7`                                    | Days |
| `FRONTEND_URL`    | `http://localhost:5173`                  | CORS origin |

### 3 — Frontend setup

```bash
cd task-manager-frontend
cp .env.example .env         # Fill in your values
npm install
npm run dev                   # Starts on http://localhost:5173
```

**Required `.env` variables:**

| Variable          | Example                        |
|-------------------|--------------------------------|
| `VITE_API_URL`    | `http://localhost:5000/api`    |
| `VITE_SOCKET_URL` | `http://localhost:5000`        |

---

## Docker Setup (full stack)

```bash
# From the project root (where docker-compose.yml lives)
cp task-manager-backend/.env.example task-manager-backend/.env
# Edit .env with your MONGO_URI, JWT_SECRET, etc.

docker-compose up --build
```

| Service  | Port |
|----------|------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:5000 |
| MongoDB  | localhost:27017 |

---

## Running Tests

```bash
# Backend (Jest + Supertest) — requires local MongoDB or MONGO_URI_TEST
cd task-manager-backend
npm test

# Frontend (Vitest + React Testing Library)
cd task-manager-frontend
npm test
```

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <token>
```

---

### Auth Endpoints

#### `POST /auth/register`
Register a new user.

**Request body:**
```json
{
  "name":     "Jane Doe",
  "email":    "jane@example.com",
  "password": "securepassword",
  "role":     "user"
}
```

**Response `201`:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "user" }
}
```

---

#### `POST /auth/login`
Login with email and password.

**Request body:**
```json
{ "email": "jane@example.com", "password": "securepassword" }
```

**Response `200`:** Same shape as register.

---

#### `GET /auth/me` 🔒
Get currently authenticated user.

**Response `200`:**
```json
{ "success": true, "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }
```

---

#### `GET /auth/logout` 🔒
Clear auth cookie and invalidate session.

**Response `200`:** `{ "success": true, "message": "Logged out" }`

---

### Task Endpoints

#### `GET /tasks` 🔒
Get tasks with filtering, sorting, and pagination.

**Query params:**

| Param    | Type   | Description |
|----------|--------|-------------|
| `status` | string | `todo` \| `in-progress` \| `review` \| `done` |
| `priority`| string| `low` \| `medium` \| `high` \| `critical` |
| `search` | string | Search in title and description |
| `sortBy` | string | `dueDate` \| `priority` \| `createdAt` \| `title` |
| `order`  | string | `asc` \| `desc` |
| `page`   | number | Default `1` |
| `limit`  | number | Default `10` |

**Response `200`:**
```json
{
  "success": true,
  "data": [{ "_id": "...", "title": "...", "status": "todo", "priority": "medium", "assignee": { "name": "..." } }],
  "pagination": { "page": 1, "limit": 10, "total": 42 }
}
```

> Uses MongoDB aggregation pipeline with `$lookup`, `$facet`, and `$project` internally.

---

#### `POST /tasks` 🔒
Create a new task.

**Request body:**
```json
{
  "title":       "Fix login bug",
  "description": "Users can't log in on mobile Safari",
  "status":      "todo",
  "priority":    "high",
  "assignee":    "64f1a2b3c4d5e6f7a8b9c0d1",
  "dueDate":     "2025-12-31",
  "tags":        ["bug", "mobile"]
}
```

> `assignee` field is admin-only. Regular users are auto-assigned to themselves.

**Response `201`:** `{ "success": true, "data": { ...task } }`

---

#### `PUT /tasks/:id` 🔒
Update a task. Owners can update their own tasks; admins can update any task.

**Request body:** Any subset of task fields.

**Response `200`:** `{ "success": true, "data": { ...updatedTask } }`

---

#### `DELETE /tasks/:id` 🔒
Delete a task. Owner or admin only.

**Response `200`:** `{ "success": true, "data": {} }`

---

#### `GET /tasks/stats/summary` 🔒
Get task count grouped by status (uses MongoDB aggregation).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "status": "todo",        "count": 5 },
    { "status": "in-progress", "count": 3 },
    { "status": "done",        "count": 12 }
  ]
}
```

---

### User Endpoints (Admin only)

#### `GET /users` 🔒👑
List all users.

#### `GET /users/:id` 🔒👑
Get user by ID.

#### `PUT /users/:id` 🔒👑
Update user name/email.

#### `DELETE /users/:id` 🔒👑
Delete user. Their tasks will be unassigned automatically.

#### `PATCH /users/:id/role` 🔒👑
Change user role.

**Request body:** `{ "role": "admin" | "user" }`

---

### Error Response Shape

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "stack":   "..." // only in development
}
```

| HTTP Code | Meaning |
|-----------|---------|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Authenticated but not authorized |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Real-time Events (Socket.io)

### Connection

```js
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' },
})
```

### Events emitted by server → client

| Event           | Payload | Trigger |
|-----------------|---------|---------|
| `task:created`  | `Task`  | Any task created |
| `task:updated`  | `Task`  | Any task updated |
| `task:deleted`  | `{ id }` | Any task deleted |
| `task:assigned` | `{ task }` | Task reassigned to you |
| `notification`  | `{ type, message, ... }` | Generic push notification |

### Events emitted by client → server

| Event        | Payload | Effect |
|--------------|---------|--------|
| `room:join`  | `string` | Join a named room |
| `room:leave` | `string` | Leave a named room |

---

## Deployment Guide

### Backend on Render (free tier)

1. Push `task-manager-backend` to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, set:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
4. Add all environment variables from `.env.example`
5. Copy the deploy hook URL → add as `RENDER_DEPLOY_HOOK_URL` in GitHub secrets

### Frontend on Vercel

1. Push `task-manager-frontend` to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_API_URL` → your Render backend URL + `/api`
   - `VITE_SOCKET_URL` → your Render backend URL
5. Get `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` from Vercel dashboard
   → add all to GitHub repo secrets for CI/CD

### MongoDB Atlas

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → free M0 cluster
2. Whitelist `0.0.0.0/0` for Render (or use Render's static IPs)
3. Create DB user → copy connection string → set as `MONGO_URI`

---

## Security Measures

| Layer | Measure |
|-------|---------|
| Passwords | bcrypt with salt rounds = 12 |
| Auth tokens | JWT HS256, 7-day expiry, httpOnly cookie |
| Headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Restricted to `FRONTEND_URL` origin only |
| Rate limiting | 20 req/15 min on auth routes, 200 req/15 min globally |
| Input validation | Joi schemas on all mutation endpoints |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from inputs |
| Body size | `express.json({ limit: '10kb' })` |
| Error leaking | Stack traces only in `NODE_ENV=development` |
| Socket auth | JWT verified in Socket.io middleware before any connection |