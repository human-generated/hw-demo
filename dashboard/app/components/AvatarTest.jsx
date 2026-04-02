'use client';
import { useState, useRef, useEffect } from 'react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';

const ANAM_API_KEY = 'NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9';
const ANAM_PERSONA_ID = '6ccddf38-aed1-4bbb-9809-fc92986eb436';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'Marathi' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ro', label: 'Romanian' },
];

const LANG_PROMPTS = {
  en: 'You are Alexandra, a friendly AI assistant for Humans.AI Enterprise. Greet the user warmly in English and have a natural, helpful conversation. Keep responses concise.',
  mr: 'तुम्ही Alexandra आहात, Humans.AI Enterprise साठी एक मैत्रीपूर्ण AI सहाय्यक. वापरकर्त्याला मराठीत उबदारपणे अभिवादन करा आणि नैसर्गिक संभाषण करा. केवळ मराठीत बोला.',
  hi: 'आप Alexandra हैं, Humans.AI Enterprise के लिए एक मित्रवत AI सहायक. उपयोगकर्ता को हिंदी में गर्मजोशी से अभिवादन करें और स्वाभाविक बातचीत करें. केवल हिंदी में बोलें.',
  ro: 'Ești Alexandra, un asistent AI prietenos pentru Humans.AI Enterprise. Salută utilizatorul cu căldură în română și poartă o conversație naturală. Vorbește exclusiv în română.',
};

const VIDEO_ID = 'avatar-test-video';

export function AvatarTest() {
  const [lang, setLang] = useState('en');
  const [prompt, setPrompt] = useState(LANG_PROMPTS['en']);
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | ending
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);

  // Update prompt when language changes (only if prompt still matches a default)
  useEffect(() => {
    const isDefault = Object.values(LANG_PROMPTS).includes(prompt);
    if (isDefault) setPrompt(LANG_PROMPTS[lang]);
  }, [lang]);

  async function startCall() {
    setError('');
    setStatus('connecting');
    try {
      const client = unsafe_createClientWithApiKey(ANAM_API_KEY, {
        personaId: ANAM_PERSONA_ID,
        languageCode: lang,
        systemPrompt: prompt,
      });
      clientRef.current = client;

      client.addListener('CONNECTION_ESTABLISHED', () => {
        console.log('[AvatarTest] connection established');
      });
      client.addListener('VIDEO_PLAY_STARTED', () => {
        console.log('[AvatarTest] video playing');
        setStatus('connected');
      });
      client.addListener('CONNECTION_CLOSED', () => {
        console.log('[AvatarTest] connection closed');
        setStatus('idle');
        clientRef.current = null;
      });

      await client.streamToVideoElement(VIDEO_ID);
    } catch (e) {
      console.error('[AvatarTest]', e);
      setError(e.message || 'Connection failed');
      setStatus('idle');
      clientRef.current = null;
    }
  }

  async function endCall() {
    setStatus('ending');
    try { clientRef.current?.stopStreaming(); } catch {}
    clientRef.current = null;
    setStatus('idle');
    setMuted(false);
  }

  function toggleMute() {
    const c = clientRef.current;
    if (!c) return;
    if (muted) { c.unmuteInputAudio(); setMuted(false); }
    else { c.muteInputAudio(); setMuted(true); }
  }

  const isActive = status === 'connected' || status === 'connecting';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0d0d0d',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff',
      gap: 24,
    }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>
          Avatar Test · hidden
        </span>
      </div>

      {/* Video area */}
      <div style={{
        width: 360, height: 480, borderRadius: 20,
        background: '#1a1a1a', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', flexShrink: 0,
      }}>
        <video
          id={VIDEO_ID}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Status overlay */}
        {status !== 'connected' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)', gap: 12,
          }}>
            {status === 'connecting' && (
              <>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #fff', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 13, opacity: 0.6 }}>Connecting…</span>
              </>
            )}
            {status === 'idle' && (
              <span style={{ fontSize: 13, opacity: 0.3 }}>Avatar preview</span>
            )}
          </div>
        )}
        {/* Live indicator */}
        {status === 'connected' && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759' }} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px', width: 360,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Language */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
            Language
          </label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            disabled={isActive}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9,
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 14, outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
              cursor: isActive ? 'not-allowed' : 'pointer',
              opacity: isActive ? 0.5 : 1,
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Prompt */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
            System Prompt
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isActive}
            rows={4}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9,
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical',
              fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5,
              boxSizing: 'border-box',
              cursor: isActive ? 'not-allowed' : 'text',
              opacity: isActive ? 0.5 : 1,
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: '#ff6b6b', background: 'rgba(255,59,48,0.1)', borderRadius: 7, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isActive ? (
            <button
              onClick={startCall}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'linear-gradient(135deg, #34c759, #30a74f)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ▶ Start Call
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  background: muted ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${muted ? 'rgba(255,59,48,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: muted ? '#ff6b6b' : '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {muted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              <button
                onClick={endCall}
                disabled={status === 'ending'}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  background: 'rgba(255,59,48,0.15)',
                  border: '1px solid rgba(255,59,48,0.3)',
                  color: '#ff6b6b', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ■ End Call
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
