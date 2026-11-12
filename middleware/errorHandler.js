'use strict';
const config = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ message: 'API route not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Invalid data.' });
  if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use.' });
  console.error(`[error] ${req.method} ${req.path}:`, config.isProd ? err.message : err.stack);
  return res.status(500).json({ message: 'Something went wrong on the server.' });
}

module.exports = { notFound, errorHandler };
