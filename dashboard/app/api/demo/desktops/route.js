const MASTER = 'http://159.65.205.244:3000';
export async function GET() {
  const res = await fetch(`${MASTER}/demo/desktops`);
  return Response.json(await res.json());
}
