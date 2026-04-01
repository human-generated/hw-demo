import { getServerSession } from 'next-auth';
import { authOptions, ADMIN_EMAIL } from '@/app/lib/authOptions';

const MASTER = 'http://159.65.205.244:3000';
const INTERNAL = 'hw-demo-admin';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!session.user.isAdmin && session.user.email !== ADMIN_EMAIL) return null;
  return session.user;
}

export async function PATCH(req, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const { email } = await params;
  const body = await req.json();
  const r = await fetch(`${MASTER}/api/admin/users/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Internal': INTERNAL },
    body: JSON.stringify(body),
  });
  return Response.json(await r.json(), { status: r.status });
}
