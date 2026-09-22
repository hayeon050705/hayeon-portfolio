const { requireAuth } = require('../../../backend/lib/auth');
const { getEntry, saveEntry } = require('../../../backend/lib/entriesStore');

module.exports = requireAuth(async (req, res) => {
  const { id } = req.query;

  if (req.method === 'GET') {
    const entry = await getEntry(id);
    if (!entry) {
      res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json(entry);
    return;
  }

  if (req.method === 'PUT') {
    try {
      const saved = await saveEntry({ ...req.body, id });
      res.status(200).json(saved);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
