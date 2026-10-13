-- 0003: 공개 / 비공개 규칙 (Row Level Security)

alter table media_assets        enable row level security;
alter table site_profile        enable row level security;
alter table profile_facts       enable row level security;
alter table profile_skills      enable row level security;
alter table profile_education   enable row level security;
alter table project_categories  enable row level security;
alter table projects            enable row level security;
alter table project_tags        enable row level security;
alter table awards              enable row level security;
alter table award_stats         enable row level security;
alter table project_entries     enable row level security;
alter table reservations        enable row level security;   -- 정책을 만들지 않음 = 공개 접근 전부 차단

-- 공개 읽기 규칙 (is_published = true 인 행만 보임)
create policy "public read" on site_profile       for select to anon, authenticated using (true);
create policy "public read" on project_categories for select to anon, authenticated using (true);
create policy "public read" on profile_facts      for select to anon, authenticated using (is_published);
create policy "public read" on profile_skills     for select to anon, authenticated using (is_published);
create policy "public read" on profile_education  for select to anon, authenticated using (is_published);
create policy "public read" on projects           for select to anon, authenticated using (is_published);
create policy "public read" on awards             for select to anon, authenticated using (is_published);
create policy "public read" on award_stats        for select to anon, authenticated using (is_published);
create policy "public read" on project_entries    for select to anon, authenticated using (status = 'published');
create policy "public read" on media_assets       for select to anon, authenticated using (bucket = 'portfolio-media');
create policy "public read" on project_tags       for select to anon, authenticated
  using (exists (select 1 from projects p where p.id = project_tags.project_id and p.is_published));

-- 권한 정리: 공개 키(anon)는 읽기만, 예약 테이블은 아예 접근 불가
revoke all on all tables in schema public from anon, authenticated;
grant select on site_profile, project_categories, profile_facts, profile_skills, profile_education,
                projects, project_tags, awards, award_stats, project_entries, media_assets
  to anon, authenticated;

-- 서버용 비밀 키(service_role)는 전체 접근
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
