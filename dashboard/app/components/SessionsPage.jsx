'use client';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { CreditBadge } from './CreditBadge';

const HUMANS_H_PATH = 'M4.626,0 L4.626,10.444 C6.294,8.271 8.342,7.623 10.466,7.623 C15.774,7.623 18.125,11.244 18.125,16.771 L18.121,24.668 C16.577,24.833 15.036,25.005 13.496,25.184 L13.499,16.809 C13.499,13.378 11.717,11.930 9.252,11.930 C6.522,11.930 4.626,14.255 4.626,17.076 L4.622,26.305 C3.744,26.424 2.866,26.546 1.990,26.670 L0,26.681 L0,0 Z';

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
      {/* Background "h" watermark */}
      <svg viewBox="0 0 19 27" style={{
        position: 'absolute', right: '-5%', bottom: '-5%',
        width: '55%', height: 'auto', opacity: 0.04, pointerEvents: 'none',
      }}>
        <path d={HUMANS_H_PATH} fill="#1a1a1a" />
      </svg>

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
          <CreditBadge credit={credit} usage={usage} userInitial={userInitial} />
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
