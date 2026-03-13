const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  try {
    const r = await fetch(`${MASTER}/demo/session/${(await params).id}`);
    const d = await r.json();
    return Response.json(d);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/session/${(await params).id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const r = await fetch(`${MASTER}/demo/session/${(await params).id}`, { method: 'DELETE' });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
