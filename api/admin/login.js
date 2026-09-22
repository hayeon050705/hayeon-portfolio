const { checkPassword, createSessionToken, setSessionCookie } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body || {};
  if (!checkPassword(password)) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }

  setSessionCookie(req, res, createSessionToken());
  res.status(200).json({ ok: true });
};
