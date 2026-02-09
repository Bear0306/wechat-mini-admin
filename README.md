# WeChat Mini Admin

Admin frontend for the WeChat Mini backend: manage contests, prize rules, and prize claims.

## Stack

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **React Router**

## Features

- **Login** via backend admin auth (`POST /api/admin/auth/login`). Session stored in `localStorage`; **logout after 1 hour of inactivity** (timer resets on mouse/keyboard/scroll/touch).
- **Dashboard** layout: header (with logout), left sidebar menu, main body (contest + prize rule CRUD), bottom panel (prize claims list + status update).
- **Contest CRUD**: list, create, edit, delete contests. Fields: title, scope, regionCode, heatLevel, frequency, audience, status, startAt, endAt.
- **ContestPrizeRule CRUD** (per contest): add/delete rules (rankStart, rankEnd, prizeValueCent, optional audience).
- **ContestPrizeClaim**: list with pagination; update `status` via dropdown (PENDING, COMPLETED, REJECTED).

## Setup

1. Install dependencies (from this directory):

   ```bash
   npm install
   ```

2. **Start the backend first.** The admin app proxies `/api` to the backend. By default it expects the backend at `http://127.0.0.1:8080`.

   In `wechat-mini-backend` run:

   ```bash
   npm run dev
   ```

   You should see something like "Backend running at http://localhost:8080". Leave this running, then start the admin app.

## Run

- **Dev:** `npm run dev` — app at `http://localhost:3000`; API requests are proxied to the backend (see `VITE_API_TARGET` below).
- **Build:** `npm run build`
- **Preview:** `npm run preview`

## Env

- **`VITE_API_TARGET`** — Backend URL for the dev proxy (default: `http://127.0.0.1:8080`). Set this if your backend runs on another port or host (e.g. WSL, Docker, or another machine). Example: `VITE_API_TARGET=http://127.0.0.1:3001` or copy `.env.example` to `.env` and edit.

**If you see `ECONNREFUSED 127.0.0.1:8080`:** the backend is not accepting connections on that address/port. Start the backend in `wechat-mini-backend` (e.g. `npm run dev`), or set `VITE_API_TARGET` to the URL where your backend is actually running.
