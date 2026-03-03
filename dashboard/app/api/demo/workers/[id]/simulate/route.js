export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const { sessionId } = body;
    const r = await fetch(`${MASTER}/demo/workers/${params.id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!r.ok) throw new Error(`Master responded ${r.status}`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
