# Careboks - AI Communication Tool for Cardiac Patients

## 🎯 Project Overview

Careboks helps clinicians communicate complex medical information in a clear, structured, patient-appropriate format. The system adapts content to patient attributes (age, sex, health literacy, comorbidities, language, etc.) and ensures clinical safety via mandatory clinician approval before communication.

**Supported Languages:** Estonian, Russian, English

## To do containerised setup (frontend+backend+postgres)
- Please follow: https://github.com/jayneet-cyber/Careboks_v1/tree/containerised-careboks 

## Following setup is for frontend+supabase

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Rich Text | TipTap editor |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Edge Functions | Deno |
| AI Model | IBM WatsonX (Granite 4) for document generation |
| PDF Processing | pdf.js, Optical character recognization via (llama-3-2-11b) |
| Authentication | Supabase Auth |
| Database | PostgreSQL with Row Level Security (RLS) |

## 📦 Setup Guide

### Prerequisites

- Node.js 18+ and **npm** OR **Bun** 1.0+
- Git
- Deno (for local edge function development)
- Docker (for local Supabase development - required for `npx supabase start`)
- IBM Cloud API credentials (for WatsonX)

**Note:** This project uses Bun as the package manager (see `bun.lockb`). You can use either Bun or npm.

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies using npm
npm install

# OR using Bun (recommended)
bun install

# Install Deno (if not already installed) / For Linux# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# macOS/Linux:
curl -fsSL https://deno.land/install.sh | sh
```

### Environment Setup


Create a `.env` file in the root directory:

```env
VITE_SUPABASE_PROJECT_ID="careboks-main"

VITE_SUPABASE_PUBLISHABLE_KEY= Publishable key from local supabase
VITE_SUPABASE_URL= local supabase URL

MY_IBM_KEY= Your IBM (IAM Token) Key
WATSONX_PROJECT_ID= Your atsonx project ID
APP_ORIGIN= https://your-domain.example
```

`APP_ORIGIN` is required in production for Edge Function CORS allowlisting.

## 🚀 Hetzner Debian Deployment (Self-Hosted Supabase)

For production deployment on a Debian VM with Nginx + HTTPS, see:

- `docs/deployment-hetzner-debian.md`

### Running Locally

#### Start Supabase (Backend)

```bash
# Start local Supabase (Docker required)
npx supabase start

# Check status
npx supabase status

# Deploy/Serve edge fuctions
npx supabase functions serve --no-verify-jwt --env-file ./.env
```

#### Run Frontend

```bash
# Using npm
npm run dev

# Using Bun (faster)
bun run dev
```

The app will be available at `http://localhost:8080`


#### Stop Supabase

```bash
npx supabase stop
```

## 🔄 Application Workflow

### 5-Step Document Generation Process

```
Input → Patient Profile → Clinician Approval → Print Preview → Feedback
```

1. **Technical Note Input** - Paste clinical notes or upload PDF/images with automatic OCR
2. **Patient Profile** - Collect patient attributes for personalisation
3. **Clinician Approval** - AI generates document; clinician reviews and edits
4. **Print Preview** - View A4 document, print, and publish shareable link
5. **Feedback** - Collect clinician feedback on the generated document

## 🏗️ Architecture

### Frontend Structure

```
src/
├── pages/
│   ├── Index.tsx           # Main 5-step workflow
│   ├── Landing.tsx         # Public landing page
│   ├── Auth.tsx            # Authentication
│   ├── Account.tsx         # User settings
│   ├── PrintPreview.tsx    # A4 document preview
│   ├── PatientDocument.tsx # Public patient document view
│   └── NotFound.tsx        # 404 page
├── components/
│   ├── TechnicalNoteInput  # Step 1: Note input with OCR
│   ├── PatientProfile      # Step 2: Patient attributes
│   ├── ClinicianApproval   # Step 3: AI review & approval
│   ├── Feedback            # Step 5: Feedback collection
│   ├── print/              # Print-specific components
│   ├── account/            # Account management sections
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── useCasePersistence  # Database CRUD operations
│   └── usePublishedDocument # Document publishing
└── utils/
    ├── draftParser         # Section parsing
    ├── structuredDocumentParser # JSON parsing
    └── pdfTextExtraction   # PDF utilities
```

### Backend Functions

All edge functions run on Deno runtime with automatic JWT verification.

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `generate-patient-document-v2` | Generate 7-section patient document via WatsonX | ✅ Yes |
| `regenerate-section` | Regenerate single section via WatsonX | ✅ Yes |
| `extract-text-from-document` | OCR text extraction from PDFs/images via WatsonX | ✅ Yes |

### Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with name, email, role, language |
| `patient_cases` | Case tracking with status workflow |
| `patient_profiles` | Patient attributes linked to cases |
| `ai_analyses` | Stored AI drafts and analysis data |
| `approvals` | Clinician approval records with audit trail |
| `published_documents` | Published patient documents with access tokens |
| `case_feedback` | Clinician feedback on generated documents |
| `patient_feedback` | Patient comprehension feedback |
| `clinician_contacts` | Hospital contact directory |
| `user_documents` | Uploaded file metadata |

#### Case Status Flow

```
draft → processing → pending_approval → approved → completed
```

## 📝 Output Document Structure

The AI generates 7 personalised sections:

1. **What do I have** - Plain-language diagnosis explanation
2. **How should I live next** - Lifestyle changes and physical activity
3. **Next 6 months** - Short-term recovery expectations
4. **What it means for my life** - Long-term consequences
5. **My medications** - Drug list with purpose and importance
6. **Warning signs** - Symptoms requiring medical attention
7. **My contacts** - Relevant hospital contacts


### Data Protection
- **Row Level Security (RLS)**: All database tables enforce user-scoped access
- **Users can only access their own cases and data**
- **Clinician Approval Gate**: No unapproved documents reach patients
- **Audit Trail**: All approvals recorded with clinician name and timestamp
- **Token-based Access**: Published documents use opaque tokens (not user credentials)

### Environment Security
- **API Keys**: Store IBM WatsonX credentials in .env (local)
- **CORS Headers**: Restricted to allow requests from authenticated users only

## Making Changes

1. **Frontend**: Edit React components in `src/`
   - Changes auto-reload with Vite hot reload
   - No edge function restart needed

2. **Edge Functions**: Edit files in `supabase/functions/`
   - Restart `supabase functions serve` after changes
   - Functions are written in TypeScript/Deno
   - All HTTP headers and CORS handled by Supabase

3. **Database**: Migrations stored in `supabase/migrations/`
   - Changes applied automatically on `supabase start`
   - Use Supabase Studio UI at http://localhost:54321


## 🔗 Links

- **Supabase CLI**: https://supabase.com/docs/reference/cli/start (CLI for   local project settings)
- **IBM WatsonX**: https://dataplatform.cloud.ibm.com/ (for API key management)

## Troubleshooting

### Supabase Won't Start
```bash
# If Docker is not running, start it first
docker start  # or restart Docker Desktop

# Reset Supabase to clean state
npx supabase stop
npx supabase start

# Check status
npx supabase status
```
### Edge Functions Not Found
```bash
# Ensure Supabase is running and restart functions
npx supabase functions serve --env-file ./.env
```

### Database Migration Issues
```bash
# Reset local database
npx supabase db reset

# Pull latest migrations from remote
npx supabase db pull

# Push local migrations to remote (if connected)
npx supabase db push
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally with `npm run dev` and `npx supabase start`
4. Commit with clear messages: `git commit -m "Add: description of changes"`
5. Push and create a Pull Request

### Code Style
- **Frontend**: Use TypeScript with proper type annotations
- **Edge Functions**: Write Deno-compatible TypeScript
- **Database**: Follow existing schema patterns and use migrations
- **Components**: Follow React best practices with functional components

## 📄 License

This project is a proof-of-concept for healthcare communication improvement.
