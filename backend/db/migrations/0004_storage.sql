-- 0004: 파일 보관함 (이미 만드셨다면 그대로 두고 넘어갑니다)
insert into storage.buckets (id, name, public) values
  ('portfolio-media', 'portfolio-media', true),    -- 사진/영상: 공개
  ('private-docs',    'private-docs',    false)    -- 재학증명서: 비공개 (임시 링크로만 열람)
on conflict (id) do nothing;
