const { getAwards } = require('../backend/lib/store');

module.exports = async function handler(req, res) {
  try {
    const awards = await getAwards();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(awards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load awards' });
  }
};
