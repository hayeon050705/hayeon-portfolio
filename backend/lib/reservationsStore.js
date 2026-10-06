/**
 * Persistence for visit reservations (Vercel Blob, private store).
 *
 * One JSON file per reservation under `reservations/`. The store is private,
 * so names/emails are never reachable by URL — they can only be read through
 * the auth-gated /api/admin/reservations endpoint.
 */

const { put, list, get } = require('@vercel/blob');
const crypto = require('crypto');

const PREFIX = 'reservations/';
const STATUSES = ['pending', 'confirmed', 'cancelled'];
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const TIME_SLOTS = [];
for (let h = 13; h <= 18; h++) {
  for (const m of [0, 30]) {
    if (h === 18 && m === 30) continue;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function todayInSeoul() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function validateReservation(input) {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const purpose = String(input.purpose || '').trim();
  const date = String(input.date || '').trim();
  const time = String(input.time || '').trim();

  if (!name || name.length > 50) throw validationError('이름을 확인해 주세요.');
  if (!email || email.length > 100 || !EMAIL_RE.test(email)) throw validationError('이메일 형식이 올바르지 않습니다.');
  if (!purpose || purpose.length > 1000) throw validationError('방문 목적을 확인해 주세요.');
  if (input.consent !== true) throw validationError('정보 제공에 동의해 주세요.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw validationError('날짜를 확인해 주세요.');
  const dt = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== date) throw validationError('날짜를 확인해 주세요.');
  const dow = dt.getUTCDay();
  if (dow === 0 || dow === 6) throw validationError('평일만 예약할 수 있습니다.');
  if (date <= todayInSeoul()) throw validationError('내일 이후 날짜만 예약할 수 있습니다.');

  if (!TIME_SLOTS.includes(time)) throw validationError('희망 시간을 확인해 주세요.');

  return { name, email, purpose, date, time };
}

async function saveReservation(input) {
  const data = validateReservation(input);
  const id = crypto.randomUUID();
  const reservation = {
    id,
    ...data,
    consent: true,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await put(`${PREFIX}${id}.json`, JSON.stringify(reservation), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json'
  });

  return reservation;
}

async function listReservations() {
  const { blobs } = await list({ prefix: PREFIX, access: 'private' });
  const items = await Promise.all(blobs.map(async b => {
    const result = await get(b.pathname, { access: 'private', useCache: false });
    if (!result || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text());
  }));
  return items
    .filter(Boolean)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

async function updateReservationStatus(id, status) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) {
    const err = new Error('예약을 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }
  if (!STATUSES.includes(status)) throw validationError('상태 값이 올바르지 않습니다.');

  const pathname = `${PREFIX}${id}.json`;
  let result = null;
  try {
    result = await get(pathname, { access: 'private', useCache: false });
  } catch (e) {
    result = null;
  }
  if (!result || !result.stream) {
    const err = new Error('예약을 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }

  const current = JSON.parse(await new Response(result.stream).text());
  const updated = { ...current, status, updatedAt: new Date().toISOString() };
  await put(pathname, JSON.stringify(updated), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
  return updated;
}

module.exports = { saveReservation, listReservations, updateReservationStatus, validateReservation, TIME_SLOTS, STATUSES };
