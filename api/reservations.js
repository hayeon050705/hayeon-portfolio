const { saveReservation, listBookedSlots } = require('../backend/lib/reservationsStore');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 93;

// GET  /api/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD -> { booked: { date: [times] } } (no personal data)
// POST /api/reservations                               -> create a reservation
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const { from, to } = req.query;
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '') || from > to) {
      res.status(400).json({ error: 'from, to(YYYY-MM-DD) 범위를 확인해 주세요.' });
      return;
    }
    const spanDays = (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000;
    if (!(spanDays <= MAX_RANGE_DAYS)) {
      res.status(400).json({ error: `조회 범위는 최대 ${MAX_RANGE_DAYS}일입니다.` });
      return;
    }
    try {
      res.status(200).json({ booked: await listBookedSlots(from, to) });
    } catch (err) {
      console.error('availability lookup failed', err);
      res.status(500).json({ error: '예약 현황을 불러오지 못했습니다.' });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};

  // Hidden honeypot field: real visitors never fill it. Pretend success to bots.
  if (body.website) {
    res.status(201).json({ ok: true });
    return;
  }

  try {
    const saved = await saveReservation(body);
    res.status(201).json({ ok: true, id: saved.id });
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('reservation save failed', err);
    res.status(500).json({ error: '예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
};
