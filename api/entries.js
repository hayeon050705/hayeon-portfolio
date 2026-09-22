const { listPublishedEntries } = require('../backend/lib/entriesStore');

module.exports = async function handler(req, res) {
  try {
    const entries = await listPublishedEntries();
    res.status(200).json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load entries' });
  }
};
