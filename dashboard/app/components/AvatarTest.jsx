'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';

const DEFAULT_CONFIG = {
  apiKey: '',
  personaId: '6ccddf38-aed1-4bbb-9809-fc92986eb436',
  llmId: '27cbd128-f1e6-4b67-8ab3-9123659be08c',
  voices: {
    en: '5ed805fd-e56e-46da-b1d9-0b3c4af9e146',
    hi: '9fa4b058-39b3-4980-89d8-7cbbec8098b0',
    mr: '9fa4b058-39b3-4980-89d8-7cbbec8098b0',
    ro: 'gbLy9ep70G3JW53cTzFC',
  },
  avatarIds: {
    female: '160129b8-4668-42bf-9d77-c479ae16c403',
    boy:    '90505cad-620d-4a33-8976-36cd59a21bf4',
    girl2:  '160129b8-4668-42bf-9d77-c479ae16c403',
    girl3:  '160129b8-4668-42bf-9d77-c479ae16c403',
  },
};

const AVATARS = [
  { id: 'female', photo: '/avatar-photo.png',       label: 'Alexandra' },
  { id: 'boy',    photo: '/avatar-boy.png',          label: 'Alex' },
  { id: 'girl2',  photo: '/avatar-girl-middle.png',  label: 'Aria' },
  { id: 'girl3',  photo: '/avatar-girl-right.png',   label: 'Maya' },
];

const LANGUAGES = [
  { code: 'en', label: 'English',  voiceLabel: 'Jillian (Cartesia)', prompt: 'You are Alexandra, a friendly AI assistant for Humans.AI Enterprise. Greet the user warmly in English and have a natural, helpful conversation. Keep responses concise.' },
  { code: 'hi', label: 'Hindi',    voiceLabel: 'Harini (ElevenLabs)', prompt: 'आप Alexandra हैं, Humans.AI Enterprise के लिए एक मित्रवत AI सहायक। उपयोगकर्ता को हिंदी में गर्मजोशी से अभिवादन करें और स्वाभाविक बातचीत करें। केवल हिंदी में बोलें।' },
  { code: 'mr', label: 'Marathi',  voiceLabel: 'Harini (ElevenLabs)', prompt: 'तुम्ही Alexandra आहात, Humans.AI Enterprise साठी एक मैत्रीपूर्ण AI सहाय्यक. वापरकर्त्याला मराठीत उबदारपणे अभिवादन करा आणि नैसर्गिक संभाषण करा. केवळ मराठीत बोला.' },
  { code: 'ro', label: 'Romanian', voiceLabel: 'ElevenLabs (RO)',     prompt: 'Ești Alexandra, un asistent AI prietenos pentru Humans.AI Enterprise. Salută utilizatorul cu căldură în română și poartă o conversație naturală. Vorbește exclusiv în română.' },
];

const VIDEO_ID = 'avatar-test-video';
const LS_KEY = 'avatartest_config';

function loadConfig() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved), voices: { ...DEFAULT_CONFIG.voices, ...JSON.parse(saved).voices }, avatarIds: { ...DEFAULT_CONFIG.avatarIds, ...JSON.parse(saved).avatarIds } };
  } catch {}
  return DEFAULT_CONFIG;
}

function ConfigField({ label, value, onChange, mono, password }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <input
        type={password ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '6px 9px', borderRadius: 7,
          background: '#111', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box',
          fontFamily: mono ? "'IBM Plex Mono', monospace" : "'DM Sans', sans-serif",
        }}
      />
    </div>
  );
}

export function AvatarTest() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [langCode, setLangCode] = useState('en');
  const [prompt, setPrompt] = useState(LANGUAGES[0].prompt);
  const [promptEdited, setPromptEdited] = useState(false);
  const [status, setStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [kbText, setKbText] = useState('');
  const [kbName, setKbName] = useState('');
  const [kbEnabled, setKbEnabled] = useState(false);
  const [kbLoading, setKbLoading] = useState(false);
  const fileInputRef = useRef(null);
  const clientRef = useRef(null);

  useEffect(() => { setConfig(loadConfig()); }, []);

  function updateConfig(patch) {
    const next = { ...config, ...patch };
    setConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }
  function updateVoice(code, val) {
    const next = { ...config, voices: { ...config.voices, [code]: val } };
    setConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }
  function updateAvatarId(id, val) {
    const next = { ...config, avatarIds: { ...config.avatarIds, [id]: val } };
    setConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }
  function resetConfig() {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(LS_KEY);
  }

  const langConfig = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  const avatarConfig = AVATARS.find(a => a.id === selectedAvatar) || AVATARS[0];

  function handleLangChange(code) {
    setLangCode(code);
    if (!promptEdited) {
      const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
      setPrompt(lang.prompt);
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setKbLoading(true);
    setKbText(''); setKbEnabled(false);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch('/api/anam/parse-pdf', { method: 'POST', body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t.slice(0, 200)); }
      const { text, error: err } = await res.json();
      if (err || !text) throw new Error(err || 'Failed to parse PDF');
      setKbText(text.trim()); setKbName(file.name); setKbEnabled(true);
    } catch (ex) { setError('PDF parse failed: ' + ex.message); }
    finally { setKbLoading(false); e.target.value = ''; }
  }

  async function loadBuiltinKb() {
    if (kbName === 'programa-curs.pdf' && kbText) { setKbEnabled(true); return; }
    setKbLoading(true);
    try {
      const res = await fetch('/programa-curs.pdf');
      const blob = await res.blob();
      const fd = new FormData();
      fd.append('pdf', blob, 'programa-curs.pdf');
      const parseRes = await fetch('/api/anam/parse-pdf', { method: 'POST', body: fd });
      if (!parseRes.ok) { const t = await parseRes.text(); throw new Error(t.slice(0, 200)); }
      const { text, error: err } = await parseRes.json();
      if (err || !text) throw new Error(err || 'Failed to parse PDF');
      setKbText(text.trim()); setKbName('programa-curs.pdf'); setKbEnabled(true);
    } catch (ex) { setError('KB load failed: ' + ex.message); }
    finally { setKbLoading(false); }
  }

  function buildPrompt() {
    if (kbEnabled && kbText) return `${prompt}\n\n--- KNOWLEDGE BASE (${kbName}) ---\n${kbText}\n--- END KNOWLEDGE BASE ---`;
    return prompt;
  }

  async function startCall() {
    setError('');
    setStatus('connecting');
    try {
      const personaConfig = {
        personaId: config.personaId,
        name: 'Alexandra',
        avatarId: config.avatarIds[avatarConfig.id],
        llmId: config.llmId,
        voiceId: config.voices[langCode],
        languageCode: langCode,
        systemPrompt: buildPrompt(),
      };
      const tokenRes = await fetch('/api/anam/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaConfig, apiKey: config.apiKey }),
      });
      const { sessionToken, error: tokenErr } = await tokenRes.json();
      if (!sessionToken) throw new Error(tokenErr ? JSON.stringify(tokenErr) : 'Failed to get session token');

      const client = createClient(sessionToken);
      clientRef.current = client;
      client.addListener('CONNECTION_ESTABLISHED', () => console.log('[AvatarTest] connected'));
      client.addListener('VIDEO_PLAY_STARTED', () => { setStatus('connected'); });
      client.addListener('CONNECTION_CLOSED', () => { setStatus('idle'); clientRef.current = null; });
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

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    cursor: isActive ? 'not-allowed' : 'pointer',
    opacity: isActive ? 0.5 : 1,
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0d0d0d',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      color: '#fff', overflowY: 'auto', padding: '60px 0 30px',
      gap: 20,
    }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 20, left: 24, opacity: 0.4 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>Avatar Test</span>
      </div>

      {/* Video area */}
      <div style={{ width: 360, height: 480, borderRadius: 20, background: '#1a1a1a', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', flexShrink: 0 }}>
        <img src={avatarConfig.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <video id={VIDEO_ID} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }} />
        {status !== 'connected' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: status === 'connecting' ? 'rgba(0,0,0,0.45)' : 'transparent', gap: 12 }}>
            {status === 'connecting' && (<><div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', animation: 'spin 0.8s linear infinite' }} /><span style={{ fontSize: 13, opacity: 0.7 }}>Connecting…</span></>)}
          </div>
        )}
        {status === 'connected' && (<div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 10px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759' }} /><span style={{ fontSize: 11, fontWeight: 600 }}>LIVE</span></div>)}
        {status === 'connected' && (<div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 10px' }}><span style={{ fontSize: 10, opacity: 0.7, fontFamily: "'IBM Plex Mono', monospace" }}>{langConfig.voiceLabel}</span></div>)}
        {kbEnabled && kbText && (<div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(52,199,89,0.85)', borderRadius: 20, padding: '3px 9px' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#000' }}>KB</span></div>)}
      </div>

      {/* Controls panel */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar selector */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Avatar</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {AVATARS.map(av => (
              <button key={av.id} onClick={() => !isActive && setSelectedAvatar(av.id)} disabled={isActive} style={{ flex: 1, padding: 0, border: 'none', background: 'none', cursor: isActive ? 'not-allowed' : 'pointer', opacity: isActive ? 0.5 : 1 }}>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${selectedAvatar === av.id ? '#34c759' : 'rgba(255,255,255,0.1)'}`, aspectRatio: '3/4', position: 'relative' }}>
                  <img src={av.photo} alt={av.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '4px 4px 3px', fontSize: 9, textAlign: 'center', fontWeight: 600 }}>{av.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Language</label>
          <select value={langCode} onChange={e => { handleLangChange(e.target.value); setPromptEdited(false); }} disabled={isActive} style={inputStyle}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {!isActive && <div style={{ marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace" }}>voice: {langConfig.voiceLabel} — {config.voices[langCode]}</div>}
        </div>

        {/* Knowledge base */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Knowledge Base</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={loadBuiltinKb} disabled={isActive || kbLoading} style={{ padding: '7px 12px', borderRadius: 9, background: (kbEnabled && kbName === 'programa-curs.pdf') ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${(kbEnabled && kbName === 'programa-curs.pdf') ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`, color: (kbEnabled && kbName === 'programa-curs.pdf') ? '#34c759' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: isActive || kbLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: isActive ? 0.5 : 1 }}>
              {kbLoading && !kbName ? '⏳' : ''} Programa TIC
            </button>
            <button onClick={() => !isActive && fileInputRef.current?.click()} disabled={isActive || kbLoading} style={{ padding: '7px 12px', borderRadius: 9, background: (kbEnabled && kbName !== 'programa-curs.pdf') ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${(kbEnabled && kbName !== 'programa-curs.pdf') ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`, color: (kbEnabled && kbName !== 'programa-curs.pdf') ? '#34c759' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: isActive || kbLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: isActive ? 0.5 : 1 }}>
              {kbLoading && kbName ? '⏳ Parsing…' : '+ Upload PDF'}
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
            <a href="/programa-curs.pdf" download style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontFamily: "'IBM Plex Mono', monospace" }}>↓ download</a>
          </div>
          {kbText && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, color: kbEnabled ? '#34c759' : 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{kbEnabled ? '✓' : '○'} {kbName} ({Math.round(kbText.length / 1000)}k chars)</div>
              <button onClick={() => setKbEnabled(v => !v)} disabled={isActive} style={{ background: 'none', border: `1px solid ${kbEnabled ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: kbEnabled ? '#34c759' : 'rgba(255,255,255,0.3)', cursor: isActive ? 'not-allowed' : 'pointer' }}>
                {kbEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>System Prompt</label>
          <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setPromptEdited(true); }} disabled={isActive} rows={4} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, boxSizing: 'border-box', opacity: isActive ? 0.5 : 1 }} />
          {promptEdited && !isActive && (<button onClick={() => { setPrompt(langConfig.prompt); setPromptEdited(false); }} style={{ marginTop: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', padding: 0 }}>↺ Reset to default</button>)}
        </div>

        {error && <div style={{ fontSize: 12, color: '#ff6b6b', background: 'rgba(255,59,48,0.1)', borderRadius: 7, padding: '8px 12px' }}>{error}</div>}

        {/* Call buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isActive ? (
            <button onClick={startCall} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #34c759, #30a74f)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>▶ Start Call</button>
          ) : (
            <>
              <button onClick={toggleMute} style={{ flex: 1, padding: '11px', borderRadius: 10, background: muted ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${muted ? 'rgba(255,59,48,0.4)' : 'rgba(255,255,255,0.1)'}`, color: muted ? '#ff6b6b' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{muted ? '🔇 Unmute' : '🎤 Mute'}</button>
              <button onClick={endCall} disabled={status === 'ending'} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', color: '#ff6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>■ End Call</button>
            </>
          )}
        </div>

        {/* Config toggle */}
        <button onClick={() => setShowConfig(v => !v)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace" }}>
          {showConfig ? '▲ hide config' : '⚙ api config'}
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px', width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace" }}>Global</div>

          <ConfigField label="Anam API Key (leave blank for default)" value={config.apiKey} onChange={v => updateConfig({ apiKey: v })} mono password />
          <ConfigField label="Persona ID" value={config.personaId} onChange={v => updateConfig({ personaId: v })} mono />
          <ConfigField label="LLM ID" value={config.llmId} onChange={v => updateConfig({ llmId: v })} mono />

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>Voice IDs per Language</div>
          {LANGUAGES.map(l => (
            <ConfigField key={l.code} label={`${l.label} (${l.code})`} value={config.voices[l.code]} onChange={v => updateVoice(l.code, v)} mono />
          ))}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>Anam Avatar IDs</div>
          {AVATARS.map(av => (
            <ConfigField key={av.id} label={av.label} value={config.avatarIds[av.id]} onChange={v => updateAvatarId(av.id, v)} mono />
          ))}

          <button onClick={resetConfig} style={{ background: 'none', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 8, padding: '7px', color: 'rgba(255,59,48,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
            ↺ Reset to defaults
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
