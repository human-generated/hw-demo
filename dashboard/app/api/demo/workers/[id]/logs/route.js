const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  try {
    const sessionId = new URL(req.url).searchParams.get('sessionId');
    const url = `${MASTER}/demo/workers/${params.id}/logs${sessionId ? `?sessionId=${sessionId}` : ''}`;
    const r = await fetch(url);
    const d = await r.json();
    return Response.json(d);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
