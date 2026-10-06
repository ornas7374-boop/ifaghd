-- مطبَّقة على kashta-platform: admin_functions, admin_report_function
-- كل الدوال تتحقق من is_admin() داخليًا، ومقفلة على anon

create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, phone text, role public.user_role, is_active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.is_active, p.created_at
      from profiles p left join auth.users u on u.id = p.id
     order by p.created_at desc limit 500;
end; $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'CANNOT_DEMOTE_SELF' using errcode = '22023'; end if;
  update profiles set role = p_role, updated_at = now() where id = p_user;
end; $$;

create or replace function public.admin_set_place_status(p_place uuid, p_status public.listing_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  update places
     set status = p_status,
         published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end,
         updated_at = now()
   where id = p_place;
end; $$;

create or replace function public.admin_report()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  with b as (
    select bk.*, to_char(bk.booking_start at time zone 'Asia/Riyadh', 'YYYY-MM') as ym, c.name_ar as city
      from bookings bk join places p on p.id = bk.place_id join cities c on c.id = p.city_id
     where bk.source = 'customer' and bk.status <> 'cancelled'
  )
  select jsonb_build_object(
    'months', coalesce((select jsonb_agg(m order by m->>'month') from (
        select jsonb_build_object('month', ym, 'count', count(*), 'gross', sum(total_amount), 'commission', sum(commission_amount)) m
          from b where booking_start >= date_trunc('month', now() at time zone 'Asia/Riyadh') - interval '5 months'
         group by ym) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(c order by (c->>'gross')::bigint desc) from (
        select jsonb_build_object('city', city, 'count', count(*), 'gross', sum(total_amount)) c from b group by city) y), '[]'::jsonb),
    'totals', (select jsonb_build_object('count', count(*), 'gross', coalesce(sum(total_amount), 0), 'commission', coalesce(sum(commission_amount), 0)) from b),
    'cancelled', (select count(*) from bookings where source = 'customer' and status = 'cancelled'),
    'places', (select jsonb_object_agg(status, n) from (select status, count(*) n from places group by status) z),
    'users', (select jsonb_object_agg(role, n) from (select role, count(*) n from profiles group by role) u)
  ) into v;
  return v;
end; $$;

revoke execute on function public.admin_users() from public, anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_set_place_status(uuid, public.listing_status) from public, anon;
revoke execute on function public.admin_report() from public, anon;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_place_status(uuid, public.listing_status) to authenticated;
grant execute on function public.admin_report() to authenticated;
