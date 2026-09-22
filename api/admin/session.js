const { isAuthenticated } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  res.status(200).json({ authenticated: isAuthenticated(req) });
};
