import { extractText } from 'unpdf';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf');
    if (!file) return Response.json({ error: 'No PDF provided' }, { status: 400 });

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text, totalPages } = await extractText(buffer, { mergePages: true });
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return Response.json({ text: cleaned, pages: totalPages });
  } catch (e) {
    console.error('[parse-pdf]', e);
    return Response.json({ error: e.message || 'Failed to parse PDF' }, { status: 500 });
  }
}
