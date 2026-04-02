import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf');
    if (!file) return Response.json({ error: 'No PDF provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    return Response.json({ text: result.text, pages: result.numpages });
  } catch (e) {
    console.error('[parse-pdf]', e);
    return Response.json({ error: e.message || 'Failed to parse PDF' }, { status: 500 });
  }
}
