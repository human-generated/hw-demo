export const maxDuration = 120;
const MASTER = 'http://159.65.205.244:3000';
export async function POST(req, { params }) {
  try {
    const id = (await params).id;
    const body = await req.json().catch(() => ({}));
    const r = await fetch(`${MASTER}/demo/session/${id}/sync-drive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Response.json(await r.json(), { status: r.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
