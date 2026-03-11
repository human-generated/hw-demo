const KEY = process.env.DEEPGRAM_API_KEY || '00b52181398adfe245237b0079ffa2a433622272';
export async function POST() {
  return Response.json({ token: KEY });
}
