'use client';
import { useState, useEffect, useRef } from 'react';
import { PaymentModal } from './PaymentModal';

function StripeLogo() {
  return (
    <svg width="34" height="14" viewBox="0 0 60 25" fill="none" aria-label="Stripe">
      <path d="M27.67 8.3c0-1.34 1.1-1.86 2.92-1.86 2.61 0 5.91.79 8.52 2.2V3.13C36.6 1.47 33.67.78 30.6.78c-6.03 0-10.04 3.15-10.04 8.4 0 8.2 11.3 6.88 11.3 10.41 0 1.58-1.37 2.1-3.29 2.1-2.84 0-6.47-.94-9.35-3.08v5.65c3.19 1.38 6.4 1.97 9.35 1.97 6.19 0 10.44-3.07 10.44-8.38 0-8.87-11.34-7.28-11.34-9.55zm-18.56 17.8V10.77H14V.8H.29v25.3H9.1zm36.14 0v-9.07c.86.08 1.73.13 2.6.13 7.84 0 12.56-3.96 12.56-10.6C60.41 0 55.86 0 50.93 0c-2.17 0-4.46.13-6.57.44l-.12 25.66h.01zm2.6-14.74V4.9c.42-.05.85-.07 1.27-.07 2.96 0 4.7 1.47 4.7 4.27 0 2.96-1.74 4.27-4.7 4.27-.43 0-.85-.02-1.27-.01z" fill="#635BFF"/>
    </svg>
  );
}

export function CreditBadge({ credit = 5, usage = { voice: 0, llm: 0, platforms: 0 }, userInitial = 'U', email = '', onCreditUpdate }) {
  const [open, setOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Color ring: green ≥$4, orange $1–$4, red <$1
  const bg   = credit >= 4 ? '#16a34a' : credit >= 1 ? '#d97706' : '#dc2626';
  const ring = credit >= 4 ? 'rgba(22,163,74,0.3)' : credit >= 1 ? 'rgba(217,119,6,0.3)' : 'rgba(220,38,38,0.3)';
  const spent = Math.max(0, 5 - credit);

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <div
          onClick={() => setOpen(o => !o)}
          title={`Credits: $${credit.toFixed(2)}`}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: bg,
            boxShadow: `0 0 0 3px ${ring}`,
            color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', userSelect: 'none', flexShrink: 0,
            transition: 'background 0.3s, box-shadow 0.3s',
          }}
        >
          {userInitial}
        </div>

        {open && (
          <div className="credit-menu">
            <div className="credit-menu-hd">
              <div className="credit-menu-title">Credits</div>
              <div className="credit-balance" style={{ color: bg }}>${credit.toFixed(2)}</div>
            </div>
            <div className="credit-menu-body">
              <div className="credit-row"><span className="credit-row-label">Voice exchanges</span><span className="credit-row-val">{usage.voice}× −${(usage.voice * 0.018).toFixed(3)}</span></div>
              <div className="credit-row"><span className="credit-row-label">AI responses</span><span className="credit-row-val">{usage.llm}× −${(usage.llm * 0.010).toFixed(3)}</span></div>
              <div className="credit-row"><span className="credit-row-label">Platform builds</span><span className="credit-row-val">{usage.platforms}× −${(usage.platforms * 0.050).toFixed(3)}</span></div>
              <div className="credit-sep" />
              <div className="credit-row"><span className="credit-row-label" style={{ fontWeight: 700, color: '#374151' }}>Total used</span><span className="credit-row-val">${spent.toFixed(2)}</span></div>
            </div>
            <div className="credit-menu-ft">
              <button
                className="credit-topup-btn"
                style={{ opacity: 1, cursor: 'pointer' }}
                onClick={() => { setOpen(false); setShowPayment(true); }}
              >
                Top Up Credits
              </button>
              <div className="credit-pay-opts">
                <div className="credit-pay-pill" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StripeLogo />
                  <span>Card</span>
                </div>
                <div className="credit-pay-pill">$HEART</div>
              </div>
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
