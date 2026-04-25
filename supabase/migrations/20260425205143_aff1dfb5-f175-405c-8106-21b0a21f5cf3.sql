-- Enable pgvector for semantic retrieval
create extension if not exists vector;

-- Main job analysis (career asset evaluation)
create table if not exists public.job_analyses (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  normalized_company text not null,
  normalized_role text not null,
  ticker text,
  rating text,
  would_buy text,
  one_line_verdict text,
  confidence integer,
  career_asset_score integer,
  analysis_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_job_analyses_lookup
  on public.job_analyses (normalized_company, normalized_role, created_at desc);

-- Tavily / research sources backing each analysis
create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.job_analyses(id) on delete cascade,
  title text,
  url text,
  source_type text,
  snippet text,
  raw_content text,
  content_summary text,
  created_at timestamptz not null default now()
);
create index if not exists idx_research_sources_analysis on public.research_sources (analysis_id);

-- Vector embeddings for retrieval (key signals, thesis, sources, recommendation, chat memory)
create table if not exists public.analysis_embeddings (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.job_analyses(id) on delete cascade,
  content_type text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_embeddings_analysis on public.analysis_embeddings (analysis_id);
create index if not exists idx_embeddings_vector
  on public.analysis_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 3-step decision flow answers
create table if not exists public.decision_flows (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.job_analyses(id) on delete cascade,
  question_1 text,
  answer_1 text,
  question_2 text,
  answer_2 text,
  question_3 text,
  answer_3 text,
  created_at timestamptz not null default now()
);
create index if not exists idx_decision_flows_analysis on public.decision_flows (analysis_id);

-- Generated recommendations
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.job_analyses(id) on delete cascade,
  decision_flow_id uuid references public.decision_flows(id) on delete cascade,
  recommendation_json jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_recommendations_analysis on public.recommendations (analysis_id, created_at desc);

-- Chat message history per analysis
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.job_analyses(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_analysis on public.chat_messages (analysis_id, created_at);

-- Vector similarity search over an analysis's embeddings
create or replace function public.match_analysis_embeddings(
  query_embedding vector(1536),
  match_analysis_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  analysis_id uuid,
  content_type text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    e.id,
    e.analysis_id,
    e.content_type,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.analysis_embeddings e
  where e.analysis_id = match_analysis_id
    and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count
$$;

-- updated_at trigger for job_analyses
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_job_analyses_updated_at on public.job_analyses;
create trigger trg_job_analyses_updated_at
  before update on public.job_analyses
  for each row execute function public.set_updated_at();

-- RLS — public demo (no auth). Allow read/insert from anon + authenticated.
alter table public.job_analyses enable row level security;
alter table public.research_sources enable row level security;
alter table public.analysis_embeddings enable row level security;
alter table public.decision_flows enable row level security;
alter table public.recommendations enable row level security;
alter table public.chat_messages enable row level security;

-- Read policies (public)
create policy "public read job_analyses" on public.job_analyses for select using (true);
create policy "public read research_sources" on public.research_sources for select using (true);
create policy "public read analysis_embeddings" on public.analysis_embeddings for select using (true);
create policy "public read decision_flows" on public.decision_flows for select using (true);
create policy "public read recommendations" on public.recommendations for select using (true);
create policy "public read chat_messages" on public.chat_messages for select using (true);

-- Insert policies (public — service role bypasses RLS anyway, but keep client-safe)
create policy "public insert job_analyses" on public.job_analyses for insert with check (true);
create policy "public insert research_sources" on public.research_sources for insert with check (true);
create policy "public insert analysis_embeddings" on public.analysis_embeddings for insert with check (true);
create policy "public insert decision_flows" on public.decision_flows for insert with check (true);
create policy "public insert recommendations" on public.recommendations for insert with check (true);
create policy "public insert chat_messages" on public.chat_messages for insert with check (true);