const MASTER = 'http://159.65.205.244:3000';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/platforms/${params.id}/chat`, {
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
