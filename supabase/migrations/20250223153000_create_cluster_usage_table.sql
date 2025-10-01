create table if not exists public.cluster_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cluster_usage_unique_per_day unique (user_id, usage_date)
);

create index if not exists cluster_usage_user_date_idx on public.cluster_usage (user_id, usage_date);

create or replace function public.set_cluster_usage_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cluster_usage_updated_at
before update on public.cluster_usage
for each row
execute function public.set_cluster_usage_updated_at();
