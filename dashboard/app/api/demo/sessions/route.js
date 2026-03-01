const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  try {
    const r = await fetch(`${MASTER}/demo/sessions`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
