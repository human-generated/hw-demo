export const maxDuration = 60;
const MASTER = 'http://159.65.205.244:3000';
export async function POST(req, { params }) {
  try {
    const id = (await params).id;
    const r = await fetch(`${MASTER}/demo/session/${id}/qa-drive-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return Response.json(await r.json(), { status: r.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
