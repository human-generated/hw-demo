'use client';
import { useState, useEffect, useRef } from 'react';
import { LiquidMetal } from '@paper-design/shaders-react';
import { CreditBadge } from './CreditBadge';

const H_MASK_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 19 27'%3E%3Cpath d='M4.626%2C0 L4.626%2C10.444 C6.294%2C8.271 8.342%2C7.623 10.466%2C7.623 C15.774%2C7.623 18.125%2C11.244 18.125%2C16.771 L18.121%2C24.668 C16.577%2C24.833 15.036%2C25.005 13.496%2C25.184 L13.499%2C16.809 C13.499%2C13.378 11.717%2C11.930 9.252%2C11.930 C6.522%2C11.930 4.626%2C14.255 4.626%2C17.076 L4.622%2C26.305 C3.744%2C26.424 2.866%2C26.546 1.990%2C26.670 L0%2C26.681 L0%2C0 Z' fill='black'/%3E%3C/svg%3E")`;

const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

function UserAvatar({ user, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const initial = user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#1a1a1a', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.38, fontWeight: 700,
      boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
    }}>
      {user?.image && !failed
        ? <img src={user.image} alt="" referrerPolicy="no-referrer"
            style={{ display: 'block', objectFit: 'cover', width: '100%', height: '100%' }}
            onError={() => setFailed(true)} />
        : initial}
    </div>
  );
}

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

export function SessionsPage({ user, onNewSession, onSelectSession, onDeleteSession, workerSession, callEnabled, onCallEnabled, onCallDisabled, onCreditUpdate, onGoAdmin, onSessionsLoaded }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credit, setCredit] = useState(5.00);
  const [spent, setSpent] = useState(0);
  const [textInput, setTextInput] = useState('');

  const {
    connected, connecting, agentMarkdown, agentText,
    videoTrack, micMuted, toggleMute, interrupt, sendText, disconnect,
  } = workerSession || {};

  function handleEndCall() {
    disconnect?.();
    onCallDisabled?.();
  }

  // Avatar video attachment
  const avatarVideoRef = useRef(null);
  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

  // Sessions load
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/demo/sessions');
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        onSessionsLoaded?.(list);
      } catch {}

      if (user?.email) {
        try {
          const r = await fetch(`/api/demo/user-profile?email=${encodeURIComponent(user.email)}`);
          const p = await r.json();
          if (p?.credits != null) setCredit(p.credits);
          if (p?.usage) setSpent(((p.usage.voice || 0) * 0.018) + ((p.usage.llm || 0) * 0.010) + ((p.usage.platforms || 0) * 0.050));
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [user?.email]);

  // Nav marker: <<NAV:new>> → new session; <<NAV:Name>> → open matching session
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  useEffect(() => {
    if (!agentMarkdown) return;
    const m = agentMarkdown.match(/<<NAV:([^>]+)>>/);
    if (!m) return;
    const marker = m[1].trim();
    if (!marker) return;

    if (marker.toLowerCase() === 'new') {
      onNewSession?.();
      return;
    }

    const lc = marker.toLowerCase().replace(/\s+/g, '');
    const match = sessionsRef.current.find(s => {
      const name = (s.company?.name || s.company || '').toLowerCase().replace(/\s+/g, '');
      return s.id === marker || name === lc || name.includes(lc) || lc.includes(name);
    });
    if (match) onSelectSession?.(match);
  }, [agentMarkdown]);

  const agentMarkdownClean = (agentMarkdown || '').replace(/<<NAV:[^>]+>>/g, '').trim();

  const userInitial = user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U';
  const isAdmin = user?.isAdmin || user?.email === 'dragos.costea@humans.ai';

  function handleSend() {
    const t = textInput.trim();
    if (!t || !sendText) return;
    sendText(t);
    setTextInput('');
  }

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

      {/* Floating navbar */}
      <div style={{
        position: 'fixed', top: 11, left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)', maxWidth: 1200, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingInline: 24, borderRadius: 16,
        background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 22, height: 30, flexShrink: 0,
            WebkitMaskImage: H_MASK_SVG, maskImage: H_MASK_SVG,
            WebkitMaskSize: 'contain', maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
            overflow: 'hidden',
          }}>
            <LiquidMetal speed={1} softness={0.1} repetition={2}
              shiftRed={0.3} shiftBlue={0.3} distortion={0.07}
              contour={0.4} scale={2.88} rotation={0}
              shape="diamond" angle={70}
              colorBack="#00000000" colorTint="#FFFFFF"
              style={{ backgroundColor: '#1a1a1a', width: 22, height: 30 }}
            />
          </div>
          <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(0,0,0,0.65)', letterSpacing: '-0.3px' }}>humans</span>
          <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.08)', display: 'inline-block' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>Enterprise</span>
          <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.08)', display: 'inline-block' }} />
          <UserAvatar user={user} size={28} />
          {user?.name && (
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.65)', letterSpacing: '-0.1px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name.split(' ')[0]}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isAdmin && onGoAdmin && (
            <button
              onClick={onGoAdmin}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: 7,
                background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
                fontSize: '0.75rem', fontWeight: 700, color: '#92400e',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Admin
            </button>
          )}
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
          <CreditBadge credit={credit} spent={spent} userInitial={userInitial} userImage={user?.image || null} email={user?.email || ''} onCreditUpdate={onCreditUpdate} />
        </div>
      </div>

      {/* Main content — top padding to clear fixed navbar, row layout */}
      <div style={{
        flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1,
        paddingTop: 78,
        display: 'flex', flexDirection: 'row', gap: 0,
      }}>
        {/* ── Agent panel (left) ── */}
        <div style={{
          width: 300, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          padding: '10px 0 16px 16px',
          gap: 10,
        }}>
          {/* Avatar card */}
          <div style={{
            flex: '0 0 auto',
            borderRadius: 18,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
            aspectRatio: '4/5',
            position: 'relative',
          }}>
            {connected && videoTrack ? (
              <video
                ref={avatarVideoRef}
                autoPlay playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <img
                src={PHOTO_URL}
                alt="Alexandra"
                onClick={!connecting && onCallEnabled ? onCallEnabled : undefined}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: !connecting && onCallEnabled ? 'pointer' : 'default' }}
              />
            )}
            {/* Status badge */}
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
              borderRadius: 20, padding: '4px 10px 4px 8px',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: connected ? '#34c759' : (connecting ? '#f59e0b' : 'rgba(255,255,255,0.3)'),
              }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>
                Alexandra
              </span>
            </div>
            {/* Controls — start call or in-call controls */}
            {!connected && !connecting && onCallEnabled && (
              <button
                onClick={onCallEnabled}
                title="Start call with Alexandra"
                style={{
                  position: 'absolute', bottom: 10, right: 10,
                  width: 34, height: 34, borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(52,199,89,0.9)', backdropFilter: 'blur(8px)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.4)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {connected && (
              <div style={{
                position: 'absolute', bottom: 10, right: 10,
                display: 'flex', gap: 5,
              }}>
                <button
                  onClick={() => toggleMute?.()}
                  title={micMuted ? 'Unmute' : 'Mute'}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: micMuted ? 'rgba(255,59,48,0.7)' : 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  {micMuted
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  }
                </button>
                <button
                  onClick={() => interrupt?.()}
                  title="Interrupt"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
                </button>
                <button
                  onClick={handleEndCall}
                  title="End call"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,59,48,0.8)', backdropFilter: 'blur(8px)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" fill="currentColor"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Speech bubble */}
          <div style={{
            flex: 1,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            padding: '12px 14px',
            overflowY: 'auto',
            minHeight: 60,
          }}>
            {agentMarkdownClean ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                {agentMarkdownClean}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(0,0,0,0.3)', lineHeight: 1.5 }}>
                {connecting ? 'Connecting…' : connected ? 'Listening…' : 'Say something or type below'}
              </p>
            )}
          </div>

          {/* Text input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message…"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: '0.8rem',
                color: '#1a1a1a',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!textInput.trim() || !sendText}
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: textInput.trim() && sendText ? '#1a1a1a' : 'rgba(0,0,0,0.08)',
                border: 'none', cursor: textInput.trim() && sendText ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: textInput.trim() && sendText ? '#fff' : 'rgba(0,0,0,0.25)',
                transition: 'background 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── Sessions area (right) ── */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '10px 16px 16px',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Welcome */}
          <div style={{ marginBottom: '1.5rem' }}>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              alignContent: 'start',
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.3)' }}>
        {formatAgo(session.updatedAt || session.created_at)}
      </div>
    </div>
  );
}
