'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { MeshGradient, HalftoneDots, FlutedGlass } from '@paper-design/shaders-react';
import { useWorkerSession } from './useWorkerSession';

// ── Constants (same as Homepage) ─────────────────────────────────────────────
const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';
const CLASP_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJWH9TN7PGJARNM3D4GSKEJ.png';
const ALEXANDRA_WORKER = { id: 'alexandra-homepage', name: 'Alexandra Seaman', role: 'HR at Humans.AI' };
const LANDING_PROMPT = `You are Alexandra, HR at Humans — welcoming visitors to the platform. Say hello and ask who they are and what company they work for. Keep responses very short (1-2 sentences).`;
const CALL_LIMIT_SECS = 60;

const BARS = [
  { x: 0, w: 1.5 }, { x: 4, w: 3 }, { x: 9, w: 1 }, { x: 12, w: 2.5 },
  { x: 16, w: 1 }, { x: 19, w: 3 }, { x: 24, w: 1.5 }, { x: 27, w: 1 },
  { x: 30, w: 2.5 }, { x: 34, w: 1.5 }, { x: 38, w: 3 }, { x: 43, w: 1 },
  { x: 46, w: 2 }, { x: 50, w: 1.5 }, { x: 53, w: 3 }, { x: 58, w: 1 },
  { x: 61, w: 2.5 }, { x: 65, w: 1.5 }, { x: 68, w: 3 }, { x: 73, w: 1 },
  { x: 76, w: 2.5 },
];
function BarcodeSvg() {
  return (
    <svg width="69" height="21" viewBox="0 0 80 24" fill="none">
      {BARS.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// Cursor tracking — same as Homepage
function useCursorTracking(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, rafId;
    function animate() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      el.style.setProperty('--mx', currentX.toFixed(4));
      el.style.setProperty('--my', currentY.toFixed(4));
      rafId = requestAnimationFrame(animate);
    }
    function onMouseMove(e) { targetX = (e.clientX / window.innerWidth - 0.5) * 2; targetY = (e.clientY / window.innerHeight - 0.5) * 2; }
    function onMouseLeave() { targetX = 0; targetY = 0; }
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(animate);
    return () => { window.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseleave', onMouseLeave); cancelAnimationFrame(rafId); };
  }, [ref]);
}

export function LandingPage({ onLogin }) {
  const [ready, setReady] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [avatarEnergy, setAvatarEnergy] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CALL_LIMIT_SECS);
  const [callEnded, setCallEnded] = useState(false);
  const [callEnabled, setCallEnabled] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const badgeGroupRef = useRef(null);
  const avatarVideoRef = useRef(null);
  const energyRafRef = useRef(0);
  const landingSessionId = useRef(`landing-${Date.now()}`);

  useCursorTracking(badgeGroupRef);

  // Start session
  const workerSession = useWorkerSession({
    worker: ALEXANDRA_WORKER,
    sessionId: landingSessionId.current,
    enabled: callEnabled,
    audioEnabled: true,
    videoEnabled,
    systemPrompt: LANDING_PROMPT,
    mode: 'homepage',
  });

  const { connected, connecting, videoTrack, micMuted, needsAudioResume,
    resumeAudio, toggleMute, interrupt, audioElRef } = workerSession || {};

  // Attach video
  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

  // Ready state (triggers CSS animations)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Energy pulse while speaking
  useEffect(() => {
    if (!callEnabled || !connected) { setAvatarEnergy(0); return; }
    let v = 0;
    function tick() {
      v = Math.max(0, v - 0.04 + (Math.random() < 0.15 ? Math.random() * 0.3 : 0));
      setAvatarEnergy(v);
      energyRafRef.current = requestAnimationFrame(tick);
    }
    energyRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(energyRafRef.current);
  }, [callEnabled, connected]);

  // 1-minute call timeout
  useEffect(() => {
    if (!callEnabled) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCallEnabled(false);
          setCallEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [callEnabled]);

  async function handleCredentials(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.ok) { onLogin?.(); }
    else { setError('Invalid credentials.'); }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/' });
  }

  const inp = {
    padding: '0.6rem 0.8rem', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)',
    fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: '#1a1a1a', transition: 'border-color 0.15s',
  };

  return (
    <div className={`hp ${ready ? 'hp--ready' : ''}`}>
      {audioElRef && <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />}

      {/* Background mesh gradient */}
      <MeshGradient
        className="hp-bg"
        speed={0.19 + avatarEnergy * 3}
        scale={1.51 + avatarEnergy * 1.5}
        distortion={0.88 + avatarEnergy * 3}
        swirl={1 + avatarEnergy * 5}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      {/* Humans wordmark SVG watermark in the background */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 0,
        overflow: 'hidden',
      }}>
        <svg
          viewBox="0 0 156 29" fill="none" preserveAspectRatio="xMidYMid meet"
          style={{ width: '72%', maxWidth: 900, opacity: 1 }}
        >
          <g transform="translate(-38,-51)">
            <g transform="translate(38,51)" fill="#1a1a1a" opacity="0.045">
              <path d="M5.23,0 L5.23,11.559 C7.116,9.155 9.431,8.437 11.831,8.437 C17.832,8.437 20.49,12.445 20.49,18.562 L20.485,26.449 C18.74,26.633 16.997,26.825 15.257,27.025 L15.26,18.605 C15.26,14.808 13.246,13.205 10.459,13.205 C7.373,13.205 5.23,15.778 5.23,18.9 L5.225,28.274 C3.48,28.507 1.739,28.75 1.442e-13,29 L0,0 L5.23,0 Z M146.784,8.142 C150.085,8.142 152.571,8.775 155.014,10.884 L152.099,14.259 C150.599,12.867 148.884,12.403 146.87,12.403 C144.384,12.403 143.012,13.162 143.012,14.47 C143.012,15.82 144.255,16.58 146.955,16.748 C150.942,17.002 156,17.887 156,23.414 C156,25.514 155.004,27.448 153.019,28.719 L153.022,28.706 C147.824,27.978 142.601,27.324 137.355,26.746 L137.14,26.536 L139.711,22.866 C141.212,24.511 144.641,25.734 146.998,25.776 C148.97,25.819 150.813,24.806 150.813,23.287 C150.813,21.853 149.613,21.262 146.613,21.094 C142.626,20.798 137.868,19.364 137.868,14.639 C137.868,9.83 142.926,8.142 146.784,8.142 Z M125.186,8.395 C130.158,8.395 134.144,12.066 134.144,18.605 L134.15,26.402 C132.408,26.22 130.663,26.047 128.916,25.882 L128.915,18.647 C128.915,15.483 127.157,13.078 123.814,13.078 C120.599,13.078 118.413,15.736 118.413,18.9 L118.418,24.993 C116.69,24.863 114.961,24.742 113.229,24.629 L113.227,8.691 L117.899,8.691 L118.242,11.517 C120.385,9.45 122.528,8.395 125.186,8.395 Z M29.486,8.733 L29.486,20.74 C29.486,22.741 30.189,24.439 31.552,25.416 L31.548,25.401 C29.445,25.578 27.345,25.768 25.248,25.97 C24.61,24.523 24.256,22.782 24.256,20.782 L24.256,8.733 L29.486,8.733 Z M45.174,8.733 L45.171,24.423 C42.837,24.561 40.508,24.714 38.183,24.881 L38.188,24.898 C39.323,23.822 39.988,22.231 39.988,20.487 L39.988,8.733 L45.174,8.733 Z M97.372,8.227 C100.201,8.227 102.902,9.534 104.102,11.602 L104.273,8.733 L109.288,8.733 L109.293,24.386 C106.841,24.244 104.385,24.118 101.924,24.009 L101.922,24.02 C105.715,20.723 104.356,12.825 97.844,12.825 C94.372,12.825 91.585,15.145 91.585,19.111 C91.585,21.06 92.258,22.621 93.355,23.705 L93.357,23.695 C91.256,23.634 89.152,23.586 87.045,23.549 C86.597,22.259 86.356,20.776 86.356,19.111 C86.356,11.939 91.2,8.184 97.372,8.227 Z M60.257,8.353 C62.786,8.353 65.315,9.366 66.515,12.234 C68.401,9.281 70.844,8.437 73.588,8.437 C79.589,8.437 82.546,12.066 82.546,18.309 L82.551,23.49 C80.884,23.475 79.215,23.468 77.545,23.468 L77.317,23.469 L77.317,18.309 C77.317,15.567 76.16,13.247 73.331,13.247 C70.502,13.247 68.744,15.652 68.744,18.394 L68.744,23.538 C66.997,23.566 65.253,23.602 63.51,23.646 L63.515,18.394 C63.515,15.652 62.057,13.162 59.185,13.162 C56.356,13.162 54.685,15.652 54.685,18.394 L54.68,23.943 C52.935,24.016 51.193,24.097 49.452,24.186 L49.455,8.691 L54.299,8.691 L54.685,11.222 C55.799,9.112 58.242,8.353 60.257,8.353 Z"/>
            </g>
          </g>
        </svg>
      </div>

      {/* ── Badge (identical to Homepage) ── */}
      <div className="hp-badge-group" ref={badgeGroupRef}>
        <div className="hp-lanyard-strip" />
        <img src={CLASP_URL} alt="" className="hp-clasp" />
        <div className="hp-badge-link" />

        <div className={`hp-badge ${callEnabled && connected ? 'hp-badge--video' : ''}`}>
          <HalftoneDots
            className="hp-halftone"
            contrast={0.4} originalColors={false} inverted={false}
            grid="hex" radius={1.25} size={0.5} scale={1}
            image="https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJXTHPGMG9MAJEECY8HR99R.png"
            grainMixer={0.2} grainOverlay={0.2} grainSize={0.5} type="gooey" fit="cover"
            colorFront="#84A0A5" colorBack="#00000000" style={{ backgroundColor: '#F2F8F4' }}
          />
          <FlutedGlass
            className="hp-glass"
            size={0.95} shape="zigzag" angle={0} distortionShape="cascade" distortion={1}
            shift={0} blur={0.34} edges={0.25} stretch={0} scale={1} fit="cover"
            highlights={0.28} shadows={0.25} colorBack="#00000000" colorHighlight="#FFFFFF" colorShadow="#FFFFFF"
            style={{ backdropFilter: 'blur(4px)', backgroundColor: '#00000000', opacity: '87%', outline: '1px solid #FFFFFFBF' }}
          />
          <div className="hp-card" />
          <span className="hp-ai-label">AI WORKER</span>

          <div
            className={`hp-photo ${callEnabled && connected ? 'hp-photo--video' : ''}`}
            style={{ backgroundImage: `radial-gradient(ellipse 51.17% 51.17% at 50% 38.76% in oklab, oklab(95.2% -0.008 0.003 / 0%) 0%, oklab(95.2% -0.008 0.003 / 0%) 64.83%, oklab(95.2% -0.008 0.003) 100%), url(${PHOTO_URL})` }}
          >
            {callEnabled && (
              <>
                {connecting && <div className="hp-photo-loading"><div className="hp-photo-loading-spinner" /></div>}
                <video ref={avatarVideoRef} autoPlay playsInline
                  className={`hp-photo-video ${connected && !connecting ? 'hp-photo-video--active' : ''}`} />
                <div className={`hp-photo-fade ${connected && !connecting ? 'hp-photo-fade--active' : ''}`} />
              </>
            )}
            {needsAudioResume && (
              <button className="hp-audio-resume" onClick={resumeAudio}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, borderRadius: 'inherit' }}>
                Tap to enable audio
              </button>
            )}
            {callEnabled && connected && (
              <>
                <button className={`hp-photo-ctrl-btn hp-photo-ctrl-btn--tr${micMuted ? ' hp-photo-ctrl-btn--muted' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleMute(); }} aria-label={micMuted ? 'Unmute' : 'Mute'}>
                  {micMuted ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <button className="hp-photo-ctrl-btn hp-photo-ctrl-btn--br"
                  onClick={e => { e.stopPropagation(); interrupt?.(); }} aria-label="Interrupt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                  </svg>
                </button>
                <button className={`hp-photo-ctrl-btn hp-photo-ctrl-btn--bl${!videoEnabled ? ' hp-photo-ctrl-btn--muted' : ''}`}
                  onClick={e => { e.stopPropagation(); setVideoEnabled(v => !v); }} aria-label="Toggle video">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M15 10l4.55-2.95A1 1 0 0121 8v8a1 1 0 01-1.45.9L15 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="1" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          <span className="hp-name">Alexandra{'\n'}Seaman</span>
          <span className="hp-role">HR at Humans.AI</span>
          <div className="hp-status">
            <span className="hp-status-dot" />
            <span className="hp-status-label">Active</span>
          </div>
          <div className="hp-holo-strip" />
          <span className="hp-verification hp-verification-top">VERIFIEDAIHUMAN&lt;&lt;&lt;&lt;&lt;</span>
          <span className="hp-verification hp-verification-bottom">HRMANAGER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
          <div className="hp-barcode"><BarcodeSvg /></div>
        </div>
      </div>

      {/* ── Login card — pinned to bottom ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '0 16px 28px',
        zIndex: 10,
      }}>
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 1.5px 4px rgba(0,0,0,0.06)',
          padding: '20px 20px 18px',
        }}>
          {/* Timer */}
          {callEnabled && !callEnded && timeLeft <= 30 && (
            <div style={{
              marginBottom: 12, textAlign: 'center',
              fontSize: '0.71rem', color: timeLeft <= 10 ? '#ff3b30' : 'rgba(0,0,0,0.4)',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.03em',
            }}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} — log in to continue
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.62rem 1rem', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
              fontSize: '0.85rem', fontWeight: 600, color: '#1a1a1a',
              cursor: googleLoading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: googleLoading ? 0.6 : 1, transition: 'background 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = '#f5f6f7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.28)', fontWeight: 500, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="Email" autoComplete="email" style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="Password" autoComplete="current-password" style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
            />
            {error && <div style={{ fontSize: '0.72rem', color: '#ff3b30', textAlign: 'center' }}>{error}</div>}
            <button
              type="submit" disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '0.64rem',
                background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#30a74f)',
                color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', borderRadius: 10,
                fontSize: '0.85rem', fontWeight: 600,
                cursor: loading || !email || !password ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
                marginTop: 2,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
