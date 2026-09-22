const { clearSessionCookie } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  clearSessionCookie(req, res);
  res.status(200).json({ ok: true });
};
