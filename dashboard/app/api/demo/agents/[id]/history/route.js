const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const r = await fetch(`${MASTER}/demo/agents/${id}/history`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ messages: [] }, { status: 500 });
  }
}
