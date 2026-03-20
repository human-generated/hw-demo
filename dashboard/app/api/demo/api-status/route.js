const MASTER = 'http://159.65.205.244:3000';

export async function GET() {
  try {
    // Fetch master results and direct keys in parallel
    const [masterRes, keysRes] = await Promise.all([
      fetch(`${MASTER}/demo/api-status`, { cache: 'no-store' }),
      fetch(`${MASTER}/demo/api-keys-direct`, { cache: 'no-store' }),
    ]);
    const masterData = await masterRes.json();
    const keys = await keysRes.json();

    // Call Bland and WaveSpeed directly from Vercel (master IP is blocked by their CDNs)
    const [blandResult, wsResult] = await Promise.all([
      keys.bland ? checkBland(keys.bland) : null,
      keys.wavespeed ? checkWaveSpeed(keys.wavespeed) : null,
    ]);

    // Patch the master results with direct results
    const services = (masterData.services || []).map(svc => {
      if (svc.id === 'bland' && blandResult) return { ...svc, ...blandResult };
      if (svc.id === 'wavspeed' && wsResult) return { ...svc, ...wsResult };
      return svc;
    });

    return Response.json({ services, checkedAt: masterData.checkedAt });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

async function checkBland(key) {
  try {
    const r = await fetch('https://api.bland.ai/v1/me', {
      headers: { 'authorization': key },
      cache: 'no-store',
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.message || 'API error' };
    const bal = d.billing?.current_balance;
    return {
      ok: true,
      credits: bal != null ? 'USD ' + parseFloat(bal).toFixed(2) : 'Active',
      account: d.billing?.refill_to ? 'refills to $' + d.billing.refill_to : 'active',
      detail: d.total_calls != null ? d.total_calls + ' total calls' : undefined,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkWaveSpeed(key) {
  try {
    const r = await fetch('https://api.wavespeed.ai/api/v3/balance', {
      headers: { 'Authorization': 'Bearer ' + key },
      cache: 'no-store',
    });
    const d = await r.json();
    if (!r.ok || d.code !== 200) return { ok: false, error: 'API error' };
    const bal = d.data?.balance;
    return {
      ok: true,
      credits: bal != null ? 'USD ' + parseFloat(bal).toFixed(2) : 'Active',
      account: 'verified',
      detail: undefined,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
