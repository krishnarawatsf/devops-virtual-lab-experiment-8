const os = require('os');
const express = require('express');
const client = require('prom-client');

const PORT = Number(process.env.PORT || 8080);
const COLOR = (process.env.APP_COLOR || 'blue').toLowerCase();
const VERSION = process.env.APP_VERSION || (COLOR === 'green' ? 'v2' : 'v1');
const POD_NAME = process.env.HOSTNAME || os.hostname();
const REPLICA_ID = process.env.REPLICA_ID || POD_NAME;

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'myapp_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests served by this replica',
  labelNames: ['method', 'route', 'status_code', 'color', 'version'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'color', 'version'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register]
});

const replicaInfo = new client.Gauge({
  name: 'myapp_replica_info',
  help: 'Replica identity (always 1)',
  labelNames: ['color', 'version', 'pod'],
  registers: [register]
});
replicaInfo.labels(COLOR, VERSION, POD_NAME).set(1);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const seconds = elapsed[0] + elapsed[1] / 1e9;
    const route = req.path === '/' ? '/' : req.path;
    httpRequestsTotal.labels(req.method, route, String(res.statusCode), COLOR, VERSION).inc();
    httpRequestDuration.labels(req.method, route, COLOR, VERSION).observe(seconds);
  });
  next();
});

function payload() {
  return {
    environment: COLOR,
    version: VERSION,
    replica: REPLICA_ID,
    pod: POD_NAME,
    status: 'live',
    message: COLOR === 'green'
      ? 'New version is ready in the Green environment'
      : 'Live version is serving from the Blue environment',
    timestamp: new Date().toISOString()
  };
}

app.get('/', (req, res) => {
  const data = payload();
  const accent = COLOR === 'green' ? '#16a34a' : '#2563eb';
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>myapp ${data.version} (${data.environment})</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center;
      font-family: ui-sans-serif, system-ui, sans-serif; color:#0f172a;
      background: radial-gradient(circle at 20% 20%, ${accent}22, #f8fafc 55%); }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:20px;
      padding:40px 48px; box-shadow:0 20px 50px rgba(15,23,42,.08); min-width:320px; }
    .pill { display:inline-block; padding:6px 12px; border-radius:999px; color:#fff;
      background:${accent}; font-weight:700; letter-spacing:.04em; text-transform:uppercase; font-size:12px; }
    h1 { margin:16px 0 8px; font-size:32px; }
    p { margin:6px 0; color:#475569; }
    code { background:#f1f5f9; padding:2px 6px; border-radius:6px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="pill">${data.environment} environment</span>
    <h1>myapp ${data.version}</h1>
    <p>${data.message}</p>
    <p>Replica: <code>${data.replica}</code></p>
    <p>Pod: <code>${data.pod}</code></p>
  </div>
</body>
</html>`);
});

app.get('/api/health', (req, res) => res.json({ ok: true, ...payload() }));
app.get('/api/health/live', (req, res) => res.json({ live: true, ...payload() }));
app.get('/api/health/ready', (req, res) => res.json({ ready: true, ...payload() }));
app.get('/api/info', (req, res) => res.json(payload()));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`myapp ${VERSION} (${COLOR}) listening on ${PORT} as ${POD_NAME}`);
});

module.exports = { app, COLOR, VERSION };
