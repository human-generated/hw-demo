'use client';
import { useState, useEffect, useRef } from 'react';

export function CreditBadge({ credit = 10, usage = { voice: 0, llm: 0, platforms: 0 } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const cls = credit <= 0 ? 'credit-zero' : credit < 1 ? 'credit-critical' : credit < 5 ? 'credit-low' : 'credit-ok';
  const balColor = credit <= 0 ? '#94a3b8' : credit < 1 ? '#b91c1c' : credit < 5 ? '#b45309' : '#15803d';
  const spent = Math.max(0, 10 - credit);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={`credit-badge ${cls}`} onClick={() => setOpen(o => !o)}>
        ${credit.toFixed(2)}
      </div>
      {open && (
        <div className="credit-menu">
          <div className="credit-menu-hd">
            <div className="credit-menu-title">Session Credits</div>
            <div className="credit-balance" style={{ color: balColor }}>${credit.toFixed(2)}</div>
          </div>
          <div className="credit-menu-body">
            <div className="credit-row"><span className="credit-row-label">🎙️ Voice exchanges</span><span className="credit-row-val">{usage.voice}× −${(usage.voice * 0.018).toFixed(3)}</span></div>
            <div className="credit-row"><span className="credit-row-label">💬 AI responses</span><span className="credit-row-val">{usage.llm}× −${(usage.llm * 0.010).toFixed(3)}</span></div>
            <div className="credit-row"><span className="credit-row-label">🔧 Platform builds</span><span className="credit-row-val">{usage.platforms}× −${(usage.platforms * 0.050).toFixed(3)}</span></div>
            <div className="credit-sep" />
            <div className="credit-row"><span className="credit-row-label" style={{ fontWeight: 700, color: '#374151' }}>Total used</span><span className="credit-row-val">${spent.toFixed(2)}</span></div>
          </div>
          <div className="credit-menu-ft">
            <button className="credit-topup-btn" disabled title="Coming soon">⚡ Top Up Credits</button>
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
