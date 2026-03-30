const MASTER = 'http://159.65.205.244:3000';

export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/live-tiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ tiles: [], error: e.message });
  }
}
