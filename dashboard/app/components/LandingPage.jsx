'use client';
import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';

const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const HUMANS_H_PATH = 'M4.626,0 L4.626,10.444 C6.294,8.271 8.342,7.623 10.466,7.623 C15.774,7.623 18.125,11.244 18.125,16.771 L18.121,24.668 C16.577,24.833 15.036,25.005 13.496,25.184 L13.499,16.809 C13.499,13.378 11.717,11.930 9.252,11.930 C6.522,11.930 4.626,14.255 4.626,17.076 L4.622,26.305 C3.744,26.424 2.866,26.546 1.990,26.670 L0,26.681 L0,0 Z';

const CALL_LIMIT_SECS = 60;

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

export function LandingPage({ onLogin, callEnabled, onCallTimeout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CALL_LIMIT_SECS);
  const [callEnded, setCallEnded] = useState(false);
  const timerRef = useRef(null);

  // 1-minute call timeout
  useEffect(() => {
    if (!callEnabled) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCallEnded(true);
          onCallTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [callEnabled]);

  async function handleCredentials(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.ok) {
      onLogin?.();
    } else {
      setError('Invalid credentials.');
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/' });
  }

  const inp = {
    width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.85)',
    fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box', color: '#1a1a1a', transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#EDF1F3',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── Left: Avatar panel ── */}
      <div style={{
        flex: '0 0 52%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Large faded "h" in background */}
        <svg
          viewBox="0 0 19 27"
          style={{
            position: 'absolute', left: '-8%', top: '5%',
            width: '90%', height: 'auto', opacity: 0.045, pointerEvents: 'none',
          }}
        >
          <path d={HUMANS_H_PATH} fill="#1a1a1a" />
        </svg>

        {/* Alexandra card */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 320, borderRadius: 28,
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>
          {/* Photo */}
          <div style={{ height: 340, overflow: 'hidden', position: 'relative' }}>
            <img
              src={PHOTO_URL}
              alt="Alexandra"
              style={{
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              }}
            />
          </div>

          {/* Name / role */}
          <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Alexandra</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>HR at Humans · AI Agent</div>

            {/* Call timer */}
            {callEnabled && !callEnded && (
              <div style={{
                marginTop: 14,
                padding: '0.45rem 0.75rem',
                borderRadius: 8,
                background: timeLeft <= 15 ? 'rgba(255,59,48,0.08)' : 'rgba(52,199,89,0.08)',
                border: `1px solid ${timeLeft <= 15 ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)'}`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: timeLeft <= 15 ? '#ff3b30' : '#34c759',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '0.72rem', color: timeLeft <= 15 ? '#c0392b' : '#166534', fontWeight: 500 }}>
                  {timeLeft <= 15
                    ? `Session ends in ${timeLeft}s — log in to continue`
                    : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} free session`}
                </span>
              </div>
            )}
            {callEnded && (
              <div style={{
                marginTop: 14, padding: '0.45rem 0.75rem', borderRadius: 8,
                background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)',
                fontSize: '0.72rem', color: '#c0392b', fontWeight: 500,
              }}>
                Session ended. Log in to continue.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Login panel ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Large "h" watermark */}
        <svg
          viewBox="0 0 19 27"
          style={{
            position: 'absolute', right: '-15%', bottom: '-10%',
            width: '75%', height: 'auto', opacity: 0.055, pointerEvents: 'none',
          }}
        >
          <path d={HUMANS_H_PATH} fill="#1a1a1a" />
        </svg>

        {/* Login card */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 360,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(32px)',
          borderRadius: 24,
          padding: '2.25rem 2rem',
          boxShadow: '0 16px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.9) inset',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, background: '#1a1a1a', borderRadius: 13, marginBottom: 10,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0, background: '#1a1a1a',
                WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 19 27'%3E%3Cpath d='${encodeURIComponent(HUMANS_H_PATH)}' fill='white'/%3E%3C/svg%3E")`,
                WebkitMaskSize: '55% auto', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
                maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 19 27'%3E%3Cpath d='${encodeURIComponent(HUMANS_H_PATH)}' fill='white'/%3E%3C/svg%3E")`,
                maskSize: '55% auto', maskRepeat: 'no-repeat', maskPosition: 'center',
              }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', fontFamily: "'DM Sans', sans-serif", position: 'relative', zIndex: 1 }}>h</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em' }}>Sign in to Humans</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)', marginTop: 3 }}>AI-powered back-office platform</div>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.7rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
              fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a',
              cursor: googleLoading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.15s, border-color 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              opacity: googleLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = '#f8f9fa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1.1rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)', fontWeight: 500, letterSpacing: '0.04em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••" style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </div>

            {error && <div style={{ fontSize: '0.75rem', color: '#ff3b30', textAlign: 'center' }}>{error}</div>}

            <button
              type="submit" disabled={loading || !email || !password}
              style={{
                marginTop: 4, padding: '0.75rem',
                background: loading ? 'rgba(0,0,0,0.07)' : 'linear-gradient(135deg,#34c759,#30a74f)',
                color: loading ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', borderRadius: 10,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: loading || !email || !password ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
