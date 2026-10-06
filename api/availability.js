const { listBookedSlots } = require('../backend/lib/reservationsStore');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 93;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
};
