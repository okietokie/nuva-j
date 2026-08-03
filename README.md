# NUVA

NUVA is a full-stack jewelry e-commerce website built with:

- Frontend: React + Vite + Ant Design
- Backend: FastAPI
- Database: MongoDB Atlas
- Storage: Backblaze B2
- CDN: Cloudflare in front of Backblaze B2
- Deployment: Vercel for frontend, Render for backend

## Project structure

```text
New project/
  frontend/   React + Vite client
  backend/    FastAPI API server
```

## File placement

### Frontend

- `frontend/package.json`: frontend dependencies and scripts
- `frontend/vite.config.js`: Vite config
- `frontend/.env.example`: frontend environment variables
- `frontend/src/main.jsx`: app entry point
- `frontend/src/router.jsx`: app routes
- `frontend/src/theme.js`: Ant Design theme tokens
- `frontend/src/styles/global.css`: global styling
- `frontend/src/layouts/`: shared public and admin layouts
- `frontend/src/components/`: reusable UI pieces and route guards
- `frontend/src/context/`: auth and cart state
- `frontend/src/services/`: Axios API helpers
- `frontend/src/data/`: starter dummy data for graceful fallback
- `frontend/src/pages/`: user-facing and admin pages

### Backend

- `backend/requirements.txt`: Python dependencies
- `backend/.env.example`: backend environment variables
- `backend/app/main.py`: FastAPI app entry
- `backend/app/core/`: settings and security helpers
- `backend/app/db/`: MongoDB connection
- `backend/app/dependencies/`: auth and role guards
- `backend/app/routers/`: API routes
- `backend/app/schemas/`: request and response models
- `backend/app/services/`: Backblaze B2 and auth helpers
- `backend/app/utils/`: serialization helpers for Mongo documents

## Setup

### Run frontend and backend together

From the project root:

```bash
npm run dev
```

This starts:

- `frontend/` with Vite
- `backend/` with the backend virtualenv's Python running `uvicorn app.main:app --reload`

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Set values in `frontend/.env`:

- `VITE_API_BASE_URL`

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set values in `backend/.env`:

- MongoDB Atlas connection string
- JWT secret
- Backblaze B2 credentials
- Cloudflare CDN base URL

## Deployment notes

- Deploy `frontend/` to Vercel
- Deploy `backend/` to Render
- In Vercel, set `VITE_API_BASE_URL` to your Render API URL
- In Render, add all backend environment variables from `backend/.env.example`
- Point your Cloudflare CDN hostname to the Backblaze B2 bucket origin

### Render backend setup

This repo now includes a root-level `render.yaml` that configures the FastAPI backend service with:

- `rootDir: backend`
- `buildCommand: python -m pip install -r requirements.txt`
- `startCommand: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

If you already created the Render service manually, either:

- update the service's **Root Directory** to `backend` and **Start Command** to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, or
- update the service's **Root Directory** to `backend` and **Start Command** to `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`, or
- delete/recreate the service from this repo so Render picks up `render.yaml`

Do not use the default `gunicorn your_application.wsgi` command for this project because this backend is FastAPI, not Django.

## Image upload flow

1. Admin uploads an image from the React admin product form.
2. React sends the file to FastAPI.
3. FastAPI uploads the file to Backblaze B2 using the S3-compatible API.
4. FastAPI returns the Cloudflare CDN URL.
5. Only that CDN URL is stored in MongoDB and rendered on the frontend.

## Using existing B2 images for the catalog

If you already have product images uploaded, use their Cloudflare CDN URLs in:

- `backend/data/products.seed.json`

Then seed the catalog into MongoDB:

```bash
cd backend
python -m scripts.seed_products
```

Replace each sample image URL with your real CDN URL. Avoid raw Backblaze B2 file URLs on the frontend.
