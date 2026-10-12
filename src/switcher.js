const http = require('http');
const express = require('express');
const httpProxy = require('http-proxy');

const PORT = Number(process.env.PORT || 8090);
const BLUE_UPSTREAMS = (process.env.BLUE_UPSTREAMS || 'http://blue-1:8080,http://blue-2:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const GREEN_UPSTREAMS = (process.env.GREEN_UPSTREAMS || 'http://green-1:8080,http://green-2:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let activeColor = (process.env.ACTIVE_COLOR || 'blue').toLowerCase();
let blueIndex = 0;
let greenIndex = 0;
const history = [];

function nextTarget() {
  const pool = activeColor === 'green' ? GREEN_UPSTREAMS : BLUE_UPSTREAMS;
  if (activeColor === 'green') {
    const target = pool[greenIndex % pool.length];
    greenIndex += 1;
    return target;
  }
  const target = pool[blueIndex % pool.length];
  blueIndex += 1;
  return target;
}

const proxy = httpProxy.createProxyServer({ xfwd: true, timeout: 5000 });
proxy.on('error', (err, req, res) => {
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  if (res) {
    res.end(JSON.stringify({ error: 'upstream_unavailable', message: err.message, color: activeColor }));
  }
});

const app = express();
app.use(express.json());

app.get('/switcher/health', (req, res) => {
  res.json({
    ok: true,
    role: 'service-switch',
    activeColor,
    liveVersion: activeColor === 'green' ? 'v2' : 'v1',
    blueReplicas: BLUE_UPSTREAMS.length,
    greenReplicas: GREEN_UPSTREAMS.length
  });
});

app.get('/switcher/status', (req, res) => {
  res.json({
    activeColor,
    liveVersion: activeColor === 'green' ? 'v2' : 'v1',
    newVersion: 'v2',
    blue: { color: 'blue', version: 'v1', replicas: BLUE_UPSTREAMS.length, upstreams: BLUE_UPSTREAMS },
    green: { color: 'green', version: 'v2', replicas: GREEN_UPSTREAMS.length, upstreams: GREEN_UPSTREAMS },
    history: history.slice(-12)
  });
});

app.post('/switcher/switch', (req, res) => {
  const requested = String((req.body && req.body.color) || '').toLowerCase();
  if (requested !== 'blue' && requested !== 'green') {
    return res.status(400).json({ error: 'color must be blue or green' });
  }
  const from = activeColor;
  activeColor = requested;
  const event = {
    from,
    to: activeColor,
    at: new Date().toISOString(),
    reason: req.body.reason || 'manual-switch'
  };
  history.push(event);
  console.log(`Traffic switched ${from} -> ${activeColor}`);
  res.json({ ok: true, ...event, liveVersion: activeColor === 'green' ? 'v2' : 'v1' });
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/switcher/')) {
    return app(req, res);
  }
  const target = nextTarget();
  proxy.web(req, res, { target });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Service switch listening on ${PORT}, active=${activeColor}`);
});

module.exports = { nextTarget, getActiveColor: () => activeColor };
