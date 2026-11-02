begin;
alter table public.hlc_companies add column account_type text not null default 'company' check(account_type in ('solo','company'));
create function private.hlc_create_workspace(workspace_type text,workspace_name text,display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;begin
if workspace_type not in ('solo','company') or workspace_type is null then raise exception 'Kies Zelfstandig of Bedrijf';end if;
c:=private.hlc_create_company(workspace_name,display_name);
update public.hlc_companies set account_type=workspace_type where id=c;return c;end$$;
revoke execute on function private.hlc_create_workspace(text,text,text) from public,anon;
grant execute on function private.hlc_create_workspace(text,text,text) to authenticated;
create function public.hlc_create_workspace(workspace_type text,workspace_name text,display_name text) returns uuid language sql security invoker set search_path='' as $$select private.hlc_create_workspace(workspace_type,workspace_name,display_name)$$;
revoke execute on function public.hlc_create_workspace(text,text,text) from public,anon;
grant execute on function public.hlc_create_workspace(text,text,text) to authenticated;
create or replace function private.hlc_create_invite(member_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid;begin
if not private.hlc_office() then raise exception 'Alleen kantoor';end if;
if not exists(select 1 from public.hlc_companies where id=private.hlc_company() and account_type='company') then raise exception 'Medewerkers toevoegen is beschikbaar met een bedrijfsaccount';end if;
insert into public.hlc_invites(company_id,role,created_by) values(private.hlc_company(),member_role,auth.uid()) returning token into t;return t;end$$;
create table public.hlc_fleet(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.hlc_companies,manufacturer text not null check(length(manufacturer) between 1 and 120),model text not null check(length(model) between 1 and 160),label text not null default '' check(length(label)<=120),created_by uuid not null references public.hlc_members(user_id),created_at timestamptz not null default now());
create index on public.hlc_fleet(company_id);
alter table public.hlc_fleet enable row level security;
revoke all on public.hlc_fleet from anon,authenticated;
grant select on public.hlc_fleet to authenticated;
create policy fleet_read on public.hlc_fleet for select to authenticated using(company_id=private.hlc_company());
create function private.hlc_add_crane(crane_make text,crane_model text,crane_label text) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;begin
if not private.hlc_office() then raise exception 'Alleen de eigenaar of kantoor kan kranen toevoegen';end if;
insert into public.hlc_fleet(company_id,manufacturer,model,label,created_by) values(private.hlc_company(),trim(crane_make),trim(crane_model),trim(crane_label),auth.uid()) returning id into c;return c;end$$;
revoke execute on function private.hlc_add_crane(text,text,text) from public,anon;
grant execute on function private.hlc_add_crane(text,text,text) to authenticated;
create function public.hlc_add_crane(crane_make text,crane_model text,crane_label text) returns uuid language sql security invoker set search_path='' as $$select private.hlc_add_crane(crane_make,crane_model,crane_label)$$;
revoke execute on function public.hlc_add_crane(text,text,text) from public,anon;
grant execute on function public.hlc_add_crane(text,text,text) to authenticated;
commit;