/** رسائل أخطاء دوال الحجز في قاعدة البيانات بالعربي */
export function bookingErrorMessage(message: string): string {
  const map: Record<string, string> = {
    AUTH_REQUIRED: "سجّل دخولك أولًا",
    INVALID_DURATION: "المدة غير صحيحة",
    PLACE_UNAVAILABLE: "المكان غير متاح للحجز حاليًا",
    GUESTS_OUT_OF_RANGE: "عدد الأشخاص خارج سعة المكان",
    INVALID_WINDOW: "وقت الحجز غير صحيح",
    PAST_DATE: "الموعد المختار مضى، اختر وقتًا لاحقًا",
    RATE_UNIT_UNAVAILABLE: "نوع الحجز هذا غير متاح لهذا المكان",
    SLOT_TAKEN: "الوقت محجوز مسبقًا، اختر وقتًا آخر",
    CANNOT_CANCEL: "ما يمكن إلغاء هذا الحجز (موعده بدأ أو ملغي مسبقًا)",
  };
  const key = Object.keys(map).find((k) => message.includes(k));
  return key ? map[key] : "صار خطأ غير متوقع، حاول مرة ثانية";
}
