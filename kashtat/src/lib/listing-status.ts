import type { StatusTone } from "@/lib/booking-status";

// مطابقة لنوع listing_status في قاعدة البيانات
export type ListingStatus = "draft" | "pending" | "published" | "rejected" | "suspended";

export const LISTING_STATUS_META: Record<ListingStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  pending: { label: "بانتظار المراجعة", tone: "warning" },
  published: { label: "منشور", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  suspended: { label: "موقوف", tone: "danger" },
};
