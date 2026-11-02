-- Persoonlijk account: eigen hijslogboek, wagenpark en foto's per gebruiker.
-- Iedere gebruiker kan uitsluitend zijn eigen rijen en foto's lezen en schrijven.
begin;

create table if not exists public.hlc_user_items(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check(kind in ('lift','fleet','team','profile')),
  item_id text not null check(length(item_id) between 1 and 80),
  data jsonb not null default '{}'::jsonb check(pg_column_size(data) < 2000000),
  updated_at timestamptz not null default now(),
  primary key(user_id,kind,item_id)
);
alter table public.hlc_user_items enable row level security;
revoke all on public.hlc_user_items from anon;
grant select,insert,update,delete on public.hlc_user_items to authenticated;

drop policy if exists hlc_user_items_own on public.hlc_user_items;
create policy hlc_user_items_own on public.hlc_user_items for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hlc-user-photos','hlc-user-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

-- Pad: <user_id>/<bestandsnaam>
drop policy if exists hlc_user_photo_select on storage.objects;
drop policy if exists hlc_user_photo_insert on storage.objects;
drop policy if exists hlc_user_photo_delete on storage.objects;
create policy hlc_user_photo_select on storage.objects for select to authenticated
  using(bucket_id='hlc-user-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy hlc_user_photo_insert on storage.objects for insert to authenticated
  with check(bucket_id='hlc-user-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy hlc_user_photo_delete on storage.objects for delete to authenticated
  using(bucket_id='hlc-user-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

commit;
