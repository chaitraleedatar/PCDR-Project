'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const redis = require('../config/redis');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function signTokens(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ ...payload, jti: uuidv4() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters' });
    }
    // Only students can self-register
    const role = 'student';
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, role',
      [username.trim(), email.trim().toLowerCase(), passwordHash, role]
    );
    const user = rows[0];
    const { accessToken, refreshToken } = signTokens(user);
    // Store refresh token in Redis
    await redis.setex(`refresh:${user.id}:${refreshToken.split('.')[2].slice(0, 20)}`, 7 * 24 * 3600, refreshToken);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'username_or_email_taken' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const { rows } = await query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email=$1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const { accessToken, refreshToken } = signTokens(user);
    await redis.setex(`refresh:${user.id}:${refreshToken.split('.')[2].slice(0, 20)}`, 7 * 24 * 3600, refreshToken);
    res.json({
      user: { id: user.id, username: user.username, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'missing_token' });
    }
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    // Check Redis
    const keys = await redis.keys(`refresh:${payload.id}:*`);
    const stored = await Promise.all(keys.map(k => redis.get(k)));
    if (!stored.includes(refreshToken)) {
      return res.status(401).json({ error: 'token_revoked' });
    }
    const { rows } = await query('SELECT id, username, role FROM users WHERE id=$1', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'user_not_found' });
    const newAccess = jwt.sign(
      { id: rows[0].id, username: rows[0].username, role: rows[0].role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ accessToken: newAccess });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'invalid_token' });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const payload = jwt.decode(refreshToken);
        if (payload && payload.id) {
          const keys = await redis.keys(`refresh:${payload.id}:*`);
          if (keys.length) await redis.del(...keys);
        }
      } catch (_) { /* ignore decode errors on logout */ }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
