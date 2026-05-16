alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));
alter table public.profiles add column if not exists is_suspended boolean not null default false;

revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url, cover_url) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.set_profile_suspension(target_user_id uuid, suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'cannot suspend self';
  end if;

  update public.profiles
  set is_suspended = suspended
  where id = target_user_id
    and role <> 'admin';
end;
$$;

grant execute on function public.set_profile_suspension(uuid, boolean) to authenticated;

drop policy if exists "admins read all posts" on public.posts;
create policy "admins read all posts" on public.posts
for select using (public.is_admin());

drop policy if exists "admins moderate posts" on public.posts;
create policy "admins moderate posts" on public.posts
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports
for select using (public.is_admin());

drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_suspended = false
  )
);

drop policy if exists "users follow as self" on public.follows;
create policy "users follow as self" on public.follows
for insert with check (
  auth.uid() = follower_id
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_suspended = false
  )
);

drop policy if exists "users react as self" on public.reactions;
create policy "users react as self" on public.reactions
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_suspended = false
  )
);

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'urawahawarau@gmail.com'
);
