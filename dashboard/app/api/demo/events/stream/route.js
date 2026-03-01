export const dynamic = 'force-dynamic';
const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  const upstream = await fetch(`${MASTER}/demo/events/stream`, {
    headers: { Accept: 'text/event-stream' },
  });
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
