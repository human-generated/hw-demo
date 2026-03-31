'use client';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { CreditBadge } from './CreditBadge';


const PHASE_LABELS = { start: 'Starting', research: 'Research', building: 'Building', platforms: 'Platforms', workers: 'Workers' };
const PHASE_COLORS = { start: '#94a3b8', research: '#3b82f6', building: '#f59e0b', platforms: '#10b981', workers: '#8b5cf6' };

function formatAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function SessionsPage({ user, onNewSession, onSelectSession, onDeleteSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credit, setCredit] = useState(5.00);
  const [usage, setUsage] = useState({ voice: 0, llm: 0, platforms: 0 });

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/demo/sessions');
        const data = await r.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch {}

      // Load user credits
      if (user?.email) {
        try {
          const r = await fetch(`/api/demo/user-profile?email=${encodeURIComponent(user.email)}`);
          const p = await r.json();
          if (p?.credits != null) setCredit(p.credits);
          if (p?.usage) setUsage(p.usage);
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [user?.email]);

  const userInitial = user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#EDF1F3',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Background "humans" wordmark */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <svg viewBox="0 0 156 29" fill="none" preserveAspectRatio="xMidYMid meet"
          style={{ width: '72%', maxWidth: 900, opacity: 1 }}>
          <g transform="translate(-38,-51)">
            <g transform="translate(38,51)" fill="#1a1a1a" opacity="0.045">
              <path d="M5.23,0 L5.23,11.559 C7.116,9.155 9.431,8.437 11.831,8.437 C17.832,8.437 20.49,12.445 20.49,18.562 L20.485,26.449 C18.74,26.633 16.997,26.825 15.257,27.025 L15.26,18.605 C15.26,14.808 13.246,13.205 10.459,13.205 C7.373,13.205 5.23,15.778 5.23,18.9 L5.225,28.274 C3.48,28.507 1.739,28.75 1.442e-13,29 L0,0 L5.23,0 Z M146.784,8.142 C150.085,8.142 152.571,8.775 155.014,10.884 L152.099,14.259 C150.599,12.867 148.884,12.403 146.87,12.403 C144.384,12.403 143.012,13.162 143.012,14.47 C143.012,15.82 144.255,16.58 146.955,16.748 C150.942,17.002 156,17.887 156,23.414 C156,25.514 155.004,27.448 153.019,28.719 L153.022,28.706 C147.824,27.978 142.601,27.324 137.355,26.746 L137.14,26.536 L139.711,22.866 C141.212,24.511 144.641,25.734 146.998,25.776 C148.97,25.819 150.813,24.806 150.813,23.287 C150.813,21.853 149.613,21.262 146.613,21.094 C142.626,20.798 137.868,19.364 137.868,14.639 C137.868,9.83 142.926,8.142 146.784,8.142 Z M125.186,8.395 C130.158,8.395 134.144,12.066 134.144,18.605 L134.15,26.402 C132.408,26.22 130.663,26.047 128.916,25.882 L128.915,18.647 C128.915,15.483 127.157,13.078 123.814,13.078 C120.599,13.078 118.413,15.736 118.413,18.9 L118.418,24.993 C116.69,24.863 114.961,24.742 113.229,24.629 L113.227,8.691 L117.899,8.691 L118.242,11.517 C120.385,9.45 122.528,8.395 125.186,8.395 Z M29.486,8.733 L29.486,20.74 C29.486,22.741 30.189,24.439 31.552,25.416 L31.548,25.401 C29.445,25.578 27.345,25.768 25.248,25.97 C24.61,24.523 24.256,22.782 24.256,20.782 L24.256,8.733 L29.486,8.733 Z M45.174,8.733 L45.171,24.423 C42.837,24.561 40.508,24.714 38.183,24.881 L38.188,24.898 C39.323,23.822 39.988,22.231 39.988,20.487 L39.988,8.733 L45.174,8.733 Z M97.372,8.227 C100.201,8.227 102.902,9.534 104.102,11.602 L104.273,8.733 L109.288,8.733 L109.293,24.386 C106.841,24.244 104.385,24.118 101.924,24.009 L101.922,24.02 C105.715,20.723 104.356,12.825 97.844,12.825 C94.372,12.825 91.585,15.145 91.585,19.111 C91.585,21.06 92.258,22.621 93.355,23.705 L93.357,23.695 C91.256,23.634 89.152,23.586 87.045,23.549 C86.597,22.259 86.356,20.776 86.356,19.111 C86.356,11.939 91.2,8.184 97.372,8.227 Z M60.257,8.353 C62.786,8.353 65.315,9.366 66.515,12.234 C68.401,9.281 70.844,8.437 73.588,8.437 C79.589,8.437 82.546,12.066 82.546,18.309 L82.551,23.49 C80.884,23.475 79.215,23.468 77.545,23.468 L77.317,23.469 L77.317,18.309 C77.317,15.567 76.16,13.247 73.331,13.247 C70.502,13.247 68.744,15.652 68.744,18.394 L68.744,23.538 C66.997,23.566 65.253,23.602 63.51,23.646 L63.515,18.394 C63.515,15.652 62.057,13.162 59.185,13.162 C56.356,13.162 54.685,15.652 54.685,18.394 L54.68,23.943 C52.935,24.016 51.193,24.097 49.452,24.186 L49.455,8.691 L54.299,8.691 L54.685,11.222 C55.799,9.112 58.242,8.353 60.257,8.353 Z"/>
            </g>
          </g>
        </svg>
      </div>

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.1rem 2rem',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: '#1a1a1a', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 19 27" width="11" height="16">
              <path d={HUMANS_H_PATH} fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Humans</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onNewSession}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg,#34c759,#30a74f)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> New Session
          </button>
          <CreditBadge credit={credit} usage={usage} userInitial={userInitial} email={user?.email || ''} />
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              padding: '0.4rem 0.75rem', borderRadius: 7,
              background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = 'rgba(0,0,0,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = 'rgba(0,0,0,0.45)'; }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', position: 'relative', zIndex: 1,
        padding: '2rem',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Welcome */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', letterSpacing: '-0.03em', margin: 0 }}>
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Your Sessions'}
          </h1>
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {sessions.length > 0 ? `${sessions.length} active session${sessions.length !== 1 ? 's' : ''}` : 'No sessions yet — start your first one below'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>Loading…</div>
        ) : sessions.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>✦</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>No sessions yet</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)', marginBottom: '1.5rem' }}>Start a new session to begin your AI back-office demo</div>
            <button
              onClick={onNewSession}
              style={{
                padding: '0.7rem 1.5rem',
                background: 'linear-gradient(135deg,#34c759,#30a74f)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + Start First Session
            </button>
          </div>
        ) : (
          /* Session grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => onSelectSession?.(s)}
                onDelete={() => onDeleteSession?.(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onClick, onDelete }) {
  const phase = session.phase || 'start';
  const phaseColor = PHASE_COLORS[phase] || '#94a3b8';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}
    >
      {/* Company + phase */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', letterSpacing: '-0.02em', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.company?.name || session.company || 'New Session'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>
            {session.company?.industry || ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 20,
            background: phaseColor + '18', color: phaseColor,
            fontSize: '0.68rem', fontWeight: 600,
          }}>
            {PHASE_LABELS[phase] || phase}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete?.(); }}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'transparent', border: 'none',
              color: 'rgba(0,0,0,0.25)', fontSize: '0.8rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,0,0,0.25)'; e.currentTarget.style.background = 'transparent'; }}
          >×</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {session.platforms?.length > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)' }}>
            <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{session.platforms.filter(p => p.status === 'deployed').length}</span> platforms
          </span>
        )}
        {session.workers?.length > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)' }}>
            <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{session.workers.length}</span> workers
          </span>
        )}
        {session.usage?.estimatedCostUsd > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)' }}>
            <span style={{ fontWeight: 700, color: '#1a1a1a' }}>${session.usage.estimatedCostUsd.toFixed(3)}</span> used
          </span>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.3)' }}>
        {formatAgo(session.updatedAt || session.created_at)}
      </div>
    </div>
  );
}
