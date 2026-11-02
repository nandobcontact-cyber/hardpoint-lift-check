begin;
create schema if not exists private;
revoke all on schema private from public;
create table public.hlc_companies(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120));
create table public.hlc_members(user_id uuid primary key references auth.users(id), company_id uuid not null references public.hlc_companies, name text not null check(length(name) between 1 and 120), role text not null check(role in ('office','rigger','operator')));
create index on public.hlc_members(company_id);
create table public.hlc_projects(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.hlc_companies, name text not null check(length(name) between 1 and 160),location text not null default '',created_by uuid not null references public.hlc_members(user_id),created_at timestamptz not null default now());
create index on public.hlc_projects(company_id);
create table public.hlc_assignments(project_id uuid not null references public.hlc_projects,user_id uuid not null references public.hlc_members(user_id),primary key(project_id,user_id));
create index on public.hlc_assignments(user_id);
create table public.hlc_invites(token uuid primary key default gen_random_uuid(),company_id uuid not null references public.hlc_companies,role text not null check(role in ('rigger','operator','office')),created_by uuid not null references public.hlc_members(user_id),expires_at timestamptz not null default now()+interval '48 hours',used_by uuid references auth.users(id));
create table public.hlc_lifts(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.hlc_projects,created_by uuid not null references public.hlc_members(user_id),description text not null check(length(description) between 1 and 3000),crane text not null default '',created_at timestamptz not null default now());
create index on public.hlc_lifts(project_id);
create table public.hlc_photos(id uuid primary key default gen_random_uuid(),lift_id uuid not null references public.hlc_lifts,created_by uuid not null references public.hlc_members(user_id),path text not null unique,created_at timestamptz not null default now());
create index on public.hlc_photos(lift_id);

create function private.hlc_company() returns uuid language sql stable security definer set search_path='' as $$select company_id from public.hlc_members where user_id=auth.uid()$$;
create function private.hlc_office() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.hlc_members where user_id=auth.uid() and role='office')$$;
create function private.hlc_access(p uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.hlc_projects x where x.id=p and x.company_id=private.hlc_company() and (private.hlc_office() or exists(select 1 from public.hlc_assignments a where a.project_id=p and a.user_id=auth.uid())))$$;
grant usage on schema private to authenticated;
grant execute on function private.hlc_company(),private.hlc_office(),private.hlc_access(uuid) to authenticated;

alter table public.hlc_companies enable row level security;
alter table public.hlc_members enable row level security;
alter table public.hlc_projects enable row level security;
alter table public.hlc_assignments enable row level security;
alter table public.hlc_invites enable row level security;
alter table public.hlc_lifts enable row level security;
alter table public.hlc_photos enable row level security;
revoke all on public.hlc_companies,public.hlc_members,public.hlc_projects,public.hlc_assignments,public.hlc_invites,public.hlc_lifts,public.hlc_photos from anon,authenticated;
grant select on public.hlc_companies,public.hlc_members,public.hlc_projects,public.hlc_assignments,public.hlc_lifts,public.hlc_photos to authenticated;
create policy company_read on public.hlc_companies for select to authenticated using(id=private.hlc_company());
create policy members_read on public.hlc_members for select to authenticated using(company_id=private.hlc_company());
create policy projects_read on public.hlc_projects for select to authenticated using(private.hlc_access(id));
create policy assignments_read on public.hlc_assignments for select to authenticated using(private.hlc_access(project_id));
create policy lifts_read on public.hlc_lifts for select to authenticated using(private.hlc_access(project_id));
create policy photos_read on public.hlc_photos for select to authenticated using(exists(select 1 from public.hlc_lifts l where l.id=lift_id and private.hlc_access(l.project_id)));

create function public.hlc_create_company(company_name text,display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;begin
if auth.uid() is null then raise exception 'Log eerst in';end if;
if exists(select 1 from public.hlc_members where user_id=auth.uid()) then raise exception 'Account heeft al een bedrijf';end if;
insert into public.hlc_companies(name) values(trim(company_name)) returning id into c;
insert into public.hlc_members values(auth.uid(),c,trim(display_name),'office');return c;end$$;
create function public.hlc_create_invite(member_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid;begin
if not private.hlc_office() then raise exception 'Alleen kantoor';end if;
insert into public.hlc_invites(company_id,role,created_by) values(private.hlc_company(),member_role,auth.uid()) returning token into t;return t;end$$;
create function public.hlc_join(invite_token uuid,display_name text) returns void language plpgsql security definer set search_path='' as $$
declare i public.hlc_invites;begin
if auth.uid() is null then raise exception 'Log eerst in';end if;
select * into i from public.hlc_invites where token=invite_token and used_by is null and expires_at>now() for update;
if not found then raise exception 'Uitnodiging ongeldig of verlopen';end if;
insert into public.hlc_members values(auth.uid(),i.company_id,trim(display_name),i.role);
update public.hlc_invites set used_by=auth.uid() where token=i.token;end$$;
create function public.hlc_create_project(project_name text,project_location text) returns uuid language plpgsql security definer set search_path='' as $$
declare p uuid;begin
if not private.hlc_office() then raise exception 'Alleen kantoor';end if;
insert into public.hlc_projects(company_id,name,location,created_by) values(private.hlc_company(),trim(project_name),left(project_location,500),auth.uid()) returning id into p;return p;end$$;
create function public.hlc_assign(project uuid,member uuid,assigned boolean) returns void language plpgsql security definer set search_path='' as $$begin
if not private.hlc_office() or not private.hlc_access(project) then raise exception 'Geen toegang';end if;
if not exists(select 1 from public.hlc_members where user_id=member and company_id=private.hlc_company()) then raise exception 'Medewerker hoort niet bij dit bedrijf';end if;
if assigned then insert into public.hlc_assignments values(project,member) on conflict do nothing;
else delete from public.hlc_assignments where project_id=project and user_id=member;end if;end$$;
create function public.hlc_create_lift(project uuid,lift_description text,crane_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare l uuid;begin
if not private.hlc_access(project) then raise exception 'Geen toegang tot dit project';end if;
insert into public.hlc_lifts(project_id,created_by,description,crane) values(project,auth.uid(),trim(lift_description),left(crane_name,200)) returning id into l;return l;end$$;
create function public.hlc_add_photo(lift uuid,object_path text) returns void language plpgsql security definer set search_path='' as $$
declare p uuid;begin
select project_id into p from public.hlc_lifts where id=lift;
if p is null or not private.hlc_access(p) then raise exception 'Geen toegang';end if;
if split_part(object_path,'/',1)<>p::text or split_part(object_path,'/',2)<>lift::text or split_part(object_path,'/',3)<>auth.uid()::text then raise exception 'Ongeldig fotopad';end if;
if not exists(select 1 from storage.objects where bucket_id='hlc-photos' and name=object_path) then raise exception 'Foto ontbreekt';end if;
insert into public.hlc_photos(lift_id,created_by,path) values(lift,auth.uid(),object_path);end$$;

revoke execute on function public.hlc_create_company(text,text),public.hlc_create_invite(text),public.hlc_join(uuid,text),public.hlc_create_project(text,text),public.hlc_assign(uuid,uuid,boolean),public.hlc_create_lift(uuid,text,text),public.hlc_add_photo(uuid,text) from public,anon;
grant execute on function public.hlc_create_company(text,text),public.hlc_create_invite(text),public.hlc_join(uuid,text),public.hlc_create_project(text,text),public.hlc_assign(uuid,uuid,boolean),public.hlc_create_lift(uuid,text,text),public.hlc_add_photo(uuid,text) to authenticated;
revoke execute on function private.hlc_company(),private.hlc_office(),private.hlc_access(uuid) from public,anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('hlc-photos','hlc-photos',false,10485760,array['image/jpeg','image/png','image/webp']);
create function private.hlc_photo_access(object_path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare p uuid;l uuid;u uuid;begin
begin p:=split_part(object_path,'/',1)::uuid;l:=split_part(object_path,'/',2)::uuid;u:=split_part(object_path,'/',3)::uuid;exception when invalid_text_representation then return false;end;
return private.hlc_access(p) and exists(select 1 from public.hlc_lifts where id=l and project_id=p) and (not writing or u=auth.uid());end$$;
revoke execute on function private.hlc_photo_access(text,boolean) from public,anon;
grant execute on function private.hlc_photo_access(text,boolean) to authenticated;
create policy hlc_photo_read on storage.objects for select to authenticated using(bucket_id='hlc-photos' and private.hlc_photo_access(name,false));
create policy hlc_photo_insert on storage.objects for insert to authenticated with check(bucket_id='hlc-photos' and private.hlc_photo_access(name,true));
create policy hlc_photo_cleanup on storage.objects for delete to authenticated using(bucket_id='hlc-photos' and private.hlc_photo_access(name,true) and not exists(select 1 from public.hlc_photos where path=name));
commit;
