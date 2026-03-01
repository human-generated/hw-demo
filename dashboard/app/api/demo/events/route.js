const MASTER = 'http://159.65.205.244:3000';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const n = searchParams.get('n') || '50';
  const r = await fetch(`${MASTER}/demo/events?n=${n}`);
  return Response.json(await r.json());
}
