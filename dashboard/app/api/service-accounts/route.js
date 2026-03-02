export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  const r = await fetch(`${MASTER}/service-accounts`, { cache: 'no-store' });
  return Response.json(await r.json());
}

export async function POST(req) {
  const body = await req.json();
  const r = await fetch(`${MASTER}/service-accounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return Response.json(await r.json());
}
