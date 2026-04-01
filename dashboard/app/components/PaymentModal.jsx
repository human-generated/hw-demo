'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const HEART_RATE = 500;
const HEART_WALLET = '0x3E72695D2dEa794F5Fe1224855951170a2870f27';

// Stripe wordmark — inlined so it never fails to load
function StripeLogo() {
  return (
    <svg height="20" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe">
      <path fillRule="evenodd" clipRule="evenodd" d="M0 13.082C0 7.307 2.794 4 7.82 4c2.466 0 4.247.847 5.63 2.597V4.38h5.877v17.207h-5.877v-2.218C12.067 21.12 10.286 22 7.82 22 2.827 22 0 18.693 0 13.082zm13.45 0c0-2.85-1.35-4.467-3.783-4.467-2.4 0-3.783 1.617-3.783 4.467s1.383 4.434 3.783 4.434c2.433 0 3.783-1.584 3.783-4.434zM22.28 4.38h5.877v2.25c1.25-1.75 3.1-2.63 5.4-2.63 3.816 0 6.443 2.75 6.443 6.9V21.59h-5.877v-9.69c0-1.883-1.017-3.016-2.7-3.016-1.85 0-3.266 1.316-3.266 3.5v9.207H22.28V4.38zm25.77 0v-4h5.877v4H53.5v4.616h-5.45v6.034c0 1.217.583 1.816 1.8 1.816h3.65v4.75h-4.717c-3.8 0-5.61-1.966-5.61-5.566V9.0h-2.6V4.38h2.477z" fill="#635BFF"/>
    </svg>
  );
}

// Credit card icon
function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M6 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M15 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

// Crypto coin icon (token)
function CryptoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M9.5 8h3.2c1.5 0 2.3.7 2.3 1.8 0 .8-.4 1.3-1.1 1.6.9.2 1.5.8 1.5 1.8 0 1.3-1 2-2.6 2H9.5V8z" fill="currentColor" fillOpacity="0.9"/>
      <path d="M11 8v8M13 8v8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

function QRCode({ data, size = 88 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1a1a1a&margin=8`;
  return <img src={url} width={size} height={size} style={{ borderRadius: 8, display: 'block' }} alt="QR" />;
}

export function PaymentModal({ email, onClose, onSuccess }) {
  const [amount, setAmount] = useState('5');
  const [method, setMethod] = useState('card');
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
        body: JSON.stringify({ email, amount: Math.round(usdAmount * 100) }),
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        overflowY: 'auto',
        display: 'flex',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        width: '100%', maxWidth: 400,
        margin: 'auto',
        background: '#fff', borderRadius: 22,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        padding: '26px 24px 22px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111', letterSpacing: '-0.02em' }}>Add Credits</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>Pay once, use anytime</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: '1.4rem', lineHeight: 1, padding: 0, marginTop: 2 }}>×</button>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Amount</div>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: '2px solid rgba(0,0,0,0.1)', borderRadius: 12,
            overflow: 'hidden', background: '#fafafa',
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = '#34c759'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
          >
            <span style={{ padding: '0 0 0 14px', fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>$</span>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              min="1" step="1"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a',
                padding: '12px 14px 12px 4px', outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Pay with</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Card */}
            <button onClick={() => setMethod('card')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
              border: method === 'card' ? '2px solid #34c759' : '2px solid rgba(0,0,0,0.08)',
              background: method === 'card' ? 'rgba(52,199,89,0.06)' : '#fafafa',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}>
              <span style={{ color: method === 'card' ? '#1a9e44' : 'rgba(0,0,0,0.4)' }}><CardIcon /></span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: method === 'card' ? '#1a1a1a' : 'rgba(0,0,0,0.5)' }}>Card</span>
            </button>
            {/* $HEART */}
            <button onClick={() => setMethod('heart')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
              border: method === 'heart' ? '2px solid #e91e8c' : '2px solid rgba(0,0,0,0.08)',
              background: method === 'heart' ? 'rgba(233,30,140,0.05)' : '#fafafa',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}>
              <span style={{ color: method === 'heart' ? '#e91e8c' : 'rgba(0,0,0,0.4)' }}><CryptoIcon /></span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: method === 'heart' ? '#1a1a1a' : 'rgba(0,0,0,0.5)' }}>$HEART</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '0.76rem', color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        {/* Card */}
        {method === 'card' && (
          <>
            <button onClick={handleCardCheckout} disabled={loading || usdAmount < 1} style={{
              width: '100%', padding: '0.8rem',
              background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#28a745)',
              color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
              border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
              cursor: loading || usdAmount < 1 ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', marginBottom: 12,
            }}>
              {loading ? 'Redirecting…' : `Pay $${usdAmount.toFixed(2)} with Card`}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 015 5v2H7V7a5 5 0 015-5zm7 9H5a1 1 0 00-1 1v9a1 1 0 001 1h14a1 1 0 001-1v-9a1 1 0 00-1-1z" fill="#6b7280"/></svg>
              <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>Secured by</span>
              <StripeLogo />
            </div>
          </>
        )}

        {/* $HEART */}
        {method === 'heart' && (
          <>
            <div style={{
              background: '#fdf0f7', borderRadius: 12, padding: '14px',
              marginBottom: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', marginBottom: 4 }}>Send exactly</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e91e8c', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {heartAmount} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>$HEART</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.35)', marginTop: 3 }}>≈ ${usdAmount.toFixed(2)} USD</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <QRCode data={HEART_WALLET} size={80} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Wallet</div>
                <div style={{
                  fontSize: '0.65rem', fontFamily: 'monospace', color: '#1a1a1a',
                  wordBreak: 'break-all', lineHeight: 1.5,
                  background: '#f5f5f5', padding: '7px 9px', borderRadius: 7, marginBottom: 7,
                }}>
                  {HEART_WALLET}
                </div>
                <button onClick={copyWallet} style={{
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: copied ? 'rgba(52,199,89,0.1)' : '#fff',
                  fontSize: '0.7rem', fontWeight: 600,
                  color: copied ? '#1a9e44' : 'rgba(0,0,0,0.6)',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <input
              type="text" value={txHash} onChange={e => setTxHash(e.target.value)}
              placeholder="Transaction hash (0x…)"
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 12,
                padding: '9px 12px', borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.1)', background: '#fafafa',
                fontSize: '0.76rem', fontFamily: 'monospace', color: '#1a1a1a', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = '#e91e8c')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
            />

            <button onClick={handleHeartVerify} disabled={verifying || !txHash.trim()} style={{
              width: '100%', padding: '0.8rem',
              background: verifying || !txHash.trim() ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg,#e91e8c,#c2185b)',
              color: verifying || !txHash.trim() ? 'rgba(0,0,0,0.3)' : '#fff',
              border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
              cursor: verifying || !txHash.trim() ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
            }}>
              {verifying ? 'Verifying…' : 'Verify $HEART Payment'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
