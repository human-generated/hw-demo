const MASTER = 'http://159.65.205.244:3000';

export async function PATCH(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/keys`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return Response.json(await r.json());
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function GET() {
  try {
    const r = await fetch(`${MASTER}/demo/keys/status`);
    return Response.json(await r.json());
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
