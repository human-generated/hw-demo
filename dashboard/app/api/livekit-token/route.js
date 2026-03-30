import { AccessToken } from 'livekit-server-sdk';

const LK_URL = process.env.LIVEKIT_URL || 'wss://h1uman-z2zp8gbw.livekit.cloud';
const LK_API_KEY = process.env.LIVEKIT_API_KEY || 'API5rrq8TTVJ2kR';
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET || 'n2qZvHrSq9A2Ps1Vhqxf3aB9D6cmc5fX9bUTvp2PgUI';

export async function POST(req) {
  const { roomName, participantName, sessionId, logSessionId, workerId, videoEnabled, personaId, systemPrompt, mode } = await req.json();

  const token = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: participantName,
    metadata: JSON.stringify({ sessionId, logSessionId, workerId, videoEnabled, personaId, systemPrompt, mode: mode || 'workspace' }),
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return Response.json({ token: await token.toJwt(), url: LK_URL });
}
