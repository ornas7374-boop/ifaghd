-- مطبَّقة على مشروع kashta-platform على عدة دفعات:
-- profiles_column_update_only, disable_customer_booking_update_policy,
-- book_now_and_cancel_functions, booking_function_grants

-- 1) المستخدم يعدّل اسمه وجواله وصورته فقط، لا دوره (كان بإمكانه ترقية نفسه لمدير)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- 2) العميل لا يعدّل حجزه مباشرة (المبالغ والأوقات)؛ الإلغاء عبر cancel_my_booking
alter policy "customer updates own booking" on public.bookings using (false) with check (false);

-- 3) الحجز بدون دفع: إنشاء وتأكيد في عملية واحدة
create or replace function public.book_now(
  p_place_id uuid, p_rate_unit public.rate_unit, p_date date, p_duration integer,
  p_guests integer, p_start_time time default null, p_addon_ids uuid[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  v_result := public.create_booking(p_place_id, p_rate_unit, p_date, p_duration, p_guests, p_start_time, p_addon_ids);
  update bookings set status = 'confirmed', updated_at = now() where id = (v_result->>'id')::uuid;
  return v_result || jsonb_build_object('status', 'confirmed');
end; $$;

-- 4) إلغاء العميل لحجزه قبل موعده
create or replace function public.cancel_my_booking(p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  update bookings set status = 'cancelled', updated_at = now()
   where reference = p_reference and customer_id = auth.uid()
     and status in ('pending', 'confirmed') and booking_start > now()
  returning id into v_id;
  if v_id is null then raise exception 'CANNOT_CANCEL' using errcode = '22023'; end if;
  return jsonb_build_object('reference', p_reference, 'status', 'cancelled');
end; $$;

grant execute on function public.book_now(uuid, public.rate_unit, date, integer, integer, time, uuid[]) to authenticated;
grant execute on function public.cancel_my_booking(text) to authenticated;
revoke execute on function public.book_now(uuid, public.rate_unit, date, integer, integer, time, uuid[]) from public, anon;
revoke execute on function public.cancel_my_booking(text) from public, anon;
-- create_booking داخلية: تُستدعى من book_now فقط
revoke execute on function public.create_booking(uuid, public.rate_unit, date, integer, integer, time, uuid[]) from authenticated;
