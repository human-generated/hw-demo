// Proxy to fetch OpenAPI spec + live sample data from a session's contextApiUrl
// Avoids CORS issues from the browser

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const apiUrl = searchParams.get('url');
  if (!apiUrl) return Response.json({ error: 'url required' }, { status: 400 });

  try {
    // Fetch OpenAPI spec + a live sample in parallel
    const sampleDate = `2025-06-15`;
    const [specRes, sampleRes] = await Promise.allSettled([
      fetch(`${apiUrl}/openapi.json`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${apiUrl}/api/footprint?date=${sampleDate}&entry_hour=10&exit_hour=14`, { signal: AbortSignal.timeout(8000) }),
    ]);

    const spec = specRes.status === 'fulfilled' ? await specRes.value.json() : {};
    let sampleData = null;
    if (sampleRes.status === 'fulfilled') {
      try {
        const sd = await sampleRes.value.json();
        // Only use if it looks like a real footprint response (has total_kg)
        if (sd && typeof sd.total_kg === 'number') sampleData = sd;
      } catch {}
    }

    // Build context summary from spec
    const title = spec.info?.title || 'API';
    const description = spec.info?.description || '';
    const paths = spec.paths || {};
    const endpoints = Object.entries(paths).map(([path, methods]) => {
      const method = Object.keys(methods)[0];
      const op = methods[method];
      const params = (op.parameters || []).map(p => `${p.name} (${p.in}${p.required ? ', required' : ''})`).join(', ');
      return `${method.toUpperCase()} ${path} — ${op.summary || ''}${params ? ` | params: ${params}` : ''}`;
    });

    return Response.json({ title, description, endpoints, sampleData, apiUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
