/**
 * Supabase 연결 점검:  node backend/db/check-connection.js
 * 열쇠 값은 화면에 출력하지 않고, 통과/실패만 알려 줍니다.
 */

const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '..', '.env.local')); } catch { /* .env.local 없음: 시스템 환경변수 사용 */ }

const { publicDb, adminDb } = require('../lib/supabase');

const TABLES = [
  'media_assets', 'site_profile', 'profile_facts', 'profile_skills', 'profile_education',
  'project_categories', 'projects', 'project_tags', 'awards', 'award_stats',
  'project_entries', 'reservations'
];

let failed = 0;
const ok = msg => console.log('  [통과]', msg);
const bad = msg => { failed++; console.log('  [실패]', msg); };

async function main() {
  console.log('1) 열쇠가 설정되어 있는지');
  const missing = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(n => !process.env[n]);
  if (missing.length) {
    bad('빠진 항목: ' + missing.join(', ') + '  → .env.local 에 추가해 주세요.');
    return;
  }
  ok('3개 모두 있음');

  const url = process.env.SUPABASE_URL;
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  const sec = process.env.SUPABASE_SECRET_KEY;
  /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) ? ok('URL 모양이 맞음') : bad('SUPABASE_URL 모양이 이상합니다 (예: https://abcdxyz.supabase.co, 뒤에 /rest 등을 붙이면 안 됨)');
  if (sec.startsWith('sb_publishable_')) bad('SUPABASE_SECRET_KEY 칸에 공개(publishable) 키가 들어갔습니다. 두 값이 바뀐 것 같아요.');
  else if (!sec.startsWith('sb_secret_') && !sec.startsWith('eyJ')) bad('SUPABASE_SECRET_KEY 는 보통 sb_secret_ 로 시작합니다.');
  else ok('비밀 키 모양이 맞음');
  if (pub.startsWith('sb_secret_')) bad('SUPABASE_PUBLISHABLE_KEY 칸에 비밀(secret) 키가 들어갔습니다. 바로 키를 새로 만들고 값을 바꾸세요.');
  else if (!pub.startsWith('sb_publishable_') && !pub.startsWith('eyJ')) bad('SUPABASE_PUBLISHABLE_KEY 는 보통 sb_publishable_ 로 시작합니다.');
  else ok('공개 키 모양이 맞음');
  if (failed) return;

  console.log('\n2) 비밀 키로 테이블 12개에 접근 (서버용)');
  for (const t of TABLES) {
    const { count, error } = await adminDb().from(t).select('*', { count: 'exact', head: true });
    error ? bad(`${t}: ${error.message}`) : ok(`${t}  (${count}건)`);
  }

  console.log('\n3) 공개 키로 공개 테이블 읽기 (방문자용)');
  for (const t of ['site_profile', 'projects', 'awards']) {
    const { error } = await publicDb().from(t).select('*', { count: 'exact', head: true });
    error ? bad(`${t}: ${error.message}`) : ok(`${t} 읽기 가능`);
  }

  console.log('\n4) 공개 키로 예약 테이블은 막혀 있어야 함 (개인정보 보호)');
  const { error: rErr } = await publicDb().from('reservations').select('id').limit(1);
  rErr ? ok('reservations 접근 거부됨 (정상)') : bad('reservations 가 공개 키로 열립니다! SQL ③ 을 확인하세요.');

  console.log('\n5) 예약된 시간 조회 함수 (개인정보 없음)');
  const { error: fErr } = await publicDb().rpc('booked_slots', { from_date: '2026-01-01', to_date: '2026-12-31' });
  fErr ? bad('booked_slots: ' + fErr.message) : ok('booked_slots 동작함');
}

main()
  .catch(err => bad('연결 오류: ' + err.message))
  .finally(() => {
    console.log(failed ? `\n결과: 실패 ${failed}건` : '\n결과: 모두 통과 — Supabase 연결 성공');
    process.exit(failed ? 1 : 0);
  });
