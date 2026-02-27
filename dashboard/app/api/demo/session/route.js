const MASTER = 'http://159.65.205.244:3000';

export async function POST() {
  try {
    const r = await fetch(`${MASTER}/demo/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    return Response.json(d);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
