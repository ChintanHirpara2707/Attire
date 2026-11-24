-- Attire: initial schema, row-level security and the private "clothes" bucket.
-- Every row belongs to auth.uid() (anonymous users have the authenticated role).

-- ---------- Tables ----------

create table public.profiles (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  avatar     text,
  pin_hash   text,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id    uuid not null,
  name          text not null default '',
  category      text,
  season        text,
  color_name    text,
  color_hex     text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  image_path    text,
  original_path text,
  created_at    timestamptz not null default now(),
  unique (id, owner_id),
  -- profile must belong to the same owner
  foreign key (profile_id, owner_id) references public.profiles (id, owner_id) on delete cascade
);

create table public.outfits (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null,
  name       text not null default '',
  favorite   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (profile_id, owner_id) references public.profiles (id, owner_id) on delete cascade
);

create table public.outfit_items (
  outfit_id uuid not null,
  item_id   uuid not null,
  owner_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (outfit_id, item_id),
  foreign key (outfit_id, owner_id) references public.outfits (id, owner_id) on delete cascade,
  foreign key (item_id, owner_id) references public.items (id, owner_id) on delete cascade
);

create index profiles_owner_id_idx     on public.profiles (owner_id);
create index items_owner_id_idx        on public.items (owner_id);
create index items_profile_id_idx      on public.items (profile_id);
create index outfits_owner_id_idx      on public.outfits (owner_id);
create index outfits_profile_id_idx    on public.outfits (profile_id);
create index outfit_items_owner_id_idx on public.outfit_items (owner_id);
create index outfit_items_item_id_idx  on public.outfit_items (item_id);

-- ---------- Privileges: signed-in users only ----------

revoke all on table public.profiles, public.items, public.outfits, public.outfit_items from anon, authenticated;
grant select, insert, update, delete
  on table public.profiles, public.items, public.outfits, public.outfit_items to authenticated;

-- ---------- Row-level security ----------

alter table public.profiles     enable row level security;
alter table public.items        enable row level security;
alter table public.outfits      enable row level security;
alter table public.outfit_items enable row level security;

create policy "owner select" on public.profiles for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.profiles for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete" on public.profiles for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owner select" on public.items for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.items for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.items for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete" on public.items for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owner select" on public.outfits for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.outfits for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.outfits for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete" on public.outfits for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owner select" on public.outfit_items for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.outfit_items for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.outfit_items for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete" on public.outfit_items for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------- Storage: private "clothes" bucket, one folder per user ----------
-- Object paths must start with the user's id: <auth.uid()>/<profile_id>/<file>.png

insert into storage.buckets (id, name, public)
values ('clothes', 'clothes', false)
on conflict (id) do nothing;

create policy "clothes owner select" on storage.objects for select to authenticated
  using (bucket_id = 'clothes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "clothes owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'clothes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "clothes owner update" on storage.objects for update to authenticated
  using (bucket_id = 'clothes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'clothes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "clothes owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'clothes' and (storage.foldername(name))[1] = (select auth.uid())::text);
