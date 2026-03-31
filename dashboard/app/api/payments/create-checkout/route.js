import { NextResponse } from 'next/server';

const MASTER = process.env.MASTER_URL || 'http://159.65.205.244:3000';

export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${MASTER}/api/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
