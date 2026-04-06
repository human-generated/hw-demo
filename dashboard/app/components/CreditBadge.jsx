'use client';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { PaymentModal } from './PaymentModal';

export function CreditBadge({ credit = 5, spent = 0, userInitial = 'U', userImage = null, email = '', onCreditUpdate }) {
  const [open, setOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Detect login method from image URL
  const isGoogle = userImage && userImage.includes('googleusercontent.com');
  const loginMethod = isGoogle ? 'Google' : email ? 'Email' : null;

  // Color ring: green ≥$4, orange $1–$4, red <$1
  const bg   = credit >= 4 ? '#16a34a' : credit >= 1 ? '#d97706' : '#dc2626';
  const ring = credit >= 4 ? 'rgba(22,163,74,0.3)' : credit >= 1 ? 'rgba(217,119,6,0.3)' : 'rgba(220,38,38,0.3)';

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <div
          onClick={() => setOpen(o => !o)}
          title={email || `Credits: $${credit.toFixed(2)}`}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: bg,
            boxShadow: `0 0 0 3px ${ring}`,
            color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', userSelect: 'none', flexShrink: 0,
            transition: 'background 0.3s, box-shadow 0.3s',
            overflow: 'hidden', padding: 0,
          }}
        >
          {userImage && !imgFailed
            ? <img src={userImage} alt="" width={30} height={30} style={{ display: 'block', objectFit: 'cover', borderRadius: '50%' }} referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
            : userInitial}
        </div>

        {open && (
          <div className="user-info">
            {/* User identity */}
            <div className="user-info-hd">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: bg, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  boxShadow: `0 0 0 2px ${ring}`,
                }}>
                  {userImage && !imgFailed
                    ? <img src={userImage} alt="" width={38} height={38} style={{ display: 'block', objectFit: 'cover', borderRadius: '50%' }} referrerPolicy="no-referrer" />
                    : userInitial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                    {email || 'Unknown'}
                  </div>
                  {loginMethod && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      {isGoogle && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}>
                        via {loginMethod}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="user-info-credits">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span className="user-info-label">Credits</span>
                <span className="credit-balance" style={{ color: bg }}>${credit.toFixed(2)}</span>
              </div>
              <div className="credit-row" style={{ marginTop: 6 }}>
                <span className="credit-row-label" style={{ fontWeight: 700, color: '#374151' }}>Total used</span>
                <span className="credit-row-val">${spent.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer: top-up + sign out */}
            <div className="user-info-ft">
              <button
                className="credit-topup-btn"
                style={{ opacity: 1, cursor: 'pointer' }}
                onClick={() => { setOpen(false); setShowPayment(true); }}
              >
                Top Up Credits
              </button>
              <button
                className="user-signout-btn"
                onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {showPayment && (
        <PaymentModal
          email={email}
          onClose={() => setShowPayment(false)}
          onSuccess={onCreditUpdate}
        />
      )}
    </>
  );
}
