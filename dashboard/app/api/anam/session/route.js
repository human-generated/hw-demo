// Server-side session token creation — keeps the API key off the client
// and bypasses the SDK's isCustomPersonaConfig() filtering.
const DEFAULT_API_KEY = 'NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9';
const KEY2 = 'NjllMzAwZDgtMzBkMi00Y2ViLWIxMDAtMzIxYWVkZTU4MDBjOnQ1TlVrejFFQmVKelF3VGplRHBOeS8xWEJHUHo3bHhDaE0vMkZ1Rnk4VkE9';

export async function POST(req) {
  const { personaConfig, apiKey, useKey2 } = await req.json();
  const key = useKey2 ? KEY2 : ((apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_API_KEY);
  const r = await fetch('https://api.anam.ai/v1/auth/session-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ personaConfig }),
  });
  const data = await r.json();
  if (!r.ok) return Response.json({ error: data }, { status: r.status });
  return Response.json({ sessionToken: data.sessionToken });
}
