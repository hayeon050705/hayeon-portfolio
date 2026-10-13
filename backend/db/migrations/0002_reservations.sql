-- 0002: 방문 예약

create type reservation_status as enum ('pending', 'confirmed', 'cancelled');

create table reservations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 50),
  email         text not null check (
                  char_length(email) <= 100
                  and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$'),
  purpose       text not null check (char_length(purpose) between 1 and 1000),
  visit_date    date not null,
  visit_time    time not null,
  status        reservation_status not null default 'pending',
  consented_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 평일만, 13:00~18:00, 30분 단위
  check (extract(isodow from visit_date) between 1 and 5),
  check (visit_time between time '13:00' and time '18:00'
         and extract(minute from visit_time) in (0, 30)
         and extract(second from visit_time) = 0)
);
create trigger reservations_updated before update on reservations
  for each row execute function set_updated_at();

-- 같은 날짜+시간에는 취소되지 않은 예약이 1건만 (중복 예약 방지)
create unique index reservations_active_slot
  on reservations (visit_date, visit_time) where status <> 'cancelled';

create index reservations_status_idx on reservations (status, visit_date);

-- 개인정보 없이 "예약된 시간"만 공개하는 함수
create function booked_slots(from_date date, to_date date)
returns table (visit_date date, visit_time time)
language sql stable security definer set search_path = public as $$
  select r.visit_date, r.visit_time
  from reservations r
  where r.status <> 'cancelled' and r.visit_date between from_date and to_date
  order by r.visit_date, r.visit_time;
$$;
revoke all on function booked_slots(date, date) from public;
grant execute on function booked_slots(date, date) to anon, authenticated, service_role;
