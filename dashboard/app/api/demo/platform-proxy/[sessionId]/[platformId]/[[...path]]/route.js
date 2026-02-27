export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

async function getPlatformUrl(sessionId, platformId) {
  try {
    const r = await fetch(`${MASTER}/demo/session/${sessionId}`, { cache: 'no-store' });
    const d = await r.json();
    const plat = (d.platforms || []).find(p => p.id === platformId);
    return plat?.url || null;
  } catch { return null; }
}

async function proxyRequest(req, sessionId, platformId, pathParts, method, bodyBuffer) {
  const platformUrl = await getPlatformUrl(sessionId, platformId);
  if (!platformUrl) return new Response('Platform not found', { status: 404 });

  const pathStr = (pathParts || []).join('/');
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const targetUrl = `${platformUrl}/${pathStr}${qs ? '?' + qs : ''}`;

  const fetchOpts = {
    method,
    headers: { accept: req.headers.get('accept') || '*/*' },
    signal: AbortSignal.timeout(10000),
  };
  if (bodyBuffer) {
    fetchOpts.body = bodyBuffer;
    fetchOpts.headers['content-type'] = req.headers.get('content-type') || 'application/json';
  }

  let resp;
  try { resp = await fetch(targetUrl, fetchOpts); }
  catch (e) {
    const errHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="4">
<style>body{margin:0;background:#0a0a0f;color:#888;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}
.dot{display:inline-block;animation:blink 1s infinite}.dot:nth-child(2){animation-delay:.3s}.dot:nth-child(3){animation-delay:.6s}
@keyframes blink{0%,100%{opacity:0.2}50%{opacity:1}}</style></head>
<body><div style="color:#3b82f6;font-size:0.9rem">App starting up<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>
<div style="font-size:0.72rem;color:#555">Auto-refreshing every 4s &nbsp;·&nbsp; ${e.message}</div>
<button onclick="location.reload()" style="margin-top:8px;background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:6px 16px;border-radius:6px;cursor:pointer;font-family:monospace;font-size:0.72rem">Reload now</button>
</body></html>`;
    return new Response(errHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'ALLOWALL', 'Content-Security-Policy': 'frame-ancestors *' } });
  }

  const ct = resp.headers.get('content-type') || 'text/plain';

  if (ct.includes('text/html')) {
    let html = await resp.text();
    const proxyBase = `/api/demo/platform-proxy/${sessionId}/${platformId}/`;
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${proxyBase}">`);
    html = html.replace(/(['"`])(\/api\/)/g, `$1${proxyBase}api/`);
    html = html.replace(/fetch\s*\(\s*(['"`])\/((?!api\/demo\/platform-proxy\/))/g, `fetch($1${proxyBase}`);
    return new Response(html, {
      status: resp.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
      },
    });
  }

  const body = await resp.arrayBuffer();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': ct },
  });
}

export async function GET(req, { params }) {
  const { sessionId, platformId, path: pathParts } = await params;
  return proxyRequest(req, sessionId, platformId, pathParts, 'GET', null);
}
export async function POST(req, { params }) {
  const { sessionId, platformId, path: pathParts } = await params;
  const body = await req.arrayBuffer();
  return proxyRequest(req, sessionId, platformId, pathParts, 'POST', body);
}
export async function PATCH(req, { params }) {
  const { sessionId, platformId, path: pathParts } = await params;
  const body = await req.arrayBuffer();
  return proxyRequest(req, sessionId, platformId, pathParts, 'PATCH', body);
}
export async function DELETE(req, { params }) {
  const { sessionId, platformId, path: pathParts } = await params;
  return proxyRequest(req, sessionId, platformId, pathParts, 'DELETE', null);
}
export async function PUT(req, { params }) {
  const { sessionId, platformId, path: pathParts } = await params;
  const body = await req.arrayBuffer();
  return proxyRequest(req, sessionId, platformId, pathParts, 'PUT', body);
}
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
