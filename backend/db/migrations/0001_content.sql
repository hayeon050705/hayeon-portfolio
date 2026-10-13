-- 0001: 사이트 내용 테이블 (소개 / 프로젝트 / 수상 / 프로젝트 로그 / 파일 정보)

-- updated_at 자동 갱신 함수
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 파일 정보 (실제 파일은 Supabase Storage, 여기에는 위치/종류만)
create table media_assets (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null check (bucket in ('portfolio-media', 'private-docs')),
  path        text not null,
  kind        text not null check (kind in ('image', 'video', 'doc')),
  mime_type   text,
  size_bytes  bigint,
  alt_text    text,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

-- 소개: 사이트 공통 정보 (항상 1행만)
create table site_profile (
  id                  smallint primary key default 1 check (id = 1),
  kicker              text,
  hero_desc           text,
  hero_media_id       uuid references media_assets(id) on delete set null,
  cover_caption_left  text,
  cover_caption_right text,
  about_quote         text,
  about_body          text[] not null default '{}',
  contact_email       text,
  contact_hint        text,
  contact_info_line   text[] not null default '{}',
  updated_at          timestamptz not null default now()
);
create trigger site_profile_updated before update on site_profile
  for each row execute function set_updated_at();

-- 소개: Name / Born / Major / Email 같은 한 줄 정보
create table profile_facts (
  id            bigint generated always as identity primary key,
  label         text not null,
  value         text not null,
  href          text,
  sort_order    int not null default 0,
  is_published  boolean not null default true
);

create table profile_skills (
  id            bigint generated always as identity primary key,
  name          text not null,
  sort_order    int not null default 0,
  is_published  boolean not null default true
);

create table profile_education (
  id                    bigint generated always as identity primary key,
  name                  text not null,
  sub                   text,
  period                text,
  is_current            boolean not null default false,
  certificate_media_id  uuid references media_assets(id) on delete set null,
  sort_order            int not null default 0,
  is_published          boolean not null default true
);

-- 프로젝트 쇼케이스
create table project_categories (
  slug        text primary key,
  label       text not null,
  sort_order  int not null default 0
);

create table projects (
  id             text primary key,                -- 예: 'urban-forest'
  category_slug  text not null references project_categories(slug),
  idx            text,                            -- 화면 번호 '01', '02' ...
  title          text not null,
  modal_title    text,
  modal_meta     text,
  media_type     text not null default 'image' check (media_type in ('image', 'video', 'research')),
  media_id       uuid references media_assets(id) on delete set null,
  alt_text       text,
  description    text,
  meta_category  text,
  meta_year      text,
  badge          text,
  sort_order     int not null default 0,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger projects_updated before update on projects
  for each row execute function set_updated_at();

create table project_tags (
  id          bigint generated always as identity primary key,
  project_id  text not null references projects(id) on delete cascade,
  tag         text not null,
  sort_order  int not null default 0
);
create index project_tags_project_idx on project_tags (project_id);

-- 수상
create table awards (
  id            bigint generated always as identity primary key,
  year          text not null,                    -- '2024–2026' 같은 범위도 있어 text
  title         text not null,
  org           text,
  description   text,
  badge         text,
  sort_order    int not null default 0,
  is_published  boolean not null default true
);

create table award_stats (
  id            bigint generated always as identity primary key,
  value         text not null,                    -- '1', '3rd' 등
  label         text not null,
  sort_order    int not null default 0,
  is_published  boolean not null default true
);

-- 프로젝트 로그 (관리자가 입력하는 항목)
create table project_entries (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default '',
  role            text not null default '',
  description     text not null default '',
  period_text     text not null default '',
  team_size_text  text not null default '',
  notes           text not null default '',
  status          text not null default 'draft' check (status in ('draft', 'published')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger project_entries_updated before update on project_entries
  for each row execute function set_updated_at();
