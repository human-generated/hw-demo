import { getServerSession } from 'next-auth';
import { authOptions, ADMIN_EMAIL } from '../../../lib/authOptions';

const MASTER = 'http://159.65.205.244:3000';
const INTERNAL = 'hw-demo-admin';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!session.user.isAdmin && session.user.email !== ADMIN_EMAIL) return null;
  return session.user;
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const r = await fetch(`${MASTER}/api/admin/users`, { headers: { 'X-Internal': INTERNAL }, cache: 'no-store' });
  return Response.json(await r.json(), { status: r.status });
}

export async function POST(req) {
  if (!await requireAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json();
  const r = await fetch(`${MASTER}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal': INTERNAL },
    body: JSON.stringify(body),
  });
  return Response.json(await r.json(), { status: r.status });
}
