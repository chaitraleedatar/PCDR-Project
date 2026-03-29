'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const url = require('url');

/**
 * Authenticate a WebSocket upgrade request.
 * Token is passed as a query param: ws://host/ws?token=<JWT>
 * Returns the user payload or throws.
 */
function authenticateWs(request) {
  const { query: qs } = url.parse(request.url, true);
  const token = qs.token;
  if (!token) {
    throw Object.assign(new Error('missing_token'), { code: 4001 });
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw Object.assign(new Error('invalid_token'), { code: 4001 });
  }
}

module.exports = { authenticateWs };
