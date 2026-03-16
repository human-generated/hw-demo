'use client';
import { useState } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';

const DEMO_EMAIL = 'demo@demo.com';
const DEMO_PASSWORD = 'aigeneratedpassword';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError('Invalid credentials.');
      return;
    }
    setLoading(true);
    // Small delay for feel
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    onLogin();
  }

  const inp = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s', color: '#1a1a1a',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9100 }}>
      <MeshGradient
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        speed={0.12} scale={1.4} distortion={0.7} swirl={0.8}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(32px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
        borderRadius: 24, padding: '2.5rem', width: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, background: '#1a1a1a', borderRadius: 16, marginBottom: '0.875rem',
          }}>
            <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.04em' }}>h</span>
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em' }}>Humans.AI</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>Demo Experience Platform</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Email</label>
            <input
              autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="demo@demo.com" required style={inp}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••••••••" required style={inp}
              onFocus={e => (e.target.style.borderColor = 'rgba(52,199,89,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
            />
          </div>
          {error && <div style={{ fontSize: '0.78rem', color: '#ff3b30', textAlign: 'center' }}>{error}</div>}
          <button
            type="submit" disabled={loading || !email.trim() || !password}
            style={{
              marginTop: 4, padding: '0.875rem',
              background: loading ? 'rgba(0,0,0,0.08)' : 'linear-gradient(135deg,#34c759,#30a74f)',
              color: loading ? 'rgba(0,0,0,0.35)' : '#fff',
              border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
              cursor: loading || !email.trim() || !password ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing in…
              </>
            ) : 'Sign in →'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.68rem', color: 'rgba(0,0,0,0.25)' }}>
          Humans.AI confidential demo platform
        </div>
      </div>
    </div>
  );
}
