async function getJson(url, options) {
  const res = await fetch(url, options);
  return res.json();
}

function podHtml(item, fallbackName) {
  const ok = item && item.ok;
  const data = (item && item.data) || {};
  return `<div class="pod ${ok ? 'ok' : 'bad'}">
    <div>${data.replica || fallbackName}</div>
    <div>${ok ? (data.version || 'up') : 'down'}</div>
  </div>`;
}

async function refresh() {
  const [status, components] = await Promise.all([
    getJson('/api/status'),
    getJson('/api/components')
  ]);
  const sw = status.switcher || {};
  const color = sw.activeColor || 'blue';
  const liveCard = document.getElementById('liveCard');
  liveCard.className = `live-card ${color}`;
  document.getElementById('liveColor').textContent = color.toUpperCase();
  document.getElementById('liveVersion').textContent = `Serving ${sw.liveVersion || 'v1'} through the Service switch`;

  const comps = components.components || {};
  document.getElementById('bluePods').innerHTML = (comps.blue || []).map((p, i) => podHtml(p, `blue-${i + 1}`)).join('');
  document.getElementById('greenPods').innerHTML = (comps.green || []).map((p, i) => podHtml(p, `green-${i + 1}`)).join('');

  const rows = [
    ['Jenkins', true, 'Build → Deploy Green → Switch'],
    ['Kubernetes', true, 'Blue x2 + Green x2'],
    ['Service switch', comps.switcher && comps.switcher.ok, 'Traffic router'],
    ['Prometheus', comps.prometheus && comps.prometheus.ok, 'Scrape both colors'],
    ['Grafana', comps.grafana && comps.grafana.ok, 'admin / admin'],
    ['Alertmanager', comps.alertmanager && comps.alertmanager.ok, 'Incident routing']
  ];
  document.getElementById('components').innerHTML = rows.map(([name, ok, detail]) => `
    <div class="comp">
      <strong>${name}</strong>
      <div class="${ok ? 'ok' : 'bad'}">${ok ? 'RUNNING' : 'DOWN'}</div>
      <div style="color:#93a0bf;font-size:12px;margin-top:6px">${detail}</div>
    </div>
  `).join('');

  const history = sw.history || [];
  document.getElementById('history').textContent = history.length
    ? history.map((h) => `${h.at}  ${h.from} → ${h.to}  (${h.reason})`).join('\n')
    : 'No switches yet. Live traffic is on Blue.';
}

async function switchTo(color) {
  await getJson('/api/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color, reason: 'command-center' })
  });
  await refresh();
}

document.getElementById('btnGreen').addEventListener('click', () => switchTo('green'));
document.getElementById('btnBlue').addEventListener('click', () => switchTo('blue'));
refresh();
setInterval(refresh, 4000);
