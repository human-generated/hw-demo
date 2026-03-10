import { AccessToken } from 'livekit-server-sdk';

export async function POST(req) {
  const { roomName, participantName, sessionId, workerId, videoEnabled, personaId, systemPrompt } = await req.json();

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      metadata: JSON.stringify({ sessionId, workerId, videoEnabled, personaId, systemPrompt }),
    }
  );

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return Response.json({ token: await token.toJwt(), url: process.env.LIVEKIT_URL });
}
