const MASTER = 'http://159.65.205.244:3000';
export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  try {
    const r = await fetch(`${MASTER}/demo/workers/${id}/flow?sessionId=${sessionId}`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/workers/${id}/flow`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
