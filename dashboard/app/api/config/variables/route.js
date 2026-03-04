const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  try {
    const r = await fetch(`${MASTER}/config/variables`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({}, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/config/variables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const r = await fetch(`${MASTER}/config/variables/${encodeURIComponent(key)}`, { method: 'DELETE' });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
