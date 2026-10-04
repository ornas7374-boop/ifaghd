-- مطبَّقة على kashta-platform: guard_place_changes, reviews_require_completed_booking,
-- bookings_update_columns_only, host_bookings_function
-- (بيانات تجريبية: 4 أماكن جديدة و36 صورة في listing_images أُضيفت عبر SQL مباشرة)

-- 1) المالك لا ينشر مكانه بنفسه ولا يغيّر تقييمه؛ النشر بموافقة الأدمن
create or replace function public.guard_place_changes()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending') then new.status := 'pending'; end if;
    new.rating_avg := 0; new.rating_count := 0; new.published_at := null;
  else
    if new.status is distinct from old.status and new.status not in ('draft', 'pending') then
      raise exception 'STATUS_CHANGE_NOT_ALLOWED' using errcode = '42501';
    end if;
    new.rating_avg := old.rating_avg; new.rating_count := old.rating_count;
    new.published_at := old.published_at; new.host_id := old.host_id;
  end if;
  return new;
end;
$$;
create trigger places_guard_changes before insert or update on public.places
  for each row execute function public.guard_place_changes();

-- 2) التقييم فقط من صاحب حجز مكتمل لنفس المكان، وتقييم واحد لكل حجز
alter policy "author writes own review" on public.reviews
  with check (
    author_id = auth.uid() and booking_id is not null
    and exists (select 1 from public.bookings b
                 where b.id = reviews.booking_id and b.customer_id = auth.uid()
                   and b.status = 'completed' and b.place_id = reviews.place_id)
  );
create unique index if not exists reviews_one_per_booking on public.reviews (booking_id) where booking_id is not null;

-- 3) تعديل الحجوزات: الحالة وأوقات الدخول والخروج الفعلية فقط
revoke update on public.bookings from anon, authenticated;
grant update (status, actual_check_in, actual_check_out, updated_at) on public.bookings to authenticated;

-- 4) حجوزات أماكن المالك مع اسم وجوال الحاجز
create or replace function public.host_bookings()
returns table (reference text, status public.booking_status, source public.booking_source,
  place_slug text, place_title text, booking_start timestamptz, booking_end timestamptz,
  guests integer, total_amount bigint, commission_amount bigint, customer_name text, customer_phone text)
language sql stable security definer set search_path = public as $$
  select b.reference, b.status, b.source, p.slug, p.title_ar, b.booking_start, b.booking_end,
         b.guests, b.total_amount, b.commission_amount, pr.full_name, pr.phone
    from bookings b join places p on p.id = b.place_id
    left join profiles pr on pr.id = b.customer_id
   where b.host_id = auth.uid()
   order by b.booking_start desc limit 200;
$$;
revoke execute on function public.host_bookings() from public, anon;
grant execute on function public.host_bookings() to authenticated;
