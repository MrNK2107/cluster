-- Create public.workspaces table for unstructured documents and clusters
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.workspaces enable row level security;

-- Row Level Security policies
create policy "Users can manage their own workspace" on public.workspaces
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
