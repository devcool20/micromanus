-- MicroManus Database Schema SQL
-- Target: Supabase Postgres (run in SQL Editor)

-- 1. Enable UUID Extension if not enabled
create extension if not exists "uuid-ossp";

-- 2. Drop existing structures to ensure clean slate (if needed)
-- drop table if exists public.messages cascade;
-- drop table if exists public.chats cascade;
-- drop table if exists public.api_keys cascade;
-- drop table if exists public.profiles cascade;
-- drop table if exists public.coupons cascade;

-- 3. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  credits numeric(10,4) not null default 0.0000,
  status text not null default 'free' check (status in ('free','active','banned')),
  created_at timestamptz not null default now()
);

-- 4. API Keys Table (BYO OpenRouter/LLM Keys)
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,                       -- e.g. 'openrouter' | 'openai' | 'custom'
  model text not null,                          -- e.g. 'gpt-5', 'claude-sonnet-4-20250514'
  endpoint text not null,                       -- e.g. 'https://openrouter.ai/api/v1'
  encrypted_key text not null,                  -- AES-256-GCM ciphertext
  label text,                                   -- Custom label for key
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Chats Table
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  model text not null,                          -- e.g. 'claude-sonnet-4-20250514'
  api_key_id uuid references public.api_keys(id) on delete set null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  tokens_input integer not null default 0,
  tokens_cached integer not null default 0,
  tokens_output integer not null default 0,
  cost_usd numeric(12,6) not null default 0.000000,
  artifact_url text,                            -- PDF link if generated
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Messages Table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text,                                 -- Markdown content or tool parameters
  tool_name text,                               -- Populated if role is 'tool'
  created_at timestamptz not null default now()
);

-- 7. Coupons Table
create table public.coupons (
  code text primary key,
  credits_granted numeric(10,4) not null default 5.0000,
  max_redemptions integer,                      -- null = unlimited
  redeemed_count integer not null default 0,
  active boolean not null default true
);

-- Pre-populate SID_DRDROID Coupon code
insert into public.coupons (code, credits_granted, max_redemptions, redeemed_count, active)
values ('SID_DRDROID', 5.0000, null, 0, true)
on conflict (code) do update set active = true, credits_granted = 5.0000;

-- 8. Postgres Trigger for New User Creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, credits, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    0.0000,
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution binding
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. Row Level Security (RLS) Configuration
alter table public.profiles enable row level security;
alter table public.api_keys enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.coupons enable row level security;

-- Policies for profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Policies for api_keys
create policy "Users can view own api keys" on public.api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert own api keys" on public.api_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can update own api keys" on public.api_keys
  for update using (auth.uid() = user_id);

create policy "Users can delete own api keys" on public.api_keys
  for delete using (auth.uid() = user_id);

-- Policies for chats
create policy "Users can view own chats" on public.chats
  for select using (auth.uid() = user_id);

create policy "Users can insert own chats" on public.chats
  for insert with check (auth.uid() = user_id);

create policy "Users can update own chats" on public.chats
  for update using (auth.uid() = user_id);

create policy "Users can delete own chats" on public.chats
  for delete using (auth.uid() = user_id);

-- Policies for messages
create policy "Users can view messages in own chats" on public.messages
  for select using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own chats" on public.messages
  for insert with check (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id and chats.user_id = auth.uid()
    )
  );

create policy "Users can update messages in own chats" on public.messages
  for update using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id and chats.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in own chats" on public.messages
  for delete using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id and chats.user_id = auth.uid()
    )
  );

-- Policies for coupons (all authenticated users can read, only service-role can edit/insert)
create policy "Any authed user can read coupons" on public.coupons
  for select using (auth.role() = 'authenticated');
