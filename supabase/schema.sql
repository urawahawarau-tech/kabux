create extension if not exists "pgcrypto";

do $$
begin
  create type public.reaction_type as enum ('useful', 'noise');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  image_urls text[] not null default '{}',
  quoted_post_id uuid references public.posts(id) on delete set null,
  reply_to_post_id uuid references public.posts(id) on delete set null,
  impression_count integer not null default 0 check (impression_count >= 0),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body <> '' or array_length(image_urls, 1) > 0)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  type public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_reply_to_idx on public.posts (reply_to_post_id);
create index if not exists posts_quoted_idx on public.posts (quoted_post_id);
create index if not exists reactions_post_id_idx on public.reactions (post_id);
create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.posts, public.follows, public.reactions to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.follows to authenticated;
grant insert, update, delete on public.reactions to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert on public.reports to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
for select using (true);

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "visible posts are readable" on public.posts;
create policy "visible posts are readable" on public.posts
for select using (is_hidden = false);

drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts
for insert with check (auth.uid() = user_id);

drop policy if exists "users update own posts" on public.posts;
create policy "users update own posts" on public.posts
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts
for delete using (auth.uid() = user_id);

drop policy if exists "follows are readable" on public.follows;
create policy "follows are readable" on public.follows
for select using (true);

drop policy if exists "users follow as self" on public.follows;
create policy "users follow as self" on public.follows
for insert with check (auth.uid() = follower_id);

drop policy if exists "users unfollow as self" on public.follows;
create policy "users unfollow as self" on public.follows
for delete using (auth.uid() = follower_id);

drop policy if exists "reactions are readable" on public.reactions;
create policy "reactions are readable" on public.reactions
for select using (true);

drop policy if exists "users react as self" on public.reactions;
create policy "users react as self" on public.reactions
for insert with check (auth.uid() = user_id);

drop policy if exists "users remove own reactions" on public.reactions;
create policy "users remove own reactions" on public.reactions
for delete using (auth.uid() = user_id);

drop policy if exists "users update own reactions" on public.reactions;
create policy "users update own reactions" on public.reactions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users read own bookmarks" on public.bookmarks;
create policy "users read own bookmarks" on public.bookmarks
for select using (auth.uid() = user_id);

drop policy if exists "users create own bookmarks" on public.bookmarks;
create policy "users create own bookmarks" on public.bookmarks
for insert with check (auth.uid() = user_id);

drop policy if exists "users remove own bookmarks" on public.bookmarks;
create policy "users remove own bookmarks" on public.bookmarks
for delete using (auth.uid() = user_id);

drop policy if exists "users create own reports" on public.reports;
create policy "users create own reports" on public.reports
for insert with check (auth.uid() = user_id);

drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports
for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 1048576, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post images are public" on storage.objects;
create policy "post images are public" on storage.objects
for select using (bucket_id = 'post-images');

drop policy if exists "users upload own post images" on storage.objects;
create policy "users upload own post images" on storage.objects
for insert with check (
  bucket_id = 'post-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own post images" on storage.objects;
create policy "users update own post images" on storage.objects
for update using (
  bucket_id = 'post-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own post images" on storage.objects;
create policy "users delete own post images" on storage.objects
for delete using (
  bucket_id = 'post-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
