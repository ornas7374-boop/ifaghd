-- sadu reference image library
-- Stores METADATA and AI-derived descriptions, not the image files:
--   * images stay at their source (hotlinked) and are credited, as the source licenses require
--   * Row Level Security is enabled with NO policies: the Supabase Data API (anon/authenticated)
--     cannot read or write anything. Only the collector (direct database role) can.

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists reference_images (
  id               uuid primary key default gen_random_uuid(),
  source           text not null check (source in ('unsplash','pexels','manual','generated')),
  source_id        text not null,
  page_url         text not null,
  image_url        text not null,
  width            integer,
  height           integer,
  photographer     text,
  photographer_url text,
  license          text not null,
  license_url      text,
  attribution_required boolean not null default true,
  description      text,

  dhash            bigint,                       -- 64-bit perceptual hash (duplicate detection)
  duplicate_of     uuid references reference_images(id) on delete set null,

  status           text not null default 'accepted'
                   check (status in ('accepted','rejected','broken')),
  reject_reason    text,

  room             text,
  room_confidence  real,
  style            text,
  is_interior      boolean,
  quality          real,                         -- 0..1 from the vision model
  relevance        real,                         -- 0..1 ranking score
  analysis         jsonb not null default '{}'::jsonb,   -- objects, materials, colors, lighting, architecture, camera

  query_text       text,
  collected_at     timestamptz not null default now(),
  checked_at       timestamptz,
  last_http_status integer,

  unique (source, source_id)
);

create index if not exists reference_images_rank_idx
  on reference_images (room, style, relevance desc) where status = 'accepted';
create index if not exists reference_images_status_idx on reference_images (status);
create index if not exists reference_images_dhash_idx on reference_images (dhash) where dhash is not null;
create index if not exists reference_images_checked_idx on reference_images (checked_at nulls first) where status = 'accepted';

-- Search queries and their pagination cursor: lets every run continue where the last one stopped.
create table if not exists collection_queries (
  id          bigserial primary key,
  source      text not null,
  query       text not null,
  room_hint   text,
  next_page   integer not null default 1,
  exhausted   boolean not null default false,
  total_seen  integer not null default 0,
  last_run_at timestamptz,
  unique (source, query)
);

-- Cache of API responses (avoids repeat calls and protects rate limits).
create table if not exists api_cache (
  cache_key  text primary key,
  response   jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists collection_runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  options     jsonb not null default '{}'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  errors      jsonb not null default '[]'::jsonb,
  status      text not null default 'running' check (status in ('running','completed','partial','failed'))
);

alter table reference_images  enable row level security;
alter table collection_queries enable row level security;
alter table api_cache          enable row level security;
alter table collection_runs    enable row level security;
alter table schema_migrations  enable row level security;
