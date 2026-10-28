-- التقييم المعروض = متوسط وعدد التقييمات المنشورة فعلًا، حتى يطابق ما يظهر في الصفحة والبيانات المنظمة
create or replace function public.refresh_place_rating(p_place uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.places p
     set rating_avg = coalesce(s.avg, 0),
         rating_count = coalesce(s.cnt, 0)
    from (
      select round(avg(rating)::numeric, 2) as avg, count(*)::int as cnt
        from public.reviews
       where place_id = p_place and not is_hidden
    ) s
   where p.id = p_place;
$$;

revoke all on function public.refresh_place_rating(uuid) from public, anon, authenticated;

create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_place_rating(old.place_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.place_id is distinct from old.place_id
      or new.rating is distinct from old.rating or new.is_hidden is distinct from old.is_hidden) then
    perform public.refresh_place_rating(new.place_id);
  end if;
  return null;
end;
$$;

revoke all on function public.reviews_refresh_rating() from public, anon, authenticated;

create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.reviews_refresh_rating();

-- مزامنة الأماكن الحالية
select public.refresh_place_rating(id) from public.places;
