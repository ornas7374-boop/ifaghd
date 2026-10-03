"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

// محلي فقط حتى ربط الحسابات في المرحلة 5
export function FavoriteButton({ placeName }: { placeName: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`أضف ${placeName} إلى المفضلة`}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "absolute end-2.5 top-2.5 grid size-11 cursor-pointer place-items-center rounded-pill bg-surface-raised transition-colors hover:bg-surface-overlay",
        on ? "text-danger" : "text-ink",
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
      </svg>
    </button>
  );
}
