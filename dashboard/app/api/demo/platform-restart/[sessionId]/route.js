export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';
export async function POST(req, { params }) {
  const { sessionId } = await params;
  const body = await req.json();
  const r = await fetch(`${MASTER}/demo/platform-restart/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return Response.json(d);
}
