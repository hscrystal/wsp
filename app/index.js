const http = require('http');
const os = require('os');

const message = process.env.APP_MESSAGE || 'Hello from gitops-demo!';
const version = process.env.APP_VERSION || 'v1';
const environment = process.env.APP_ENV || 'local';
const pod = os.hostname();
const startedAt = Date.now();

const info = () => ({
  message,
  version,
  environment,
  pod,
  uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
});

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// สีหลักของหน้าเปลี่ยนตาม environment ให้แยก dev/prod ออกได้ทันทีที่เปิด
const accents = {
  production: ['#f97316', '#e11d48'],
  dev: ['#06b6d4', '#6366f1'],
};

const page = () => {
  const d = info();
  const [a1, a2] = accents[environment] || ['#10b981', '#0ea5e9'];
  const steps = ['git push', 'GitHub Actions', 'Docker Hub', 'ArgoCD', 'Kubernetes'];
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>hello-app · ${escapeHtml(d.environment)}</title>
<style>
  :root {
    --a1: ${a1}; --a2: ${a2};
    --bg: #f6f7fb; --card: rgba(255,255,255,.78); --line: rgba(15,23,42,.10);
    --text: #0f172a; --muted: #64748b; --chip: rgba(15,23,42,.05);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b1020; --card: rgba(20,27,48,.72); --line: rgba(255,255,255,.10);
      --text: #f1f5f9; --muted: #94a3b8; --chip: rgba(255,255,255,.07);
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; display: grid; place-items: center; padding: 24px 16px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif;
    color: var(--text); background: var(--bg); overflow-x: hidden;
  }
  .glow {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(42rem 42rem at 12% 8%, color-mix(in srgb, var(--a1) 30%, transparent), transparent 62%),
      radial-gradient(38rem 38rem at 92% 96%, color-mix(in srgb, var(--a2) 30%, transparent), transparent 62%);
  }
  main {
    position: relative; z-index: 1; width: 100%; max-width: 680px;
    background: var(--card); border: 1px solid var(--line); border-radius: 24px;
    padding: clamp(24px, 5vw, 44px);
    -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
    box-shadow: 0 24px 60px -24px rgba(15,23,42,.35);
  }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: .01em; }
  .logo {
    width: 30px; height: 30px; border-radius: 9px;
    background: linear-gradient(135deg, var(--a1), var(--a2));
  }
  .env {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
    font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #fff;
    background: linear-gradient(135deg, var(--a1), var(--a2));
  }
  .env i { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
  h1 {
    margin: 34px 0 10px; font-size: clamp(30px, 7vw, 50px); line-height: 1.12; letter-spacing: -.02em;
    overflow-wrap: anywhere;
    background: linear-gradient(135deg, var(--a1), var(--a2));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .sub { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.6; }
  dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 30px 0 0; }
  dl div { background: var(--chip); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; min-width: 0; }
  dt { font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
  dd {
    margin: 6px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 15px; font-weight: 600; overflow-wrap: anywhere;
  }
  ol {
    list-style: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    margin: 30px 0 0; padding: 22px 0 0; border-top: 1px solid var(--line);
  }
  ol li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
  ol li span { padding: 5px 10px; border-radius: 8px; background: var(--chip); border: 1px solid var(--line); white-space: nowrap; }
  ol li:last-child span { color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--a1), var(--a2)); }
  ol li + li::before { content: "→"; opacity: .6; }
  footer { margin-top: 22px; font-size: 13px; color: var(--muted); }
  footer a { color: inherit; }
  @media (prefers-reduced-motion: reduce) { .env i { animation: none; } }
</style>
</head>
<body>
<div class="glow"></div>
<main>
  <header>
    <div class="brand"><span class="logo"></span>hello-app</div>
    <span class="env"><i></i>${escapeHtml(d.environment)}</span>
  </header>

  <h1>${escapeHtml(d.message)}</h1>
  <p class="sub">หน้านี้ถูก deploy ด้วย GitOps — ทุกค่าที่เห็นมาจาก Helm values ใน Git แล้ว ArgoCD sync เข้า cluster ให้</p>

  <dl>
    <div><dt>Version</dt><dd>${escapeHtml(d.version)}</dd></div>
    <div><dt>Pod</dt><dd>${escapeHtml(d.pod)}</dd></div>
    <div><dt>Uptime</dt><dd id="uptime" data-seconds="${d.uptimeSeconds}">${d.uptimeSeconds}s</dd></div>
  </dl>

  <ol>${steps.map((s) => `<li><span>${s}</span></li>`).join('')}</ol>

  <footer>ข้อมูลแบบ JSON: <a href="/api/info">/api/info</a></footer>
</main>
<script>
  // นับ uptime ต่อฝั่ง browser จากค่าที่ server ส่งมาตอนโหลดหน้า
  (function () {
    var el = document.getElementById('uptime');
    var base = Number(el.dataset.seconds), t0 = Date.now();
    function fmt(s) {
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      return (d ? d + 'd ' : '') + (d || h ? h + 'h ' : '') + (d || h || m ? m + 'm ' : '') + (s % 60) + 's';
    }
    function tick() { el.textContent = fmt(base + Math.floor((Date.now() - t0) / 1000)); }
    tick(); setInterval(tick, 1000);
  })();
</script>
</body>
</html>`;
};

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(info()));
    }

    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(page());
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  })
  .listen(8080, () => console.log('listening on :8080'));
