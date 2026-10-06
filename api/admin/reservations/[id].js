const { requireAuth } = require('../../../backend/lib/auth');
const { updateReservationStatus } = require('../../../backend/lib/reservationsStore');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const updated = await updateReservationStatus(req.query.id, (req.body || {}).status);
    res.status(200).json(updated);
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('reservation status update failed', err);
    res.status(500).json({ error: '상태를 변경하지 못했습니다.' });
  }
});
