-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default now()
);

alter table users enable row level security;

-- Service role policies (backend)
create policy "Service role kan skrive brugere"
  on users for insert
  to service_role with check (true);

create policy "Service role kan opdatere brugere"
  on users for update
  to service_role using (true);

create policy "Service role kan slette brugere"
  on users for delete
  to service_role using (true);

-- Authenticated policies (admin)
create policy "Admin kan læse brugere"
  on users for select
  to authenticated using (true);

-- Polls table
create table if not exists polls (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  dates text[] not null,
  created_by uuid not null references users(id),
  created_at timestamp with time zone default now()
);

alter table polls enable row level security;

-- Service role policies (backend)
create policy "Service role kan skrive afstemninger"
  on polls for insert
  to service_role with check (true);

create policy "Service role kan opdatere afstemninger"
  on polls for update
  to service_role using (true);

create policy "Service role kan slette afstemninger"
  on polls for delete
  to service_role using (true);

-- Authenticated policies (read-only for admin)
create policy "Authenticated kan læse afstemninger"
  on polls for select
  to authenticated using (true);

-- Votes table
create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid not null references polls(id) on delete cascade,
  user_id uuid not null references users(id),
  selected_dates text[] not null,
  created_at timestamp with time zone default now(),
  unique(poll_id, user_id)
);

alter table votes enable row level security;

-- Service role policies (backend)
create policy "Service role kan skrive stemmer"
  on votes for insert
  to service_role with check (true);

create policy "Service role kan opdatere stemmer"
  on votes for update
  to service_role using (true);

create policy "Service role kan slette stemmer"
  on votes for delete
  to service_role using (true);

-- Authenticated policies (read-only for admin)
create policy "Authenticated kan læse stemmer"
  on votes for select
  to authenticated using (true);
