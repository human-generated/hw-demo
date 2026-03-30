'use client';
import { useState, useEffect, useRef } from 'react';

export function CreditBadge({ credit = 10, usage = { voice: 0, llm: 0, platforms: 0 }, userInitial = 'D' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Color ring: green ≥$10, orange $5–$10, red <$5
  const bg   = credit >= 10 ? '#16a34a' : credit >= 5 ? '#d97706' : '#dc2626';
  const ring = credit >= 10 ? 'rgba(22,163,74,0.3)' : credit >= 5 ? 'rgba(217,119,6,0.3)' : 'rgba(220,38,38,0.3)';
  const spent = Math.max(0, 10 - credit);

  return (
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
            <button className="credit-topup-btn" disabled title="Coming soon">Top Up Credits</button>
            <div className="credit-pay-opts">
              <div className="credit-pay-pill">Stripe</div>
              <div className="credit-pay-pill">$HEART Token</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
