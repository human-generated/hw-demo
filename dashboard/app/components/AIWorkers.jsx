'use client';
import { MeshGradient } from '@paper-design/shaders-react';
import { DockIcons } from './DockIcons';

const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const WORKERS = [
  { name: 'Alexandra\nSeaman', role: 'HR at Humans.AI', tilt: -12, code: 'HRMANAGER', status: 'Active', tasks: 24, rating: 4.9 },
  { name: 'Marcus\nChen', role: 'Sales at Humans.AI', tilt: 8, code: 'SALESREP0', status: 'Active', tasks: 31, rating: 4.7 },
  { name: 'Elena\nVasquez', role: 'Legal at Humans.AI', tilt: -6, code: 'LEGALADV0', status: 'Active', tasks: 18, rating: 4.8 },
  { name: 'James\nPark', role: 'Finance at Humans.AI', tilt: 15, code: 'FINANALYS', status: 'Busy', tasks: 42, rating: 4.6 },
  { name: 'Aisha\nOkonkwo', role: 'Research at Humans.AI', tilt: -18, code: 'RESEARCHER', status: 'Active', tasks: 15, rating: 5.0 },
  { name: 'Sophia\nBerg', role: 'Engineering at Humans.AI', tilt: 10, code: 'ENGINEER0', status: 'Active', tasks: 37, rating: 4.8 },
  { name: 'Liam\nTaylor', role: 'Marketing at Humans.AI', tilt: -9, code: 'MARKETING', status: 'Idle', tasks: 22, rating: 4.5 },
  { name: 'Nina\nRoss', role: 'Design at Humans.AI', tilt: 20, code: 'DESIGNER0', status: 'Active', tasks: 29, rating: 4.9 },
];

function BarcodeSvg() {
  const bars = [
    { x: 0, w: 1.5 }, { x: 4, w: 3 }, { x: 9, w: 1 }, { x: 12, w: 2.5 },
    { x: 16, w: 1 }, { x: 19, w: 3 }, { x: 24, w: 1.5 }, { x: 27, w: 1 },
    { x: 30, w: 2.5 }, { x: 34, w: 1.5 }, { x: 38, w: 3 }, { x: 43, w: 1 },
    { x: 46, w: 2 }, { x: 50, w: 1.5 }, { x: 53, w: 3 }, { x: 58, w: 1 },
    { x: 61, w: 2.5 }, { x: 65, w: 1.5 }, { x: 68, w: 3 }, { x: 73, w: 1 },
    { x: 76, w: 2.5 },
  ];
  return (
    <svg width="56" height="17" viewBox="0 0 80 24" fill="none" style={{ opacity: 0.2, flexShrink: 0 }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}

function StatusDot({ status }) {
  const color = status === 'Active' ? '#34c759' : status === 'Busy' ? '#ff9500' : '#8e8e93';
  return <span className="aw-status-dot" style={{ background: color }} />;
}

export function AIWorkers({ companyName = 'Humans.AI', onSelectWorker, onGoHome, onGoCall }) {
  return (
    <div className="aw">
      <MeshGradient
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        speed={0.19} scale={1.51} distortion={0.88} swirl={1}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      {/* Menu Bar */}
      <nav className="aw-menu">
        <div className="aw-menu-left">
          <span className="aw-menu-logo">h</span>
          <div className="aw-menu-sep" />
          <span className="aw-menu-label">{companyName}</span>
        </div>
        <div className="aw-menu-center">
          <DockIcons active="workers" onHome={onGoHome} onCall={onGoCall} onWorkers={() => {}} />
        </div>
        <div className="aw-menu-right">
          <div className="aw-menu-avatar">S</div>
        </div>
      </nav>

      {/* Content */}
      <div className="aw-content">
        <div className="aw-tab-workers">
          <div className="aw-grid">
            {WORKERS.map((w, i) => (
              <div key={i} className="aw-worker" style={{ '--tilt': `${w.tilt}deg` }}>
                <div className="aw-photo-wrap">
                  <div className="aw-photo" style={{
                    backgroundImage: `radial-gradient(ellipse 51% 51% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${PHOTO_URL})`,
                    backgroundSize: 'auto, 130%', backgroundPosition: '0% 0%, center 15%',
                    filter: 'contrast(1.06)', transform: `rotate(calc(-1 * var(--tilt)))`,
                  }} />
                </div>
                <div className="aw-badge-overlay">
                  <div className="aw-badge-inner">
                    <div className="aw-badge-green" />
                    <div className="aw-badge-status"><StatusDot status={w.status} /><span>{w.status}</span></div>
                    <div className="aw-badge-photo" style={{
                      backgroundImage: `radial-gradient(ellipse 51% 51% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${PHOTO_URL})`,
                      backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
                    }} />
                    <div className="aw-badge-info">
                      <span className="aw-badge-name">{w.name}</span>
                      <span className="aw-badge-role">{w.role}</span>
                    </div>
                    <div className="aw-badge-stats">
                      <div className="aw-badge-stat"><span className="aw-badge-stat-val">{w.tasks}</span><span className="aw-badge-stat-label">Tasks</span></div>
                      <div className="aw-badge-stat-sep" />
                      <div className="aw-badge-stat"><span className="aw-badge-stat-val">{w.rating}</span><span className="aw-badge-stat-label">Rating</span></div>
                    </div>
                    <div className="aw-badge-bottom">
                      <div className="aw-badge-verif"><span>VERIFIEDAIHUMAN{'<<<<<'}</span><span>{w.code}{'<<<<<<<<<<<'}</span></div>
                      <BarcodeSvg />
                    </div>
                    <div className="aw-badge-actions">
                      <button className="aw-btn aw-btn--call" onClick={(e) => { e.stopPropagation(); onGoCall?.(); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="2" /></svg>
                        Call
                      </button>
                      <button className="aw-btn aw-btn--view" onClick={(e) => { e.stopPropagation(); onSelectWorker?.(); }}>View</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="aw-new-worker"><span className="aw-new-plus">+</span><span className="aw-new-label">New Worker</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
