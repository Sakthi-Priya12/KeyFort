'use strict';
// Stops ONLY the KeyFort server recorded in .keyfort-run.json (clean shutdown, then PID fallback).
const fs = require('fs');
const path = require('path');
const http = require('http');

const RUN_FILE = path.join(__dirname, '..', '.keyfort-run.json');
if (!fs.existsSync(RUN_FILE)) { console.log('KeyFort is not running (no run file found).'); process.exit(0); }

const info = JSON.parse(fs.readFileSync(RUN_FILE, 'utf8'));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requestShutdown() {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port: info.port, path: '/__keyfort/shutdown', method: 'POST', headers: { 'x-shutdown-token': info.token }, timeout: 3000 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

(async () => {
  if (!alive(info.pid)) { fs.unlinkSync(RUN_FILE); console.log('KeyFort was not running (stale file removed).'); return; }
  if (info.protocol === 'http') await requestShutdown();
  for (let i = 0; i < 16 && alive(info.pid); i += 1) await sleep(500);
  if (alive(info.pid)) { console.log('Clean stop did not finish; ending the KeyFort process.'); try { process.kill(info.pid); } catch (e) { /* ignore */ } await sleep(500); }
  try { fs.unlinkSync(RUN_FILE); } catch (e) { /* ignore */ }
  console.log('KeyFort stopped.');
})();
