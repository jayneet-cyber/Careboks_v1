# Careboks Backend API

Fastify + PostgreSQL + Prisma backend for the Careboks application.

## 1) Install

```bash
cd backend
npm install
cp .env.example .env
```

## 2) Start PostgreSQL (local)

```bash
docker compose up -d
```

## 3) Create Prisma client and apply migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

If you already ran earlier migrations, run the migrate command again to apply the latest migrations.

## 4) Run API

```bash
npm run dev
```

API defaults to `http://localhost:4000`.

To connect the frontend, set:

```env
VITE_API_BASE_URL=http://localhost:4000
```

For AI endpoints, set backend secrets:

```env
MY_IBM_KEY=your_ibm_iam_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
```

## Available routes

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me` (Bearer token required)
- `POST /auth/logout` (Bearer token required)
- `POST /cases` (Bearer token required)
- `PATCH /cases/:caseId` (Bearer token required)
- `POST /cases/:caseId/profile` (Bearer token required)
- `POST /cases/:caseId/analysis` (Bearer token required)
- `POST /cases/:caseId/approval` (Bearer token required)
- `POST /cases/:caseId/feedback` (Bearer token required)
- `GET /cases/:caseId` (Bearer token required)
- `GET /cases?limit=10` (Bearer token required)
- `POST /documents` (Bearer token required)
- `GET /documents/case/:caseId` (Bearer token required)
- `PATCH /documents/:documentId/deactivate` (Bearer token required)
- `GET /public/documents/:token` (public)
- `POST /public/patient-feedback` (public)
- `POST /ai/extract-text-from-document` (Bearer token required)
- `POST /ai/generate-patient-document-v2` (Bearer token required)
- `POST /ai/regenerate-section` (Bearer token required)

## Auth response shape

Auth endpoints return:

- `accessToken` (short-lived JWT)
- `refreshToken` (server-stored hashed session token)
- `refreshTokenExpiresAt`
- `user` object with profile data
