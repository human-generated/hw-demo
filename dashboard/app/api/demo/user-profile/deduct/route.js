const MASTER = process.env.MASTER_URL || 'http://159.65.205.244:3000';

export async function POST(req) {
  const body = await req.json();
  const r = await fetch(`${MASTER}/api/demo/user-profile/deduct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return Response.json(data);
}
