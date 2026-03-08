const MASTER = 'http://159.65.205.244:3000';
export async function POST(req) {
  const body = await req.json();
  const res = await fetch(`${MASTER}/demo/gui-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Response.json(await res.json());
}
