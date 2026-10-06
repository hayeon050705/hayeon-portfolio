const { requireAuth } = require('../../backend/lib/auth');
const { listReservations } = require('../../backend/lib/reservationsStore');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    res.status(200).json(await listReservations());
  } catch (err) {
    console.error('reservation list failed', err);
    res.status(500).json({ error: '예약 목록을 불러오지 못했습니다.' });
  }
});
