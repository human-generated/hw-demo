// Proxy to fetch OpenAPI spec + sample data from a session's contextApiUrl
// Avoids CORS issues from the browser

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const apiUrl = searchParams.get('url');
  if (!apiUrl) return Response.json({ error: 'url required' }, { status: 400 });

  try {
    // Fetch OpenAPI spec
    const specRes = await fetch(`${apiUrl}/openapi.json`, { signal: AbortSignal.timeout(8000) });
    const spec = await specRes.json();

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

    const context = [
      `# ${title}`,
      description,
      '',
      '## Endpoints',
      ...endpoints,
      '',
      `## Base URL`,
      apiUrl,
    ].join('\n');

    return Response.json({ context, spec, title, description, endpoints, apiUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
