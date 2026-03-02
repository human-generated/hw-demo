export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  const r = await fetch(`${MASTER}/service-accounts/${params.slug}`, { cache: 'no-store' });
  return Response.json(await r.json());
}

export async function DELETE(req, { params }) {
  const r = await fetch(`${MASTER}/service-accounts/${params.slug}`, { method: 'DELETE' });
  return Response.json(await r.json());
}
