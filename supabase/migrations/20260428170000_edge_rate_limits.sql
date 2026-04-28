create table if not exists public.edge_rate_limits (
  key text primary key,
  endpoint text not null,
  identifier_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists idx_edge_rate_limits_cleanup
  on public.edge_rate_limits (window_start);

alter table public.edge_rate_limits enable row level security;

create or replace function public.check_edge_rate_limit(
  p_key text,
  p_endpoint text,
  p_identifier_hash text,
  p_window_start timestamptz,
  p_max_count integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.edge_rate_limits as erl (
    key,
    endpoint,
    identifier_hash,
    window_start,
    request_count,
    updated_at
  )
  values (
    p_key,
    p_endpoint,
    p_identifier_hash,
    p_window_start,
    1,
    now()
  )
  on conflict (key) do update
    set request_count = erl.request_count + 1,
        updated_at = now()
  returning erl.request_count into current_count;

  return query select
    current_count <= p_max_count,
    current_count,
    greatest(p_max_count - current_count, 0);
end;
$$;

revoke all on public.edge_rate_limits from public, anon, authenticated;
grant select, insert, update on public.edge_rate_limits to service_role;
revoke all on function public.check_edge_rate_limit(text, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.check_edge_rate_limit(text, text, text, timestamptz, integer) to service_role;
