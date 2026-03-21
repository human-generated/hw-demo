const MASTER = 'http://159.65.205.244:3000';

export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/session/${body.sessionId}/deploy-standalone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    return Response.json(d);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  // Poll deployment status
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  try {
    const r = await fetch(`${MASTER}/demo/session/${sessionId}/deploy-standalone/status`);
    const d = await r.json();
    return Response.json(d);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
