// Server-side session token creation — keeps the API key off the client
// and bypasses the SDK's isCustomPersonaConfig() filtering.
const DEFAULT_API_KEY = 'NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9';

export async function POST(req) {
  const { personaConfig, apiKey, personaOnly } = await req.json();
  const key = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_API_KEY;
  // personaOnly = true: use persona defaults, no config overrides
  const body = personaOnly
    ? { personaConfig: { personaId: personaConfig.personaId } }
    : { personaConfig };
  const r = await fetch('https://api.anam.ai/v1/auth/session-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return Response.json({ error: data }, { status: r.status });
  return Response.json({ sessionToken: data.sessionToken });
}
