/**
 * Persistence for visit reservations (Vercel Blob, private store).
 *
 * - `reservations/<id>.json`          one record per reservation (names/emails, admin-only).
 * - `reservation-slots/<date>_<HHMM>.json`  one "lock" per booked date+time slot.
 *
 * A slot can hold only one active (pending/confirmed) reservation. The lock is
 * created with `allowOverwrite: false`, which the Blob store enforces atomically:
 * when several requests race for the same slot exactly one create succeeds and
 * the rest get a 409. Cancelling a reservation deletes its lock, freeing the slot.
 * The lock pathname alone encodes date+time, so availability can be listed
 * without reading any personal data.
 */

const { put, list, get, del } = require('@vercel/blob');
const crypto = require('crypto');

const PREFIX = 'reservations/';
const SLOT_PREFIX = 'reservation-slots/';
const STATUSES = ['pending', 'confirmed', 'cancelled'];
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const TIME_SLOTS = [];
for (let h = 13; h <= 18; h++) {
  for (const m of [0, 30]) {
    if (h === 18 && m === 30) continue;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}
const validationError = message => httpError(400, message);
const notFoundError = () => httpError(404, '예약을 찾을 수 없습니다.');
const slotTakenError = () => httpError(409, '이미 예약이 완료된 시간입니다. 다른 시간을 선택해 주세요.');

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

/* ---------- slot locks ---------- */

function slotPath(date, time) {
  return `${SLOT_PREFIX}${date}_${time.replace(':', '')}.json`;
}

function isAlreadyExists(err) {
  return /already exists/i.test((err && err.message) || '');
}

async function readJSON(pathname) {
  let result = null;
  try {
    result = await get(pathname, { access: 'private', useCache: false });
  } catch (e) {
    return null;
  }
  if (!result || !result.stream) return null;
  return JSON.parse(await new Response(result.stream).text());
}

/** Take the slot for `reservationId`. Returns true if newly created, false if it already belonged to it. */
async function claimSlot(date, time, reservationId) {
  const pathname = slotPath(date, time);
  try {
    await put(pathname, JSON.stringify({ reservationId, date, time, claimedAt: new Date().toISOString() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json'
    });
    return true;
  } catch (err) {
    if (!isAlreadyExists(err)) throw err;
    const owner = await readJSON(pathname);
    if (owner && owner.reservationId === reservationId) return false;
    throw slotTakenError();
  }
}

/** Free the slot, but only if it is still held by `reservationId`. */
async function releaseSlot(date, time, reservationId) {
  const pathname = slotPath(date, time);
  const owner = await readJSON(pathname);
  if (!owner || owner.reservationId !== reservationId) return;
  await del(pathname);
}

async function listAllBlobs(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, access: 'private', cursor });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** Booked times per date within [from, to] (inclusive) — no personal data. */
async function listBookedSlots(from, to) {
  const blobs = await listAllBlobs(SLOT_PREFIX);
  const booked = {};
  for (const b of blobs) {
    const m = b.pathname.slice(SLOT_PREFIX.length).match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})\.json$/);
    if (!m) continue;
    const date = m[1];
    if (date < from || date > to) continue;
    (booked[date] = booked[date] || []).push(`${m[2]}:${m[3]}`);
  }
  Object.keys(booked).forEach(d => booked[d].sort());
  return booked;
}

/* ---------- reservations ---------- */

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

  await claimSlot(data.date, data.time, id);

  try {
    await put(`${PREFIX}${id}.json`, JSON.stringify(reservation), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
  } catch (err) {
    await releaseSlot(data.date, data.time, id).catch(() => {});
    throw err;
  }

  return reservation;
}

async function listReservations() {
  const blobs = await listAllBlobs(PREFIX);
  const items = await Promise.all(blobs.map(b => readJSON(b.pathname)));
  return items
    .filter(Boolean)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

async function updateReservationStatus(id, status) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw notFoundError();
  if (!STATUSES.includes(status)) throw validationError('상태 값이 올바르지 않습니다.');

  const pathname = `${PREFIX}${id}.json`;
  const current = await readJSON(pathname);
  if (!current) throw notFoundError();

  const becomesActive = status !== 'cancelled';
  let claimedNow = false;
  if (becomesActive) {
    // Reactivating a cancelled reservation must win the slot again; fails with 409 if someone else took it.
    claimedNow = await claimSlot(current.date, current.time, current.id);
  }

  const updated = { ...current, status, updatedAt: new Date().toISOString() };
  try {
    await put(pathname, JSON.stringify(updated), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });
  } catch (err) {
    if (claimedNow) await releaseSlot(current.date, current.time, current.id).catch(() => {});
    throw err;
  }

  // Release after the record is saved; running again for an already-cancelled one is a harmless retry.
  if (!becomesActive) await releaseSlot(current.date, current.time, current.id);

  return updated;
}

module.exports = {
  saveReservation, listReservations, updateReservationStatus, listBookedSlots,
  validateReservation, TIME_SLOTS, STATUSES
};
