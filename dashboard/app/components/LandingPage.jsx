'use client';
import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { LiquidMetal } from '@paper-design/shaders-react';
import { useWorkerSession } from './useWorkerSession';

const ALEXANDRA_WORKER = { id: 'alexandra-homepage', name: 'Alexandra', role: 'HR at Humans' };
const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const LANDING_PROMPT = `You are Alexandra, HR at Humans — an AI agent welcoming visitors to the Humans platform. Introduce yourself warmly and ask who they are and what company they work for. Keep responses very short (1-2 sentences). Be warm and professional.`;

const CALL_LIMIT_SECS = 60;

// h-path SVG mask data URI (same path used in enterprise.html logoMetal)
const H_PATH = 'M4.626,0 L4.626,10.444 C6.294,8.271 8.342,7.623 10.466,7.623 C15.774,7.623 18.125,11.244 18.125,16.771 L18.121,24.668 C16.577,24.833 15.036,25.005 13.496,25.184 L13.499,16.809 C13.499,13.378 11.717,11.930 9.252,11.930 C6.522,11.930 4.626,14.255 4.626,17.076 L4.622,26.305 C3.744,26.424 2.866,26.546 1.990,26.670 L0,26.681 L0,0 Z';
const H_MASK_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 19 27'%3E%3Cpath d='${encodeURIComponent(H_PATH)}' fill='black'/%3E%3C/svg%3E")`;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export function LandingPage({ onLogin }) {
  const [callEnabled, setCallEnabled] = useState(true);
  const [videoEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(CALL_LIMIT_SECS);
  const [callEnded, setCallEnded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const avatarVideoRef = useRef(null);
  // stable session ID for this page load
  const landingSessionId = useRef(`landing-${Date.now()}`);

  const workerSession = useWorkerSession({
    worker: ALEXANDRA_WORKER,
    sessionId: landingSessionId.current,
    enabled: callEnabled,
    audioEnabled: true,
    videoEnabled,
    systemPrompt: LANDING_PROMPT,
    mode: 'homepage',
  });

  const { connected, connecting, videoTrack, needsAudioResume, resumeAudio, toggleMute, micMuted, audioElRef } = workerSession || {};

  // Attach avatar video track
  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

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
    width: '100%', padding: '0.65rem 0.875rem', borderRadius: 9,
    border: '1px solid rgba(0,0,0,0.11)', background: 'rgba(255,255,255,0.9)',
    fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#EDF1F3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Hidden audio element for LiveKit agent voice */}
      {audioElRef && <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />}

      {/* ── Large background h logo (LiquidMetal, same as enterprise.html #logoMetal) ── */}
      <div style={{
        position: 'absolute',
        width: 520,
        height: Math.round(520 * 27 / 19), // preserve 19:27 h-glyph aspect ratio
        top: '50%', left: '50%',
        transform: 'translate(-30%, -50%)',
        opacity: 0.09,
        pointerEvents: 'none',
        WebkitMaskImage: H_MASK_URI,
        maskImage: H_MASK_URI,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        background: '#1a1a1a',
      }}>
        <LiquidMetal
          speed={1} softness={0.1} repetition={2}
          shiftRed={0.3} shiftBlue={0.3} distortion={0.07}
          contour={0.4} scale={2.88} rotation={0}
          shape="diamond" angle={70}
          colorBack="#00000000" colorTint="#FFFFFF"
          style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}
        />
      </div>

      {/* ── Center column: avatar on top, login below ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 360,
        filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.10))',
      }}>

        {/* ── Avatar card ── */}
        <div style={{
          width: '100%',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          height: 300,
          position: 'relative',
          background: '#111',
          zIndex: 2,
        }}>
          {/* Photo fallback */}
          <img
            src={PHOTO_URL}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              opacity: (callEnabled && connected && videoTrack) ? 0 : 1,
              transition: 'opacity 0.5s',
            }}
          />

          {/* Anam video */}
          <video
            ref={avatarVideoRef}
            autoPlay playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: (callEnabled && connected && videoTrack) ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          />

          {/* Connecting spinner */}
          {callEnabled && connecting && !connected && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: '#fff',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}

          {/* Tap to enable audio */}
          {needsAudioResume && (
            <button onClick={resumeAudio} style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif",
            }}>
              Tap to enable audio
            </button>
          )}

          {/* Live / mic controls */}
          {callEnabled && connected && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              display: 'flex', gap: 6,
            }}>
              {/* Live dot */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                borderRadius: 20, padding: '4px 10px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em' }}>LIVE</span>
              </div>
              {/* Mute button */}
              <button
                onClick={toggleMute}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: micMuted ? 'rgba(255,59,48,0.7)' : 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {micMuted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Timer */}
          {callEnabled && !callEnded && (
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <span style={{
                color: timeLeft <= 15 ? '#ff6b6b' : 'rgba(255,255,255,0.7)',
                fontSize: '0.7rem', fontWeight: 500,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} free
              </span>
            </div>
          )}
          {callEnded && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Session ended</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 4 }}>Log in to continue</div>
              </div>
            </div>
          )}
        </div>

        {/* Name bar — bridges avatar and login card */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          padding: '10px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderLeft: '1px solid rgba(255,255,255,0.9)',
          borderRight: '1px solid rgba(255,255,255,0.9)',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Alexandra</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>HR at Humans · AI Agent</div>
          </div>
          {/* Inline logo matching #logoMetal */}
          <div style={{
            width: 22, height: 30,
            WebkitMaskImage: H_MASK_URI,
            maskImage: H_MASK_URI,
            WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            overflow: 'hidden', background: '#1a1a1a', flexShrink: 0,
          }}>
            <LiquidMetal
              speed={1} softness={0.1} repetition={2}
              shiftRed={0.3} shiftBlue={0.3} distortion={0.07}
              contour={0.4} scale={2.88} rotation={0}
              shape="diamond" angle={70}
              colorBack="#00000000" colorTint="#FFFFFF"
              style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}
            />
          </div>
        </div>

        {/* ── Sign-in card ── */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          borderRadius: '0 0 20px 20px',
          border: '1px solid rgba(255,255,255,0.9)',
          borderTop: 'none',
          padding: '16px 20px 22px',
          boxSizing: 'border-box',
        }}>
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.65rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              background: '#fff', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 9,
              fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a',
              cursor: googleLoading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              opacity: googleLoading ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = '#f8f9fa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '12px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
            <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.3)', fontWeight: 500, letterSpacing: '0.04em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
          </div>

          {/* Credentials */}
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="Email" autoComplete="email" style={inp}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.11)')}
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="Password" autoComplete="current-password" style={inp}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.11)')}
            />
            {error && <div style={{ fontSize: '0.72rem', color: '#ff3b30', textAlign: 'center' }}>{error}</div>}
            <button
              type="submit" disabled={loading || !email || !password}
              style={{
                padding: '0.68rem',
                background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#30a74f)',
                color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', borderRadius: 9,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: loading || !email || !password ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
      `}</style>
    </div>
  );
}
