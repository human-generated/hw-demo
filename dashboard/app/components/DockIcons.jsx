'use client';

export function DockIcons({ active, onHome, onCall, onHub, onWorkers, onPlatforms, onAbout }) {
  const hubCb = onHub || onCall; // backward compat
  return (
    <div className="dock-icons">
      <div
        className={`dock-icon ${active === 'home' ? 'dock-icon--active' : ''}`}
        style={{ background: 'linear-gradient(145deg, #f5d4a0 0%, #d4a056 50%, #c48a3a 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(180,130,60,0.3)' }}
        onClick={onHome}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 10L10 4L17 10" stroke="rgba(120,70,20,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9V15.5C5 15.8 5.2 16 5.5 16H8.5V12.5C8.5 12.2 8.7 12 9 12H11C11.3 12 11.5 12.2 11.5 12.5V16H14.5C14.8 16 15 15.8 15 15.5V9" stroke="rgba(120,70,20,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="dock-label">Home</span>
      </div>

      <div
        className={`dock-icon ${active === 'call' || active === 'hub' ? 'dock-icon--active' : ''}`}
        style={{ background: 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 60%, #111 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), inset 0 -1px 2px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)' }}
        onClick={hubCb}
      >
        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.04em', lineHeight: 1 }}>h</span>
        <span className="dock-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Hub</span>
      </div>

      <div
        className={`dock-icon ${active === 'workers' ? 'dock-icon--active' : ''}`}
        style={{ background: 'linear-gradient(145deg, #f8f8f6 0%, #e8e6e0 50%, #dddbd4 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.08)' }}
        onClick={onWorkers}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {[{ x: 5, y: 5, c: '#d97706' }, { x: 10, y: 5, c: '#34c759' }, { x: 15, y: 5, c: '#ef4444' }, { x: 5, y: 10, c: '#f59e0b' }, { x: 10, y: 10, c: '#3b82f6' }, { x: 15, y: 10, c: '#d97706' }, { x: 5, y: 15, c: '#34c759' }, { x: 10, y: 15, c: '#ef4444' }, { x: 15, y: 15, c: '#f59e0b' }].map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="1.8" fill={d.c} opacity="0.7" />
          ))}
        </svg>
        <span className="dock-label">Workers</span>
      </div>

      <div
        className={`dock-icon ${active === 'platforms' ? 'dock-icon--active' : ''}`}
        style={{ background: 'linear-gradient(145deg, #f3f0ff 0%, #ddd6fe 50%, #c4b5fd 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.06), 0 2px 6px rgba(139,92,246,0.18)' }}
        onClick={onPlatforms}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3.5" width="14" height="3.5" rx="1.5" stroke="rgba(109,40,217,0.55)" strokeWidth="1.4" />
          <rect x="3" y="8.5" width="14" height="3.5" rx="1.5" stroke="rgba(109,40,217,0.55)" strokeWidth="1.4" />
          <rect x="3" y="13.5" width="14" height="3.5" rx="1.5" stroke="rgba(109,40,217,0.55)" strokeWidth="1.4" />
          <circle cx="14.5" cy="5.25" r="1" fill="rgba(109,40,217,0.6)" />
          <circle cx="14.5" cy="10.25" r="1" fill="rgba(109,40,217,0.4)" />
          <circle cx="14.5" cy="15.25" r="1" fill="rgba(109,40,217,0.3)" />
        </svg>
        <span className="dock-label">Platforms</span>
      </div>

      <div
        className={`dock-icon ${active === 'about' ? 'dock-icon--active' : ''}`}
        style={{ background: 'linear-gradient(145deg, #fff8ed 0%, #fde68a 50%, #fbbf24 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.06), 0 2px 6px rgba(217,119,6,0.2)' }}
        onClick={onAbout}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 17V8l6-5 6 5v9" stroke="rgba(146,64,14,0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7.5" y="11" width="5" height="6" rx="1" stroke="rgba(146,64,14,0.55)" strokeWidth="1.3" />
          <rect x="8.5" y="7.5" width="3" height="2" rx="0.8" stroke="rgba(146,64,14,0.5)" strokeWidth="1.2" />
        </svg>
        <span className="dock-label">About</span>
      </div>
    </div>
  );
}
