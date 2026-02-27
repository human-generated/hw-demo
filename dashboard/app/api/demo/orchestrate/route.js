const MASTER = 'http://159.65.205.244:3000';
export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ message: e.message, action: { type: 'none', params: {} } }, { status: 500 });
  }
}
