export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const MASTER = 'http://159.65.205.244:3000';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/workers/${params.id}/run-steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Master ${r.status}`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
