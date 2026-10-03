// بيانات عرض من التصميم. تُستبدل ببيانات Supabase في المرحلة 3.
export type FeaturedPlace = {
  slug: string;
  name: string;
  where: string;
  rating: string;
  price: number;
  unit: "الساعة" | "اليوم" | "الليلة";
  tags: string[];
  featured: boolean;
};

export const FEATURED_PLACES: FeaturedPlace[] = [
  {
    slug: "wadi-camp",
    name: "مخيم الوادي",
    where: "العلا · 3 كم عن المركز",
    rating: "4.8",
    price: 450,
    unit: "الليلة",
    tags: ["موقد", "إضاءة", "جلسات"],
    featured: true,
  },
  {
    slug: "oasis-rest-house",
    name: "استراحة الواحة",
    where: "الرياض · 45 كم",
    rating: "4.5",
    price: 120,
    unit: "الساعة",
    tags: ["مكيف", "بلايستيشن"],
    featured: false,
  },
  {
    slug: "nafud-kashta",
    name: "كشتة النفود",
    where: "حائل · طريق النفود",
    rating: "4.7",
    price: 300,
    unit: "اليوم",
    tags: ["مشب", "خيمة", "رواق"],
    featured: true,
  },
  {
    slug: "rimal-chalet",
    name: "شاليه الرمال",
    where: "الثمامة · 20 كم",
    rating: "4.6",
    price: 650,
    unit: "الليلة",
    tags: ["مسبح", "ثلاجة", "بروجكتر"],
    featured: false,
  },
];
