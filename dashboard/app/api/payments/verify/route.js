import { NextResponse } from 'next/server';

const MASTER = process.env.MASTER_URL || 'http://159.65.205.244:3000';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

    const r = await fetch(`${MASTER}/api/payments/verify?session_id=${encodeURIComponent(session_id)}`);
    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
