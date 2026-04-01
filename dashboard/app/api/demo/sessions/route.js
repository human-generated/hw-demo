import { getServerSession } from 'next-auth';
import { authOptions, ADMIN_EMAIL } from '../../../lib/authOptions';

const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    const isAdmin = session?.user?.isAdmin || email === ADMIN_EMAIL;

    let url = `${MASTER}/demo/sessions`;
    if (email && !isAdmin) url += `?email=${encodeURIComponent(email)}`;

    const r = await fetch(url, { cache: 'no-store' });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || '';

    const r = await fetch(`${MASTER}/demo/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const d = await r.json();
    return Response.json({ id: d.sessionId || d.id, ...d });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
