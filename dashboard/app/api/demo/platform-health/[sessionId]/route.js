export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const r = await fetch(`${MASTER}/demo/platform-health/${sessionId}`, { cache: 'no-store' });
  const d = await r.json();
  return Response.json(d);
}
