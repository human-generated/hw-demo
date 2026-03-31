export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  const { userId } = await params;
  const r = await fetch(`${MASTER}/demo/user-profile/${encodeURIComponent(userId)}`);
  return Response.json(await r.json());
}

export async function PATCH(req, { params }) {
  const { userId } = await params;
  const body = await req.json();
  const r = await fetch(`${MASTER}/demo/user-profile/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Response.json(await r.json());
}
