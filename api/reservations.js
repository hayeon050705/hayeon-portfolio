const { saveReservation } = require('../backend/lib/reservationsStore');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
