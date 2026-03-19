const MASTER = 'http://159.65.205.244:3000';

export async function POST(req) {
  try {
    const body = await req.json();
    const upstream = await fetch(`${MASTER}/demo/fix-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Stream SSE straight through
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
