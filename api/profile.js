const { getProfile } = require('../backend/lib/store');

module.exports = async function handler(req, res) {
  try {
    const profile = await getProfile();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
};
