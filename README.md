# Careboks - AI Communication Tool for Cardiac Patients

Careboks helps clinicians convert complex medical notes into clear, patient-friendly documents with mandatory clinician review before sharing.

Supported patient languages:
- Estonian
- Russian
- English

## Architecture

This project is now backend-only.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui |
| Backend API | Fastify (Node.js, TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | IBM WatsonX |
| OCR / PDF utilities | backend AI endpoints |

## Repository Structure

```text
.
├── src/                  # Frontend app
├── backend/              # Fastify + Prisma API
│   ├── src/
│   ├── prisma/
│   └── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- Docker (for local PostgreSQL via `backend/docker-compose.yml`)
- IBM WatsonX credentials (for AI endpoints)

## Containerized Deployment on local

Production-style containers are provided:

- `backend/Dockerfile`
- `Dockerfile.frontend`
- `nginx.conf`
- `docker-compose.yml` (root)

### Run full stack with Docker

From repo root:

```bash
# Ensure backend secrets are set in backend/.env
# Required for AI endpoints:
# MY_IBM_KEY=...
# WATSONX_PROJECT_ID=...

docker compose up --build -d
```

Services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

Helpful commands:

```bash
# Follow backend logs
docker compose logs -f backend

# Stop services
docker compose down

# Stop and delete volumes (wipes DB + file storage)
docker compose down -v
```

## Environment Variables

### Frontend (`.env` in repo root)

- `VITE_API_BASE_URL` - Base URL of backend API (default fallback is `http://localhost:4000`)

### Backend (`backend/.env` for local non-container runs)

See `backend/.env.example`. Main values:

- `DATABASE_URL` - PostgreSQL connection string
- `API_HOST` - Bind host (default `0.0.0.0`)
- `API_PORT` - API port (default `4000`)
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `REFRESH_TOKEN_TTL_DAYS`
- `FILE_STORAGE_DIR` - Local storage path for user-uploaded docs
- `MY_IBM_KEY` - IBM IAM API key
- `WATSONX_PROJECT_ID` - WatsonX project id

## Available Scripts

### Root

- `npm run dev` - Start frontend
- `npm run dev:backend` - Start backend dev server
- `npm run dev:full` - Start backend + frontend
- `npm run build` - Build frontend
- `npm run build:backend` - Build backend

### Backend (`backend/`)

- `npm run dev` - Start Fastify dev server
- `npm run build` - TypeScript build
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:studio`

## Core API Routes

Auth:
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/logout`

Cases:
- `POST /cases`
- `PATCH /cases/:caseId`
- `POST /cases/:caseId/profile`
- `POST /cases/:caseId/analysis`
- `POST /cases/:caseId/approval`
- `POST /cases/:caseId/feedback`
- `GET /cases/:caseId`
- `GET /cases?limit=10`

Publishing / public:
- `POST /documents`
- `GET /documents/case/:caseId`
- `PATCH /documents/:documentId/deactivate`
- `GET /public/documents/:token`
- `POST /public/patient-feedback`

AI:
- `POST /ai/extract-text-from-document`
- `POST /ai/generate-patient-document-v2`
- `POST /ai/regenerate-section`

Account:
- `GET /account/profile`
- `PATCH /account/profile`
- `GET /account/contacts`
- `POST /account/contacts`
- `PATCH /account/contacts/:id`
- `DELETE /account/contacts/:id`
- `GET /account/documents`
- `POST /account/documents`
- `GET /account/documents/:id/download`
- `DELETE /account/documents/:id`

## Application Workflow

1. Technical note input and optional document OCR
2. Patient profile capture
3. AI draft generation and clinician editing
4. Publish/share document
5. Feedback collection

### Prisma migration issues

Run in order:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

If needed for non-dev environments:

```bash
cd backend
npm run prisma:deploy
```
