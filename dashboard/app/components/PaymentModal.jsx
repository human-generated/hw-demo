'use client';
import { useState } from 'react';

// $HEART token — 1 USD = 500 HEART (placeholder rate, update as needed)
const HEART_RATE = 500;
const HEART_WALLET = '0x000000000000000000000000000000000000dEaD'; // TODO: replace with real wallet

function StripeLogo() {
  return (
    <svg width="38" height="16" viewBox="0 0 60 25" fill="none" aria-label="Stripe">
      <path d="M27.67 8.3c0-1.34 1.1-1.86 2.92-1.86 2.61 0 5.91.79 8.52 2.2V3.13C36.6 1.47 33.67.78 30.6.78c-6.03 0-10.04 3.15-10.04 8.4 0 8.2 11.3 6.88 11.3 10.41 0 1.58-1.37 2.1-3.29 2.1-2.84 0-6.47-.94-9.35-3.08v5.65c3.19 1.38 6.4 1.97 9.35 1.97 6.19 0 10.44-3.07 10.44-8.38 0-8.87-11.34-7.28-11.34-9.55zm-18.56 17.8V10.77H14V.8H.29v25.3H9.1zm36.14 0v-9.07c.86.08 1.73.13 2.6.13 7.84 0 12.56-3.96 12.56-10.6C60.41 0 55.86 0 50.93 0c-2.17 0-4.46.13-6.57.44l-.12 25.66h.01zm2.6-14.74V4.9c.42-.05.85-.07 1.27-.07 2.96 0 4.7 1.47 4.7 4.27 0 2.96-1.74 4.27-4.7 4.27-.43 0-.85-.02-1.27-.01z" fill="#635BFF"/>
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function HeartTokenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6"/>
      <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="system-ui">$</text>
    </svg>
  );
}

function QRCode({ data, size = 120 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1a1a1a&margin=10`;
  return <img src={url} width={size} height={size} style={{ borderRadius: 8, display: 'block' }} alt="QR code" />;
}

export function PaymentModal({ email, onClose, onSuccess }) {
  const [amount, setAmount] = useState('5');
  const [method, setMethod] = useState('card'); // 'card' | 'heart'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const usdAmount = Math.max(1, parseFloat(amount) || 5);
  const heartAmount = Math.round(usdAmount * HEART_RATE).toLocaleString();

  async function handleCardCheckout() {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: Math.round(usdAmount * 100) }), // cents
      });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || 'Failed to create checkout');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleHeartVerify() {
    if (!txHash.trim()) return;
    setError('');
    setVerifying(true);
    try {
      const r = await fetch('/api/payments/verify-heart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, txHash: txHash.trim(), usdAmount }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Verification failed');
      onSuccess?.(data.newBalance);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  }

  function copyWallet() {
    navigator.clipboard?.writeText(HEART_WALLET).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{
        width: 420, background: '#fff', borderRadius: 22,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        padding: '30px 28px 26px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#111', letterSpacing: '-0.02em' }}>Add Credits</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>Pay once, use anytime</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: '1.4rem', lineHeight: 1, padding: 0, marginTop: 2 }}>×</button>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Amount</div>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: '2px solid rgba(0,0,0,0.1)', borderRadius: 12,
            overflow: 'hidden', background: '#fafafa',
            transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = '#34c759'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
          >
            <span style={{ padding: '0 0 0 16px', fontSize: '1.6rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              step="1"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '1.6rem', fontWeight: 700, color: '#1a1a1a',
                padding: '14px 16px 14px 6px', outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[5, 10, 25, 50].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 8, cursor: 'pointer',
                  border: amount === String(v) ? '1.5px solid #34c759' : '1.5px solid rgba(0,0,0,0.08)',
                  background: amount === String(v) ? 'rgba(52,199,89,0.07)' : '#fafafa',
                  fontSize: '0.78rem', fontWeight: 600,
                  color: amount === String(v) ? '#1a9e44' : 'rgba(0,0,0,0.55)',
                  transition: 'all 0.12s',
                }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Payment method toggle */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Pay with</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setMethod('card')}
              style={{
                flex: 1, padding: '13px 12px', borderRadius: 12, cursor: 'pointer',
                border: method === 'card' ? '2px solid #34c759' : '2px solid rgba(0,0,0,0.08)',
                background: method === 'card' ? 'rgba(52,199,89,0.06)' : '#fafafa',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
              <span style={{ color: method === 'card' ? '#1a9e44' : 'rgba(0,0,0,0.45)' }}><CardIcon /></span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: method === 'card' ? '#1a1a1a' : 'rgba(0,0,0,0.5)', letterSpacing: '-0.01em' }}>Card</span>
            </button>
            <button
              onClick={() => setMethod('heart')}
              style={{
                flex: 1, padding: '13px 12px', borderRadius: 12, cursor: 'pointer',
                border: method === 'heart' ? '2px solid #e91e8c' : '2px solid rgba(0,0,0,0.08)',
                background: method === 'heart' ? 'rgba(233,30,140,0.05)' : '#fafafa',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
              <span style={{ color: method === 'heart' ? '#e91e8c' : 'rgba(0,0,0,0.45)' }}><HeartTokenIcon /></span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: method === 'heart' ? '#1a1a1a' : 'rgba(0,0,0,0.5)', letterSpacing: '-0.01em' }}>$HEART</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '0.76rem', color: '#dc2626', marginBottom: 14, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        {/* Card payment */}
        {method === 'card' && (
          <>
            <button
              onClick={handleCardCheckout}
              disabled={loading || usdAmount < 1}
              style={{
                width: '100%', padding: '0.85rem',
                background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#28a745)',
                color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', borderRadius: 12,
                fontSize: '0.95rem', fontWeight: 700,
                cursor: loading || usdAmount < 1 ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s', marginBottom: 14,
              }}
            >
              {loading ? 'Redirecting to Stripe…' : `Pay $${usdAmount.toFixed(2)} with Card`}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.45 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 015 5v2H7V7a5 5 0 015-5zm7 9H5a1 1 0 00-1 1v9a1 1 0 001 1h14a1 1 0 001-1v-9a1 1 0 00-1-1z" fill="#6b7280"/></svg>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Secured by</span>
              <StripeLogo />
            </div>
          </>
        )}

        {/* $HEART payment */}
        {method === 'heart' && (
          <div>
            <div style={{
              background: '#fdf0f7', borderRadius: 14, padding: '18px',
              marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginBottom: 6, letterSpacing: '0.03em' }}>
                Send exactly
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#e91e8c', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {heartAmount} <span style={{ fontSize: '1rem', opacity: 0.7 }}>$HEART</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>
                ≈ ${usdAmount.toFixed(2)} USD
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <QRCode data={HEART_WALLET} size={88} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Wallet Address
                </div>
                <div style={{
                  fontSize: '0.68rem', fontFamily: 'monospace', color: '#1a1a1a',
                  wordBreak: 'break-all', lineHeight: 1.6,
                  background: '#f5f5f5', padding: '8px 10px', borderRadius: 8,
                  marginBottom: 8,
                }}>
                  {HEART_WALLET}
                </div>
                <button
                  onClick={copyWallet}
                  style={{
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: copied ? 'rgba(52,199,89,0.1)' : '#fff',
                    fontSize: '0.72rem', fontWeight: 600,
                    color: copied ? '#1a9e44' : 'rgba(0,0,0,0.6)',
                    transition: 'all 0.15s',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                  {copied ? '✓ Copied' : 'Copy address'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Paste transaction hash after sending
              </div>
              <input
                type="text"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px', borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,0.1)', background: '#fafafa',
                  fontSize: '0.78rem', fontFamily: 'monospace', color: '#1a1a1a',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#e91e8c')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
              />
            </div>

            <button
              onClick={handleHeartVerify}
              disabled={verifying || !txHash.trim()}
              style={{
                width: '100%', padding: '0.85rem',
                background: verifying || !txHash.trim() ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg,#e91e8c,#c2185b)',
                color: verifying || !txHash.trim() ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', borderRadius: 12,
                fontSize: '0.95rem', fontWeight: 700,
                cursor: verifying || !txHash.trim() ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s',
              }}>
              {verifying ? 'Verifying on-chain…' : 'Verify $HEART Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
