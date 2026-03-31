'use client';
import { useState } from 'react';

// ── Stripe logo ───────────────────────────────────────────────────────────────
function StripeLogo() {
  return (
    <svg width="38" height="16" viewBox="0 0 60 25" fill="none" aria-label="Stripe">
      <path d="M27.67 8.3c0-1.34 1.1-1.86 2.92-1.86 2.61 0 5.91.79 8.52 2.2V3.13C36.6 1.47 33.67.78 30.6.78c-6.03 0-10.04 3.15-10.04 8.4 0 8.2 11.3 6.88 11.3 10.41 0 1.58-1.37 2.1-3.29 2.1-2.84 0-6.47-.94-9.35-3.08v5.65c3.19 1.38 6.4 1.97 9.35 1.97 6.19 0 10.44-3.07 10.44-8.38 0-8.87-11.34-7.28-11.34-9.55zm-18.56 17.8V10.77H14V.8H.29v25.3H9.1zm36.14 0v-9.07c.86.08 1.73.13 2.6.13 7.84 0 12.56-3.96 12.56-10.6C60.41 0 55.86 0 50.93 0c-2.17 0-4.46.13-6.57.44l-.12 25.66h.01zm2.6-14.74V4.9c.42-.05.85-.07 1.27-.07 2.96 0 4.7 1.47 4.7 4.27 0 2.96-1.74 4.27-4.7 4.27-.43 0-.85-.02-1.27-.01z" fill="#635BFF"/>
    </svg>
  );
}

const PACKAGES = [
  { id: 'credits_10', credits: 10,  amount: '$10',  popular: false },
  { id: 'credits_25', credits: 25,  amount: '$25',  popular: true  },
  { id: 'credits_50', credits: 50,  amount: '$50',  popular: false },
];

export function PaymentModal({ email, onClose, onSuccess }) {
  const [selected, setSelected] = useState('credits_25');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, packageId: selected }),
      });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || 'Failed to create checkout');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{
        width: 360, background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        padding: '28px 24px 24px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111', letterSpacing: '-0.02em' }}>Add Credits</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>Pay once, use anytime</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: '1.3rem', lineHeight: 1, padding: 0, marginTop: 2 }}>×</button>
        </div>

        {/* Packages */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {PACKAGES.map(pkg => {
            const active = selected === pkg.id;
            return (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                  border: active ? '2px solid #34c759' : '2px solid rgba(0,0,0,0.08)',
                  background: active ? 'rgba(52,199,89,0.06)' : '#fafafa',
                  transition: 'all 0.15s', position: 'relative',
                  textAlign: 'center',
                }}
              >
                {pkg.popular && (
                  <div style={{
                    position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                    background: '#34c759', color: '#fff',
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                    padding: '2px 8px', borderRadius: 20,
                  }}>POPULAR</div>
                )}
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{pkg.amount}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)', marginTop: 3 }}>{pkg.credits} credits</div>
              </button>
            );
          })}
        </div>

        {/* What you get */}
        <div style={{
          background: '#f8f9fa', borderRadius: 10, padding: '12px 14px', marginBottom: 20,
          fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', lineHeight: 1.7,
        }}>
          <div style={{ color: '#111', fontWeight: 600, marginBottom: 4 }}>What you get</div>
          <div>· AI voice exchanges (Alexandra + workers)</div>
          <div>· LLM orchestration & research calls</div>
          <div>· Platform builds & deployments</div>
          <div style={{ marginTop: 6, color: 'rgba(0,0,0,0.35)', fontSize: '0.7rem' }}>Credits never expire · $HEART token top-up coming soon</div>
        </div>

        {error && (
          <div style={{ fontSize: '0.76rem', color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%', padding: '0.8rem',
            background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#28a745)',
            color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
            border: 'none', borderRadius: 12,
            fontSize: '0.9rem', fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.2s', marginBottom: 14,
          }}
        >
          {loading ? 'Redirecting to Stripe…' : `Pay ${PACKAGES.find(p => p.id === selected)?.amount} with Card`}
        </button>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.45 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 015 5v2H7V7a5 5 0 015-5zm7 9H5a1 1 0 00-1 1v9a1 1 0 001 1h14a1 1 0 001-1v-9a1 1 0 00-1-1z" fill="#6b7280"/></svg>
          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Secured by</span>
          <StripeLogo />
        </div>
      </div>
    </div>
  );
}
