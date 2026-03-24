// Proxy to SPA-DEC footprint API — avoids CORS, normalises params
const FOOTPRINT_API = 'https://spa-dec-api-168039836142.europe-west1.run.app';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date       = searchParams.get('date')        || '2025-06-15';
  const entryHour  = searchParams.get('entry_hour')  || '10';
  const exitHour   = searchParams.get('exit_hour')   || '14';

  try {
    const r = await fetch(
      `${FOOTPRINT_API}/api/footprint?date=${date}&entry_hour=${entryHour}&exit_hour=${exitHour}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await r.json();
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
