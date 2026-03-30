const MASTER = 'http://159.65.205.244:3000';

export async function GET(req, { params }) {
  const { id } = await params;
  const since = new URL(req.url).searchParams.get('since') || '';
  try {
    const url = `${MASTER}/demo/session/${id}/conv-log${since ? `?since=${encodeURIComponent(since)}` : ''}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return Response.json(await r.json());
  } catch {
    return Response.json({ entries: [] });
  }
}
