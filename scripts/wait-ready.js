'use strict';
// Waits until the backend answers /api/health (max ~60 s). Exit 0 = ready, 1 = timeout.
const http = require('http');
const { PORT } = require('../config/env');

const deadline = Date.now() + 60000;
function probe() {
  const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health', timeout: 2000 }, (res) => {
    res.resume();
    if (res.statusCode === 200) process.exit(0);
    retry();
  });
  req.on('error', retry);
  req.on('timeout', () => { req.destroy(); retry(); });
}
function retry() {
  if (Date.now() > deadline) { console.error('Server did not become ready in 60 seconds.'); process.exit(1); }
  setTimeout(probe, 700);
}
probe();
