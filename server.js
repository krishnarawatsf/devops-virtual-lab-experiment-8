const http = require('http');
const path = require('path');
const express = require('express');

const PORT = Number(process.env.PORT || 8080);
const SWITCHER_URL = process.env.SWITCHER_URL || 'http://switcher:8090';
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://grafana:3000';
const ALERTMANAGER_URL = process.env.ALERTMANAGER_URL || 'http://alertmanager:9093';
const BLUE_URLS = (process.env.BLUE_UPSTREAMS || 'http://blue-1:8080,http://blue-2:8080').split(',').map((s) => s.trim());
const GREEN_URLS = (process.env.GREEN_UPSTREAMS || 'http://green-1:8080,http://green-2:8080').split(',').map((s) => s.trim());

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function fetchJson(url, options = {}, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method || 'GET', timeout: timeoutMs, headers: options.headers || {} }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, json: { raw: body } });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function probe(url) {
  try {
    const result = await fetchJson(url);
    return { ok: result.status >= 200 && result.status < 400, status: result.status, data: result.json };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'vle8-command-center', timestamp: new Date().toISOString() });
});

app.get('/api/components', async (req, res) => {
  const [switcher, prometheus, grafana, alertmanager, ...replicas] = await Promise.all([
    probe(`${SWITCHER_URL}/switcher/health`),
    probe(`${PROMETHEUS_URL}/-/ready`),
    probe(`${GRAFANA_URL}/api/health`),
    probe(`${ALERTMANAGER_URL}/-/ready`),
    ...BLUE_URLS.map((u) => probe(`${u}/api/health`)),
    ...GREEN_URLS.map((u) => probe(`${u}/api/health`))
  ]);

  const blue = replicas.slice(0, BLUE_URLS.length);
  const green = replicas.slice(BLUE_URLS.length);

  res.json({
    timestamp: new Date().toISOString(),
    components: {
      jenkins: { ok: true, role: 'CI/CD pipeline (Jenkinsfile in repo)', detail: 'Build image → deploy Green → switch traffic' },
      kubernetes: { ok: true, role: 'Blue/Green replica sets', detail: `${BLUE_URLS.length} blue + ${GREEN_URLS.length} green pods` },
      switcher,
      prometheus,
      grafana,
      alertmanager,
      blue,
      green
    }
  });
});

app.get('/api/status', async (req, res) => {
  const switcher = await probe(`${SWITCHER_URL}/switcher/status`);
  res.json({
    timestamp: new Date().toISOString(),
    switcher: switcher.data || {},
    switcherHealthy: switcher.ok
  });
});

app.post('/api/switch', async (req, res) => {
  try {
    const result = await fetchJson(`${SWITCHER_URL}/switcher/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: req.body.color, reason: req.body.reason || 'command-center' })
    });
    res.status(result.status || 200).json(result.json);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VLE-8 command center on ${PORT}`);
});
