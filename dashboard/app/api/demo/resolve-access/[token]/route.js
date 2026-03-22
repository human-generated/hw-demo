const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  try {
    const r = await fetch(`${MASTER}/demo/resolve-access/${(await params).token}`);
    return Response.json(await r.json(), { status: r.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
