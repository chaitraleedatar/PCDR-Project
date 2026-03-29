'use strict';

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'insufficient_role', required: roles });
    }
    next();
  };
}

module.exports = { requireRole };
