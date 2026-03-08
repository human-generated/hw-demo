const MASTER = 'http://159.65.205.244:3000';
export async function PATCH(req, { params }) {
  const body = await req.json();
  const res = await fetch(`${MASTER}/demo/workers/${params.id}/permissions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data);
}
