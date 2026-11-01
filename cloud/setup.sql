-- LAB PVGAS Services – cơ sở dữ liệu đồng bộ trên Supabase (NGOC chọn 01/11/2026).
-- Cách dùng: Supabase › SQL Editor › New query › dán toàn bộ file này › Run. Chạy lại nhiều lần không sao.
-- Quyền (giống app): cấp 0 = chờ Trưởng phòng duyệt tài khoản (không đọc được gì); 1 Kiểm định viên; 2 Người kiểm soát; 3 Trưởng phòng / Quản trị.
-- Người đăng ký ĐẦU TIÊN tự thành cấp 3; người sau là cấp 0 cho tới khi cấp 3 nâng quyền trong app (Cài đặt › Người dùng).

-- 1. Hồ sơ người dùng ------------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text not null default '',
  role int not null default 0 check (role between 0 and 3),
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 0)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''),
          case when not exists (select 1 from public.profiles) then 3 else 0 end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.my_role() >= 3) with check (public.my_role() >= 3);

-- 2. Hồ sơ hiệu chuẩn (mỗi dòng = 1 hồ sơ của app, nội dung JSON) ---------------------------------------------
create table if not exists public.records (
  id text primary key,
  owner uuid,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists records_updated_at on public.records (updated_at);

-- Chặn ở máy chủ: cấp 1 không được tự duyệt, không được xoá. updated_at do máy chủ đặt (dùng để kéo phần thay đổi).
create or replace function public.guard_records() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() < 2 then
    if new.deleted then raise exception 'Chỉ cấp 2/3 được xoá hồ sơ'; end if;
    if new.data->'approved' is not null and new.data->'approved' <> 'null'::jsonb
       and (tg_op = 'INSERT' or (new.data->'approved') is distinct from (old.data->'approved')) then
      raise exception 'Cấp 1 không được duyệt hồ sơ';
    end if;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists records_guard on public.records;
create trigger records_guard before insert or update on public.records
  for each row execute function public.guard_records();

alter table public.records enable row level security;
drop policy if exists "rec read" on public.records;
create policy "rec read" on public.records for select to authenticated using (public.my_role() >= 1);
drop policy if exists "rec insert" on public.records;
create policy "rec insert" on public.records for insert to authenticated
  with check (public.my_role() >= 2 or (public.my_role() >= 1 and owner = auth.uid()));
drop policy if exists "rec update" on public.records;
create policy "rec update" on public.records for update to authenticated
  using (public.my_role() >= 2 or (public.my_role() >= 1 and owner = auth.uid()))
  with check (public.my_role() >= 2 or (public.my_role() >= 1 and owner = auth.uid()));

-- 3. Dữ liệu chung: thư viện chuẩn (stands) và Cài đặt (settings) – chỉ cấp 3 sửa ----------------------------
create table if not exists public.shared (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create or replace function public.touch_shared() returns trigger
language plpgsql as $$ begin new.updated_at := clock_timestamp(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists shared_touch on public.shared;
create trigger shared_touch before insert or update on public.shared for each row execute function public.touch_shared();

alter table public.shared enable row level security;
drop policy if exists "shared read" on public.shared;
create policy "shared read" on public.shared for select to authenticated using (public.my_role() >= 1);
drop policy if exists "shared write" on public.shared;
create policy "shared write" on public.shared for insert to authenticated with check (public.my_role() >= 3);
drop policy if exists "shared update" on public.shared;
create policy "shared update" on public.shared for update to authenticated
  using (public.my_role() >= 3) with check (public.my_role() >= 3);

-- 4. Ảnh bằng chứng (kho riêng tư, chỉ người đã được cấp quyền mới xem) -------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists "photos read" on storage.objects;
create policy "photos read" on storage.objects for select to authenticated using (bucket_id = 'photos' and public.my_role() >= 1);
drop policy if exists "photos insert" on storage.objects;
create policy "photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.my_role() >= 1);
drop policy if exists "photos update" on storage.objects;
create policy "photos update" on storage.objects for update to authenticated using (bucket_id = 'photos' and public.my_role() >= 1);

-- 5. Báo thay đổi tức thì (hồ sơ mới / Chờ duyệt hiện ngay trên máy khác) -----------------------------------
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; when undefined_object then null; end $$;
