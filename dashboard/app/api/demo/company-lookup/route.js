const MASTER = 'http://159.65.205.244:3000';

export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/demo/company-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ domain: null, ticker: null, fullName: '' });
  }
}
