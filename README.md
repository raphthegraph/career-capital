# $JOB

$JOB prices a job like a career asset.

The user enters a company and role. The app researches public signals, turns them into a BUY / HOLD / SELL / SHORT style career rating, explains the most important evidence, asks three follow-up questions, creates a next-move recommendation, and keeps a contextual chat open at the end.

This repo started as a Lovable hackathon MVP. The current version keeps that original product flow, but hardens the backend, improves source-grounded output, adds safer fallbacks, and cleans up the frontend enough for a reliable demo.

## Demo Flow

1. Landing page: enter a company and role, or select a demo example.
2. Analysis loading: the app walks through source search, evidence extraction, role mapping, and pricing.
3. Verdict reveal: shows a synthetic ticker, BUY / HOLD / SELL / SHORT signal, confidence, score, and key signals.
4. Investment thesis: explains why to keep the job, why to be careful, and what would change the rating.
5. Three-question decision flow: captures what the user is actually considering.
6. Recommendation page: turns the analysis and answers into a short decision memo.
7. Floating chat: answers follow-up questions using the analysis, sources, answers, recommendation, and stored context.

## Tech Stack

- Lovable for the original MVP scaffold
- React, TypeScript, and Vite for the frontend
- Tailwind CSS and shadcn/ui for the interface
- Supabase Edge Functions for server-side orchestration
- Supabase Postgres for persistence and caching
- pgvector for retrieval-backed chat context
- OpenAI for structured analysis, recommendations, chat, and embeddings
- Tavily for public web research
- GitHub for source control

## Project Structure

```text
src/
  components/                 Main product screens and shared UI
  integrations/supabase/       Browser Supabase client
  lib/                         Shared frontend types and helpers
  pages/Index.tsx              Single-page flow controller
  test/                        Vitest coverage for helpers and contracts

supabase/
  functions/
    analyze-job/               Career asset analysis endpoint
    recommend-action/          Next-move recommendation endpoint
    career-chat/               Contextual chat endpoint
    system-status/             Lightweight internal API health endpoint
    _shared/                   Shared Deno helpers, schemas, OpenAI, Tavily
  migrations/                  Database schema and policy lock-down
```

The main frontend flow is controlled in [`src/pages/Index.tsx`](src/pages/Index.tsx). The core product screens are:

- [`src/components/Landing.tsx`](src/components/Landing.tsx)
- [`src/components/AnalysisRunner.tsx`](src/components/AnalysisRunner.tsx)
- [`src/components/VerdictReveal.tsx`](src/components/VerdictReveal.tsx)
- [`src/components/AnalysisDashboard.tsx`](src/components/AnalysisDashboard.tsx)
- [`src/components/Recommendations.tsx`](src/components/Recommendations.tsx)

[`src/pages/SystemStatus.tsx`](src/pages/SystemStatus.tsx) provides a lightweight status view at `/status`.

## Architecture

The browser never calls OpenAI or Tavily directly. It talks to Supabase Edge Functions with the public Supabase anon key. All provider secrets stay in Supabase function secrets.

High-level request path:

```text
React app
  -> Supabase Edge Function
    -> Tavily research
    -> OpenAI generation
    -> Supabase persistence, cache, embeddings
  -> normalized JSON response
  -> staged frontend reveal
```

### `analyze-job`

[`supabase/functions/analyze-job/index.ts`](supabase/functions/analyze-job/index.ts)

This endpoint:

- normalizes the company and role
- checks a 24-hour cache for matching analyses
- runs role-aware Tavily searches
- extracts the strongest source pages
- builds a research packet
- asks OpenAI for structured career-asset analysis
- validates and normalizes the payload
- stores the analysis, sources, and embeddings best effort
- returns demo-safe fallback output if services fail

### `recommend-action`

[`supabase/functions/recommend-action/index.ts`](supabase/functions/recommend-action/index.ts)

This endpoint:

- accepts the user's answers from the three-question flow
- reloads persisted analysis context when `analysisId` is available
- asks OpenAI for a short decision memo
- stores the decision flow and recommendation best effort
- returns a fallback recommendation if generation fails

### `career-chat`

[`supabase/functions/career-chat/index.ts`](supabase/functions/career-chat/index.ts)

This endpoint:

- accepts the active chat history
- reloads the analysis, sources, latest recommendation, and saved answers
- retrieves relevant embedded context through pgvector
- asks OpenAI for a concise, grounded reply
- stores user and assistant messages best effort

### `system-status`

[`supabase/functions/system-status/index.ts`](supabase/functions/system-status/index.ts)

This endpoint powers the `/status` page. It performs lightweight checks only:

- calls each Edge Function with `?health=1`
- verifies expected Supabase tables through server-side service-role reads
- measures response time
- returns `operational`, `degraded`, or `down`

It does not call OpenAI, Tavily, embeddings, or any expensive provider path.

## Data Model

The migrations live in [`supabase/migrations`](supabase/migrations).

Main tables:

- `job_analyses`: canonical analysis payloads and cache entries
- `research_sources`: Tavily sources attached to an analysis
- `analysis_embeddings`: vector chunks for analysis, thesis, and recommendation context
- `decision_flows`: answers from the three-question flow
- `recommendations`: generated next-move memos
- `chat_messages`: contextual chat history

The second migration, `20260425220500_lock_down_public_tables.sql`, removes broad public table policies. Normal app access should go through Edge Functions using the service role key.

## API Contracts

The frontend depends on the current route names. Keep them stable unless there is a strong reason to change them.

### `POST /functions/v1/analyze-job`

Request:

```json
{
  "company": "N26",
  "role": "Product Manager"
}
```

Important response fields:

```json
{
  "analysisId": "uuid",
  "ticker": "N-PM",
  "rating": "HOLD",
  "wouldBuy": "Conditional",
  "confidence": 58,
  "oneLineVerdict": "Short role-specific verdict",
  "careerAssetScore": 62,
  "researchQuality": "live",
  "keySignals": [],
  "investmentThesis": {
    "keep": [],
    "caution": [],
    "triggers": []
  },
  "sources": [],
  "_cached": false,
  "_warning": "optional warning"
}
```

The function also returns legacy-compatible fields such as `bullCase`, `bearCase`, `ratingChangeTriggers`, `qualitativeInsights`, `evidence`, and `chartData`.

### `POST /functions/v1/recommend-action`

Request:

```json
{
  "company": "N26",
  "role": "Product Manager",
  "analysisId": "uuid",
  "decision": {
    "intent": "options",
    "subIntent": "Higher-growth startup -> Just exploring quietly"
  }
}
```

Response:

```json
{
  "decision": {},
  "data": {
    "headline": "Stay, test the market",
    "recommendedMove": "One decisive sentence",
    "becauseYouSaid": [],
    "becauseResearchShows": [],
    "why": [],
    "next30Days": [],
    "watchOuts": [],
    "alternativePaths": [],
    "personalizationBasis": [],
    "sourceUrls": []
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
  "company": "N26",
  "role": "Product Manager",
  "messages": [
    { "role": "user", "content": "Why did you recommend this?" }
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

## Environment Variables

Copy `.env.example` to `.env` for local frontend development.

Frontend variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Supabase Edge Function secrets:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FUNCTION_HEALTH_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
TAVILY_API_KEY=
ALLOWED_ORIGINS=http://localhost:4173,http://127.0.0.1:4173,https://your-vercel-app.vercel.app
OPENAI_TIMEOUT_MS=45000
EMBEDDING_TIMEOUT_MS=15000
TAVILY_SEARCH_TIMEOUT_MS=12000
TAVILY_EXTRACT_TIMEOUT_MS=18000
```

Do not expose `OPENAI_API_KEY`, `TAVILY_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in the frontend. They should only be configured as Supabase function secrets.

## Vercel Deployment

The frontend can be deployed as a static Vite app on Vercel.

Vercel settings:

```bash
Install command: npm ci
Build command: npm run build
Output directory: dist
```

Vercel environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Store all private AI and Supabase service keys in Supabase function secrets, not in Vercel. The public Vercel app should only receive `VITE_` variables that are safe for the browser.

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run a production preview:

```bash
npm run build
npm run preview
```

Run checks:

```bash
npm run test
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Supabase Setup

Link the Supabase project if needed:

```bash
supabase link --project-ref <project-ref>
```

Apply migrations:

```bash
supabase db push
```

Set function secrets:

```bash
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  FUNCTION_HEALTH_ANON_KEY=your-supabase-anon-key \
  OPENAI_API_KEY=your-openai-key \
  OPENAI_MODEL=gpt-5.4-mini \
  TAVILY_API_KEY=your-tavily-key \
  ALLOWED_ORIGINS=http://localhost:4173,https://your-vercel-app.vercel.app \
  OPENAI_TIMEOUT_MS=45000 \
  EMBEDDING_TIMEOUT_MS=15000 \
  TAVILY_SEARCH_TIMEOUT_MS=12000 \
  TAVILY_EXTRACT_TIMEOUT_MS=18000
```

Deploy functions:

```bash
supabase functions deploy analyze-job
supabase functions deploy recommend-action
supabase functions deploy career-chat
supabase functions deploy system-status
```

Minimum database requirements:

- migrations applied
- `pgvector` enabled by the initial schema
- lock-down migration applied
- edge rate-limit migration applied
- Edge Function secrets configured

Post-deploy smoke test:

- Run `N26 / Product Manager`.
- Run `Trade Republic / Product Manager`.
- Ask chat: `Why did you recommend this?`
- Open `/status` and confirm the backend checks return live statuses.
- Confirm excessive requests return JSON errors.
- Confirm Vercel security headers are present on the production URL.

Public demo guardrails:

- Vercel provides the frontend DDoS and firewall layer.
- Supabase Edge Functions validate request size, method, and required fields.
- AI endpoints use per-client and global hourly rate limits to reduce cost-abuse risk.
- Provider keys and the Supabase service role key stay in Supabase function secrets only.

## Fallback Behavior

The demo should keep moving even when one service is down.

- If Supabase writes fail, the API still returns generated output.
- If Tavily fails, analysis continues with limited context and lower confidence.
- If OpenAI fails, the app returns demo fallback data for the known examples.
- If chat generation fails, the chat returns a short fallback reply instead of breaking the UI.

Demo fallback pairs:

- N26, Product Manager
- Tesla, Mechanical Engineer
- OpenAI, Research Engineer
- Trade Republic, Product Manager
- lemon.markets, Product Designer

When live evidence is weak, the UI should mark the output as limited evidence rather than pretending all claims are sourced.

## Testing Notes

Useful smoke tests:

- Run `N26 / Product Manager` from landing page to recommendation.
- Run `Trade Republic / Product Manager` and ask chat: `Why did you recommend this?`
- Confirm the analysis loader visibly walks through all sections.
- Confirm source chips appear under key signals when live sources are available.
- Confirm the final recommendation changes when different answer paths are selected.

## Known Limitations

- There is no user authentication. This is demo-oriented, not a multi-user product.
- The frontend is still a single phase controller instead of route-based pages.
- Some shadcn/ui files produce fast refresh lint warnings.
- The production bundle is larger than ideal and should be split later.
- Edge Function tests are mostly contract and static checks. Full live validation requires a configured Supabase project.

## Future Work

- Add route-based deep links for each stage.
- Add end-to-end tests for the full browser flow.
- Add server-side tracing for Tavily quality, OpenAI parsing, and fallback usage.
- Improve retrieval ranking for chat with fresher source weighting.
- Add authentication and per-user analysis ownership.
- Code-split the frontend bundle.
