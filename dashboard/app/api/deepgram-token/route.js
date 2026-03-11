const KEY = process.env.DEEPGRAM_API_KEY || '56e0caf0a2d27fc173409bb11929a0249005288b';
export async function POST() {
  return Response.json({ token: KEY });
}
