const { requireAuth } = require('../../backend/lib/auth');
const { listAllEntries, saveEntry } = require('../../backend/lib/entriesStore');

module.exports = requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    const entries = await listAllEntries();
    res.status(200).json(entries);
    return;
  }

  if (req.method === 'POST') {
    try {
      const saved = await saveEntry(req.body || {});
      res.status(201).json(saved);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
