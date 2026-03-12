const MASTER = 'http://159.65.205.244:3000';
export async function GET(req, { params }) {
  try {
    const { sessionId } = await params;
    const r = await fetch(`${MASTER}/demo/artifacts/${sessionId}`, { cache: 'no-store' });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ artifacts: [] }, { status: 500 });
  }
}
