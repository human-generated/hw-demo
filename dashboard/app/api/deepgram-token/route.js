const DG_KEY = process.env.DEEPGRAM_API_KEY || '56e0caf0a2d27fc173409bb11929a0249005288b';

export async function POST() {
  try {
    // Get project ID
    const proj = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${DG_KEY}` },
    });
    const { projects } = await proj.json();
    const projectId = projects?.[0]?.project_id;
    if (!projectId) return Response.json({ error: 'no project' }, { status: 500 });

    // Create a short-lived key (90s — enough for one STT session to start)
    const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: { Authorization: `Token ${DG_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'browser-stt', scopes: ['usage:write'], time_to_live_in_seconds: 90 }),
    });
    const data = await res.json();
    const token = data.key;
    if (!token) return Response.json({ error: 'key creation failed', detail: data }, { status: 500 });

    return Response.json({ token });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
