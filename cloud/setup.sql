-- LAB PVGAS Services – cơ sở dữ liệu đồng bộ trên Supabase (NGOC chọn 01/11/2026).
-- Cách dùng: Supabase › SQL Editor › New query › dán toàn bộ file này › Run. Chạy lại nhiều lần không sao.
-- Quyền (giống app): cấp 0 = chờ Trưởng phòng duyệt tài khoản (không đọc được gì); 1 Kiểm định viên; 2 Người kiểm soát; 3 Trưởng phòng / Quản trị.
-- Người đăng ký ĐẦU TIÊN tự thành cấp 3; người sau là cấp 0 cho tới khi cấp 3 nâng quyền trong app (Cài đặt › Người dùng).
-- 10/11/2026 (NGOC): đăng nhập bằng ID "ten.hotenlot" + PIN như bản PIN trên máy. Tài khoản do cấp 3 tạo (mục 6, hàm admin_create_user),
-- không tự đăng ký. Bên trong, ID được đổi thành email nội bộ <id>@lab-pvgas.local (không gửi thư, chỉ để Supabase nhận dạng).

-- 1. Hồ sơ người dùng ------------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text not null default '',
  role int not null default 0 check (role between 0 and 3),
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists login text;                              -- ID đăng nhập, vd ngoc.nm
alter table public.profiles add column if not exists must_change boolean not null default false; -- phải đổi PIN ở lần đăng nhập đầu

create or replace function public.my_role() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 0)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, login, must_change)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''),
          case when not exists (select 1 from public.profiles) then 3 else 0 end,
          split_part(new.email, '@', 1), coalesce((new.raw_user_meta_data->>'must_change')::boolean, false))
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

-- 6. Tạo tài khoản / đặt lại PIN (10/11/2026) -------------------------------------------------------------------
-- Gọi được từ app (chỉ cấp 3) hoặc từ SQL Editor của Supabase. Không cần khoá service_role.
create or replace function public.lab_domain() returns text language sql immutable as $$ select 'lab-pvgas.local' $$;

create or replace function public.admin_create_user(p_login text, p_name text, p_role int, p_pin text)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_id uuid; v_email text;
begin
  -- auth.role() rỗng = đang chạy trong SQL Editor (chủ dự án); gọi từ app thì phải là cấp 3
  if auth.role() is not null and public.my_role() < 3 then raise exception 'Chỉ cấp 3 được tạo tài khoản'; end if;
  p_login := lower(trim(p_login)); p_name := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if p_login !~ '^[a-z]+(\.[a-z]+)?[0-9]*$' then raise exception 'ID không đúng dạng ten.hotenlot: %', p_login; end if;
  if p_name = '' then raise exception 'Thiếu họ tên của %', p_login; end if;
  if p_role is null or p_role not between 0 and 3 then raise exception 'Cấp phải từ 0 đến 3'; end if;
  v_email := p_login || '@' || public.lab_domain();
  select id into v_id from auth.users where email = v_email;
  if v_id is not null then   -- đã có: chỉ cập nhật họ tên và cấp, giữ PIN
    update public.profiles set name = p_name, role = p_role, login = p_login where id = v_id;
    return v_id;
  end if;
  if length(coalesce(p_pin, '')) < 6 then raise exception 'PIN ít nhất 6 ký tự (%)', p_login; end if;
  v_id := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          crypt(p_pin, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('name', p_name, 'must_change', true), now(), now(),
          '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());
  update public.profiles set name = p_name, role = p_role, login = p_login, must_change = true where id = v_id;
  return v_id;
end $$;

create or replace function public.admin_set_pin(p_user uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if auth.role() is not null and public.my_role() < 3 then raise exception 'Chỉ cấp 3 được đặt lại PIN'; end if;
  if length(coalesce(p_pin, '')) < 6 then raise exception 'PIN ít nhất 6 ký tự'; end if;
  update auth.users set encrypted_password = crypt(p_pin, gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'Không thấy tài khoản'; end if;
  update public.profiles set must_change = true where id = p_user;
end $$;

-- người dùng tự đổi PIN xong thì bỏ cờ "phải đổi PIN"
create or replace function public.my_pin_changed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change = false where id = auth.uid()
$$;

revoke all on function public.admin_create_user(text, text, int, text) from public, anon;
revoke all on function public.admin_set_pin(uuid, text) from public, anon;
revoke all on function public.my_pin_changed() from public, anon;
grant execute on function public.admin_create_user(text, text, int, text) to authenticated;
grant execute on function public.admin_set_pin(uuid, text) to authenticated;
grant execute on function public.my_pin_changed() to authenticated;

-- 7. Quyền bảng cho Data API (cấp tường minh, để app vẫn chạy kể cả khi tắt "Automatically expose new tables").
-- RLS ở trên vẫn quyết định ai đọc / ghi được dòng nào; khách chưa đăng nhập (anon) không đọc được gì.
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.records to authenticated;
grant select, insert, update on public.shared to authenticated;

-- 8. Luồng duyệt 2 bước + phân quyền xem hồ sơ (10/11/2026, app v49) -------------------------------------------
-- Cấp 1/2 chỉ đọc / sửa hồ sơ mình nhập và hồ sơ được chuyển tới mình (cột viewers); cấp 3 xem tất cả.
-- Chỉ cấp 3 được ghi bước "final" (sau đó mới in / tải); cấp 1 không được duyệt, không được xoá (như cũ).
alter table public.records add column if not exists viewers uuid[] not null default '{}';
create index if not exists records_viewers on public.records using gin (viewers);

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
  if public.my_role() < 3 and new.data->'final' is not null and new.data->'final' <> 'null'::jsonb
     and (tg_op = 'INSERT' or (new.data->'final') is distinct from (old.data->'final')) then
    raise exception 'Chỉ cấp 3 được duyệt final';
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop policy if exists "rec read" on public.records;
create policy "rec read" on public.records for select to authenticated using (
  public.my_role() >= 3 or (public.my_role() >= 1 and (owner = auth.uid() or auth.uid() = any(viewers))));
drop policy if exists "rec insert" on public.records;
create policy "rec insert" on public.records for insert to authenticated with check (
  public.my_role() >= 3 or (public.my_role() >= 1 and owner = auth.uid()));
drop policy if exists "rec update" on public.records;
create policy "rec update" on public.records for update to authenticated
  using (public.my_role() >= 3 or (public.my_role() >= 1 and (owner = auth.uid() or auth.uid() = any(viewers))))
  with check (public.my_role() >= 3 or (public.my_role() >= 1 and (owner = auth.uid() or auth.uid() = any(viewers))));

-- 9. Số GCN / số tem duy nhất toàn hệ thống (10/11/2026, app v51) --------------------------------------------
-- Một số GCN (CN.PT.26.2301…) chỉ được dùng cho 1 hồ sơ. Người dùng không xem được hồ sơ của người khác, nên app hỏi máy chủ:
-- cert_next = số lớn nhất đã cấp trong dải (để chạy số tiếp), cert_who = số này đã dùng cho thiết bị nào, ai nhập, đang ở bước nào.
-- Hồ sơ không đạt không có số. Nếu trên máy chủ đã có số trùng từ trước, bước cuối báo lỗi kèm danh sách số trùng
-- (2 hàm tra số vẫn được tạo): gửi ảnh lỗi cho Claude để xử lý rồi chạy lại.
create or replace function public.cert_next(p_pre text, p_lo int, p_hi int, p_id text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(t), 0)::int from (
    select nullif(regexp_replace(substr(upper(trim(data->>'certNo')), length(p_pre) + 1), '[^0-9].*$', ''), '')::bigint t
    from public.records
    where not deleted and upper(trim(data->>'certNo')) like upper(p_pre) || '%' and id <> coalesce(p_id, '')
      and public.my_role() >= 1
  ) s where t between p_lo and p_hi
$$;

create or replace function public.cert_who(p_no text, p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'tag', data#>>'{h,tag}', 'owner', data#>>'{owner,name}', 'type', data->>'type',
    'stage', case when coalesce(data->'final', 'null') <> 'null' then 'Đã duyệt final'
                  when coalesce(data->'approved', 'null') <> 'null' and coalesce(data->>'flow2', 'false') <> 'true' then 'Đã duyệt'
                  when coalesce(data->'approved', 'null') <> 'null' then 'Chờ duyệt final'
                  when coalesce(data->'submitted', 'null') <> 'null' then 'Chờ kiểm soát'
                  else 'Đang nhập (chưa chuyển duyệt)' end)
  from public.records
  where not deleted and upper(trim(data->>'certNo')) = upper(trim(p_no)) and id <> coalesce(p_id, '')
    and public.my_role() >= 1
  limit 1
$$;

revoke all on function public.cert_next(text, int, int, text) from public, anon;
revoke all on function public.cert_who(text, text) from public, anon;
grant execute on function public.cert_next(text, int, int, text) to authenticated;
grant execute on function public.cert_who(text, text) to authenticated;

do $$
declare d text;
begin
  select string_agg(k || ' (' || n || ' hồ sơ)', ', ') into d from (
    select upper(trim(data->>'certNo')) k, count(*) n from public.records
    where not deleted and coalesce(trim(data->>'certNo'), '') <> '' group by 1 having count(*) > 1) x;
  if d is not null then raise exception 'Đã có số GCN trùng trên máy chủ, chưa bật chặn trùng: %', d; end if;
end $$;
create unique index if not exists records_certno_uq on public.records (upper(trim(data->>'certNo')))
  where not deleted and coalesce(trim(data->>'certNo'), '') <> '';

-- 10. Dải số dùng chung mọi loại (10/11/2026, app v52) ------------------------------------------------------
-- NGOC: PT, PS, TT… dùng chung dải; đuôi số đã cấp cho loại này thì loại khác không được dùng lại trong cùng năm
-- (CN.PS.26.2301 có rồi thì không có CN.PT.26.2301). Khoá so trùng = CN.<năm>.<đuôi>; số khác dạng (PG N256…) so nguyên chuỗi.
create or replace function public.cert_key(p text) returns text language sql immutable as $$
  select case when upper(trim(p)) ~ '^CN\.[A-Z]+\.[0-9]{2}\.[0-9]+$'
    then 'CN.' || split_part(upper(trim(p)), '.', 3) || '.' || split_part(upper(trim(p)), '.', 4)::bigint
    else upper(trim(p)) end
$$;

-- p_pre bây giờ là "CN.26." (dải chung) hoặc tiền tố PG.
create or replace function public.cert_next(p_pre text, p_lo int, p_hi int, p_id text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(t), 0)::int from (
    select nullif(regexp_replace(substr(public.cert_key(data->>'certNo'), length(p_pre) + 1), '[^0-9].*$', ''), '')::bigint t
    from public.records
    where not deleted and public.cert_key(data->>'certNo') like upper(p_pre) || '%' and id <> coalesce(p_id, '')
      and public.my_role() >= 1
  ) s where t between p_lo and p_hi
$$;

create or replace function public.cert_who(p_no text, p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'no', data->>'certNo', 'tag', data#>>'{h,tag}', 'owner', data#>>'{owner,name}', 'type', data->>'type',
    'stage', case when coalesce(data->'final', 'null') <> 'null' then 'Đã duyệt final'
                  when coalesce(data->'approved', 'null') <> 'null' and coalesce(data->>'flow2', 'false') <> 'true' then 'Đã duyệt'
                  when coalesce(data->'approved', 'null') <> 'null' then 'Chờ duyệt final'
                  when coalesce(data->'submitted', 'null') <> 'null' then 'Chờ kiểm soát'
                  else 'Đang nhập (chưa chuyển duyệt)' end)
  from public.records
  where not deleted and coalesce(trim(data->>'certNo'), '') <> ''
    and public.cert_key(data->>'certNo') = public.cert_key(p_no) and id <> coalesce(p_id, '')
    and public.my_role() >= 1
  limit 1
$$;

-- Các đuôi số đã dùng trong một năm (cho bảng "Số còn trống theo site"). Chỉ trả số, không trả hồ sơ.
create or replace function public.cert_used(p_pool text)
returns int[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct t order by t), '{}') from (
    select nullif(regexp_replace(substr(public.cert_key(data->>'certNo'), length(p_pool) + 1), '[^0-9].*$', ''), '')::int t
    from public.records
    where not deleted and public.cert_key(data->>'certNo') like upper(p_pool) || '%' and public.my_role() >= 1
  ) s where t is not null
$$;
revoke all on function public.cert_used(text) from public, anon;
grant execute on function public.cert_used(text) to authenticated;

do $$
declare d text;
begin
  select string_agg(k || ' (' || n || ' hồ sơ)', ', ') into d from (
    select public.cert_key(data->>'certNo') k, count(*) n from public.records
    where not deleted and coalesce(trim(data->>'certNo'), '') <> '' group by 1 having count(*) > 1) x;
  if d is not null then raise exception 'Đã có đuôi số trùng giữa các loại thiết bị, chưa bật chặn chung: %', d; end if;
end $$;
create unique index if not exists records_certkey_uq on public.records (public.cert_key(data->>'certNo'))
  where not deleted and coalesce(trim(data->>'certNo'), '') <> '';
drop index if exists public.records_certno_uq;
