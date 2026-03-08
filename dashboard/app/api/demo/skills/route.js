const MASTER = 'http://159.65.205.244:3000';
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const res = await fetch(`${MASTER}/demo/skills?${searchParams.toString()}`);
  return Response.json(await res.json());
}
