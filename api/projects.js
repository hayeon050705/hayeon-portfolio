const { getProjects } = require('../backend/lib/store');

module.exports = async function handler(req, res) {
  try {
    const projects = await getProjects();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
};
