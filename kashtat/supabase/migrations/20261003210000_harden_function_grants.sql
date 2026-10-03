-- مطبَّقة على مشروع kashta-platform (oxsvckojqphiunldgenp)
-- دالة المشغّل لا تُستدعى عبر API أبدًا
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- إنشاء الحجز للمسجلين فقط
revoke execute on function public.create_booking(uuid, public.rate_unit, date, integer, integer, time, uuid[]) from public, anon;
grant execute on function public.create_booking(uuid, public.rate_unit, date, integer, integer, time, uuid[]) to authenticated;
