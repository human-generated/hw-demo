const MASTER = 'http://159.65.205.244:3000';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/agents/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
