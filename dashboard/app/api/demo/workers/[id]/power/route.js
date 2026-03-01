const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  try {
    const r = await fetch(`${MASTER}/demo/workers/${id}/power?sessionId=${sessionId}`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
