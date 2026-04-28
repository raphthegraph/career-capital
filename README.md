# $JOB

$JOB treats a person’s current job like their biggest career asset.

The user enters a company and role. The app researches public company signals, evaluates the job as a career asset, produces a BUY / HOLD / SELL / SHORT-style rating, explains the reasoning, asks three AI-native follow-up questions, generates a next-move recommendation, and supports contextual follow-up chat.

This repository started as a Lovable hackathon MVP. The goal of this version is not a rewrite. It is a stabilization pass: keep the existing journey, tighten the backend contracts, harden fallbacks, improve output quality, and make the project understandable to judges and future contributors.

## Demo Flow

1. Landing page: enter a company and role, or try one of the demo companies.
2. Analysis runner: simulated pricing/loading sequence while the backend researches and evaluates the role.
3. Verdict reveal: ticker, rating, one-line verdict, and job-specific key signals.
4. Investment thesis: reasons to keep the job, reasons to be careful, and rating-change triggers.
5. Three-question decision flow: capture the user’s current intent.
6. Recommendation page: recommended move, why, next 30 days, watch-outs, and alternatives.
7. Floating AI chat: follow-up career questions grounded in the same analysis and recommendation.

## Tech Stack

- Lovable: original scaffold for the React frontend, Supabase wiring, and initial edge-function structure
- React + TypeScript + Vite: frontend application
- Tailwind + shadcn/ui: UI primitives and styling
- Supabase:
  - Edge Functions for server-side AI + research orchestration
  - Postgres for analyses, sources, question-flow answers, recommendations, and chat history
  - pgvector for retrieval-backed chat context
- OpenAI:
  - structured analysis generation
  - structured recommendation generation
  - chat responses
  - embeddings for retrieval
- Tavily:
  - discovery search
  - targeted extract on top high-signal URLs
- GitHub: source control and collaboration workflow

## Architecture Overview

### Frontend

- [src/pages/Index.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/pages/Index.tsx)
  - controls the single-page app flow
  - phases: `landing -> analyzing -> verdict -> dashboard -> decision`
- Key components:
  - [Landing.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/components/Landing.tsx)
  - [AnalysisRunner.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/components/AnalysisRunner.tsx)
  - [VerdictReveal.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/components/VerdictReveal.tsx)
  - [AnalysisDashboard.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/components/AnalysisDashboard.tsx)
  - [Recommendations.tsx](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/src/components/Recommendations.tsx)

### Backend

- Supabase Edge Functions:
  - [analyze-job](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/analyze-job/index.ts)
  - [recommend-action](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/recommend-action/index.ts)
  - [career-chat](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/career-chat/index.ts)
- Shared backend helpers:
  - [career.ts](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/_shared/career.ts)
  - [tavily.ts](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/_shared/tavily.ts)
  - [openai.ts](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/_shared/openai.ts)
  - [schemas.ts](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/functions/_shared/schemas.ts)

### Database

- [job_analyses](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/migrations/20260425205143_aff1dfb5-f175-405c-8106-21b0a21f5cf3.sql): canonical analysis payloads + cache entries
- `research_sources`: Tavily evidence per analysis
- `analysis_embeddings`: embeddings for verdicts, key signals, thesis, and recommendation retrieval
- `decision_flows`: 3-question decision flow answers
- `recommendations`: generated next-move recommendations
- `chat_messages`: persistent chat history
- `match_analysis_embeddings(...)`: vector similarity function scoped to one analysis

The follow-up migration [20260425220500_lock_down_public_tables.sql](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/supabase/migrations/20260425220500_lock_down_public_tables.sql) removes broad public read/insert policies so table access stays server-side through Edge Functions.

## Data Flow

1. The frontend sends `company` and `role` to `analyze-job`.
2. `analyze-job`:
   - normalizes the company + role pair
   - checks the 24-hour analysis cache
   - runs Tavily Search across overview, news, hiring, risk, and momentum queries
   - runs Tavily Extract only on the top 5 highest-signal URLs
   - compresses evidence
   - calls OpenAI with a strict structured schema
   - normalizes the result into a backward-compatible frontend contract
   - saves the analysis, research sources, and embeddings best-effort
3. The frontend renders:
   - verdict reveal using `keySignals` or `qualitativeInsights`
   - investment thesis using `investmentThesis` or the legacy thesis arrays
4. The decision flow stays client-side and submits the user’s intent to `recommend-action`.
5. `recommend-action`:
   - optionally reloads the persisted analysis by `analysisId`
   - generates a structured recommendation with OpenAI
   - stores the decision answers, recommendation, and recommendation embedding best-effort
6. The floating chat sends `analysisId` and the current message to `career-chat`.
7. `career-chat`:
   - reloads the analysis and latest recommendation when possible
   - fetches recent chat history
   - uses pgvector retrieval over embedded analysis context
   - generates a concise career answer
   - stores chat messages best-effort

## API Documentation

### `POST /functions/v1/analyze-job`

Request:

```json
{
  "company": "OpenAI",
  "role": "Research Engineer"
}
```

Response shape:

```json
{
  "ticker": "OPEN-RE",
  "rating": "BUY",
  "wouldBuy": "Conditional",
  "confidence": 81,
  "oneLineVerdict": "...",
  "careerAssetScore": 84,
  "dimensions": { "...": "..." },
  "qualitativeInsights": [{ "...": "..." }],
  "keySignals": [{ "...": "..." }],
  "investmentThesis": {
    "keep": ["...", "...", "..."],
    "caution": ["...", "...", "..."],
    "triggers": ["...", "...", "..."]
  },
  "bullCase": ["...", "...", "..."],
  "bearCase": ["...", "...", "..."],
  "ratingChangeTriggers": ["...", "...", "..."],
  "evidence": {
    "momentumSignals": ["..."],
    "riskSignals": ["..."],
    "hiringSignals": ["..."],
    "companySignals": ["..."]
  },
  "sources": [{ "...": "..." }],
  "chartData": [{ "month": "Jan", "price": 55.2 }],
  "analysisId": "uuid",
  "_cached": true,
  "_warning": "optional warning"
}
```

### `POST /functions/v1/recommend-action`

Request:

```json
{
  "decision": {
    "intent": "options",
    "subIntent": "Stronger company, similar role"
  },
  "company": "OpenAI",
  "role": "Research Engineer",
  "analysisId": "uuid"
}
```

Response:

```json
{
  "decision": { "...": "..." },
  "data": {
    "recommendedMove": "...",
    "why": ["...", "...", "..."],
    "next30Days": ["...", "...", "..."],
    "watchOuts": ["...", "..."],
    "alternativePaths": [
      { "label": "...", "detail": "..." }
    ]
  },
  "recommendationId": "uuid",
  "_warning": "optional warning"
}
```

### `POST /functions/v1/career-chat`

Request:

```json
{
  "analysisId": "uuid",
  "messages": [
    { "role": "user", "content": "Should I stay six more months?" }
  ]
}
```

Response:

```json
{
  "reply": "Concise grounded answer",
  "_warning": "optional warning"
}
```

## Fallback and Demo Behavior

The app is designed to keep the demo moving even when external services fail.

- If Supabase writes fail:
  - the response still returns generated analysis/recommendation/chat
  - only persistence is skipped
- If Tavily fails:
  - analysis still runs with limited public context
  - confidence should be lower
  - `_warning` is returned
- If OpenAI fails:
  - the analysis route falls back to:
    - N26 Product Manager
    - Tesla Mechanical Engineer
    - OpenAI Research Engineer
    - Trade Republic Product Manager
    - lemon.markets Product Designer
  - other company/role pairs get a generic baseline fallback
- If chat generation fails:
  - the app returns a short fallback answer instead of breaking the UI

## Environment Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Backend / Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TAVILY_API_KEY`

See [.env.example](/Users/raphaelhildbrand/Documents/Codex/2026-04-25-i-want-to-work-with-you/career-capital/.env.example) for the full template.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure frontend variables:

- use `.env.example` as the reference
- the current frontend expects a live Supabase project URL and publishable key

3. Set Supabase Edge Function secrets in your project:

```bash
supabase secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  OPENAI_API_KEY=... \
  OPENAI_MODEL=gpt-5.4-mini \
  TAVILY_API_KEY=...
```

4. Apply database migrations:

```bash
supabase db push
```

5. Deploy or serve the functions:

```bash
supabase functions deploy analyze-job
supabase functions deploy recommend-action
supabase functions deploy career-chat
```

6. Run the frontend:

```bash
npm run dev
```

## Validation Commands

```bash
npm run lint
npm run test
npm run build
```

## Required Supabase Setup

Minimum requirements:

- pgvector enabled
- the initial schema migration applied
- the policy lock-down migration applied
- Edge Function secrets configured

The repo already includes the SQL migrations. No extra hand-written SQL is required beyond running the migrations.

## Current Stability Notes

What was improved in this stabilization pass:

- preserved the existing Lovable user journey
- switched backend generation from Lovable’s AI gateway dependency to direct OpenAI server-side calls
- added strict structured schemas for analysis and recommendation generation
- added richer, job-specific `keySignals`, `investmentThesis`, and `sources` while keeping legacy fields for frontend compatibility
- improved Tavily usage to do discovery first, then targeted extract on the top URLs only
- added stronger demo fallbacks for the five named companies
- normalized analysis payloads so partial AI output does not crash the frontend
- made recommendation and chat routes fallback-safe
- added shared backend helpers to reduce duplicated logic
- added `.env.example`
- tightened database exposure by removing broad public table policies
- replaced the placeholder README with real setup and architecture documentation

## Known Limitations

- the frontend now restores verdict, dashboard, and recommendation stages from local storage after a refresh
- shadcn/Lovable-generated UI files still produce some non-blocking lint warnings around fast-refresh patterns
- the production bundle is larger than ideal and should be split further after the hackathon demo
- there is no user authentication yet; this repo is optimized for demo reliability, not multi-user privacy workflows
- Edge Function validation in this repo is primarily by static review and shared-module typing; the frontend build does not execute Deno functions locally

## Future Improvements

- persist the active analysis state in the URL or storage so refreshes are resilient
- add route-based pages instead of a single phase controller
- add server-side analytics and trace logging for prompt / research quality
- tighten chat retrieval ranking with richer source embeddings and recency weighting
- code-split the heavy UI bundle
- add end-to-end tests for the core flow and Edge Function contract tests
