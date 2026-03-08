const MASTER = 'http://159.65.205.244:3000';
export async function GET(req, { params }) {
  const res = await fetch(`${MASTER}/demo/sessions/${params.sessionId}/integrations`);
  const data = await res.json();
  return Response.json(data);
}
