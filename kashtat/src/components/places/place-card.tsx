import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { RATE_UNIT_LABEL, type PlaceCard as PlaceCardData } from "@/lib/db/places";
import { formatSar } from "@/lib/money";
import { FavoriteButton } from "./favorite-button";

// شارة «مميز» للأماكن ذات التقييم العالي
const FEATURED_RATING = 4.8;

/** query: معاملات الحجز من البحث (تاريخ، نوع، عدد) تُمرَّر لصفحة المكان */
export function PlaceCard({ place, query = "" }: { place: PlaceCardData; query?: string }) {
  return (
    <article className="tilt flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised">
      <div className="relative flex h-[180px] items-end justify-center overflow-hidden bg-surface-overlay text-ink-muted">
        {place.cover ? (
          <Image
            src={place.cover.src}
            alt={place.cover.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            className="object-cover"
          />
        ) : (
          <>
            <svg
              width="100%"
              height="110"
              viewBox="0 0 300 110"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0"
            >
              <path d="M0 70 Q60 30 120 62 T240 52 T300 60 V110 H0z" fill="var(--border)" />
              <path
                d="M0 92 Q80 60 160 88 T300 80 V110 H0z"
                fill="var(--surface-raised)"
                opacity=".7"
              />
            </svg>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium">
              صورة المكان
            </span>
          </>
        )}
        {place.rating >= FEATURED_RATING && (
          <span className="absolute start-3 top-3 rounded-pill bg-sand-subtle px-2.5 py-0.5 text-caption font-semibold text-sand">
            مميز
          </span>
        )}
        <FavoriteButton placeName={place.title} />
      </div>
      <div className="flex grow flex-col gap-2.5 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[18px] leading-7 font-bold">{place.title}</h3>
          {place.ratingCount > 0 && (
            <span className="text-body-sm font-semibold whitespace-nowrap">
              <span aria-hidden="true">★ </span>
              <span className="sr-only">التقييم </span>
              {place.rating.toFixed(1)}
            </span>
          )}
        </div>
        <span className="text-body-sm text-ink-muted">
          {place.city} · حتى {place.capacityMax} شخص
        </span>
        {place.amenities.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="المرافق">
            {place.amenities.slice(0, 3).map((a) => (
              <li
                key={a}
                className="rounded-pill border border-border-strong px-2.5 py-px text-caption text-ink-muted"
              >
                {a}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          {place.price ? (
            <span className="text-[18px] font-bold">
              {formatSar(place.price.amount)}{" "}
              <span className="text-body-sm font-normal text-ink-muted">
                / {RATE_UNIT_LABEL[place.price.unit]}
              </span>
            </span>
          ) : (
            <span />
          )}
          <ButtonLink
            href={`/places/${place.slug}${query}`}
            size="sm"
            className="h-11 sm:h-10"
            aria-label={`احجز ${place.title}`}
          >
            احجز
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
