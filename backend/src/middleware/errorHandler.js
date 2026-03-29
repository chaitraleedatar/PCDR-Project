'use strict';
const { NODE_ENV } = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, NODE_ENV === 'development' ? err.stack : '');

  const status = err.status || err.statusCode || 500;
  const body = {
    error: err.code || 'internal_error',
    message: status < 500 ? err.message : 'An internal error occurred',
  };

  if (NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
