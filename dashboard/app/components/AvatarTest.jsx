'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';

// ─── Key 1 defaults (configurable) ───────────────────────────────────────────
const DEFAULT_CONFIG = {
  apiKey: '',
  personaId: '6ccddf38-aed1-4bbb-9809-fc92986eb436',
  llmId: '27cbd128-f1e6-4b67-8ab3-9123659be08c',
  avatarId: '160129b8-4668-42bf-9d77-c479ae16c403',
  voices: {
    en: '5ed805fd-e56e-46da-b1d9-0b3c4af9e146',
    hi: '9fa4b058-39b3-4980-89d8-7cbbec8098b0',
    mr: '9fa4b058-39b3-4980-89d8-7cbbec8098b0',
    ro: 'd79f2051-3a89-4fcc-8c71-cf5d53f9d9e0',
  },
};

// ─── Key 2 personas (read-only, no overrides) ────────────────────────────────
const KEY2 = 'NjllMzAwZDgtMzBkMi00Y2ViLWIxMDAtMzIxYWVkZTU4MDBjOnQ1TlVrejFFQmVKelF3VGplRHBOeS8xWEJHUHo3bHhDaE0vMkZ1Rnk4VkE5';
const KEY2_PERSONAS = [
  {
    personaId: '583c3b19-7865-4ca9-b66b-f9b218494001',
    name: 'Emma',
    photo: 'https://newgxnc1uqs0jnqm.public.blob.vercel-storage.com/avatar-previews/UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-/one-shot_UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-_one-shot-1tuyf3x1775064817381-cropped-y9aYmOksj3seNEXzU96kn7ZmXcACmq.png',
    voice: 'Lucy (ElevenLabs, EN)',
  },
  {
    personaId: 'fe9c91ae-4230-404e-8620-e434e2db9b89',
    name: 'Emma',
    photo: 'https://newgxnc1uqs0jnqm.public.blob.vercel-storage.com/avatar-previews/UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-/one-shot_UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-_one-shot-kiq8kx1775065627291-cropped-q29ObsKgwYJsnNFS7vCk6hlj0Z6WfG.png',
    voice: 'Athira (ElevenLabs)',
  },
  {
    personaId: '25e5e3be-a698-4192-8d4a-d4a6d2712c2f',
    name: 'Liam',
    photo: 'https://newgxnc1uqs0jnqm.public.blob.vercel-storage.com/avatar-previews/UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-/one-shot_UD2HtAP7KyWGX_dUhm57zDCU-OUscwk-_one-shot-172rp2k1775108157828-refined-2ravOQIHNlvX4ggpZJeqD11qGI3uVY.png',
    voice: 'Joseph (ElevenLabs)',
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English',  voiceLabel: 'Jillian (Cartesia)', prompt: 'You are Alexandra, a friendly AI assistant for Humans.AI Enterprise. Greet the user warmly in English and have a natural, helpful conversation. Keep responses concise.' },
  { code: 'hi', label: 'Hindi',    voiceLabel: 'Harini (ElevenLabs)', prompt: 'आप Alexandra हैं, Humans.AI Enterprise के लिए एक मित्रवत AI सहायक। उपयोगकर्ता को हिंदी में गर्मजोशी से अभिवादन करें और स्वाभाविक बातचीत करें। केवल हिंदी में बोलें।' },
  { code: 'mr', label: 'Marathi',  voiceLabel: 'Harini (ElevenLabs)', prompt: 'तुम्ही Alexandra आहात, Humans.AI Enterprise साठी एक मैत्रीपूर्ण AI सहाय्यक. वापरकर्त्याला मराठीत उबदारपणे अभिवादन करा आणि नैसर्गिक संभाषण करा. केवळ मराठीत बोला.' },
  { code: 'ro', label: 'Romanian', voiceLabel: 'Lauren (ElevenLabs)', prompt: 'Ești Alexandra, un asistent AI prietenos pentru Humans.AI Enterprise. Salută utilizatorul cu căldură în română și poartă o conversație naturală. Vorbește exclusiv în română.' },
];

const LS_KEY = 'avatartest_config_v2';

function loadConfig() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return { ...DEFAULT_CONFIG, ...s, voices: { ...DEFAULT_CONFIG.voices, ...(s.voices || {}) } };
  } catch { return DEFAULT_CONFIG; }
}

// ─── Single avatar card ───────────────────────────────────────────────────────
function AvatarCard({ cardId, name, photo, voiceLabel, onStart, isKey2 }) {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | ending
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);
  const videoId = `av-video-${cardId}`;

  async function start() {
    setError('');
    setStatus('connecting');
    try {
      const { sessionToken, error: err } = await onStart();
      if (!sessionToken) throw new Error(err ? JSON.stringify(err) : 'No session token');
      const client = createClient(sessionToken);
      clientRef.current = client;
      client.addListener('VIDEO_PLAY_STARTED', () => setStatus('connected'));
      client.addListener('CONNECTION_CLOSED', () => { setStatus('idle'); clientRef.current = null; });
      await client.streamToVideoElement(videoId);
    } catch (e) {
      setError(e.message);
      setStatus('idle');
      clientRef.current = null;
    }
  }

  async function stop() {
    setStatus('ending');
    try { clientRef.current?.stopStreaming(); } catch {}
    clientRef.current = null;
    setStatus('idle');
    setMuted(false);
  }

  function toggleMute() {
    if (!clientRef.current) return;
    if (muted) { clientRef.current.unmuteInputAudio(); setMuted(false); }
    else { clientRef.current.muteInputAudio(); setMuted(true); }
  }

  const isActive = status === 'connected' || status === 'connecting';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Video frame */}
      <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 14, background: '#1a1a1a', overflow: 'hidden', border: `1px solid ${isActive ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.07)'}`, position: 'relative' }}>
        <img src={photo} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <video id={videoId} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }} />

        {status === 'connecting' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* Live badge */}
        {status === 'connected' && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '3px 8px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34c759' }} />
            <span style={{ fontSize: 9, fontWeight: 700 }}>LIVE</span>
          </div>
        )}

        {/* Name + voice */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '20px 10px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
          {voiceLabel && <div style={{ fontSize: 9, opacity: 0.5, fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>{voiceLabel}</div>}
          {isKey2 && <div style={{ fontSize: 9, opacity: 0.35, fontFamily: "'IBM Plex Mono', monospace" }}>key2</div>}
        </div>
      </div>

      {/* Error */}
      {error && <div style={{ fontSize: 10, color: '#ff6b6b', background: 'rgba(255,59,48,0.1)', borderRadius: 6, padding: '5px 8px', wordBreak: 'break-all' }}>{error}</div>}

      {/* Buttons */}
      {!isActive ? (
        <button onClick={start} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'linear-gradient(135deg, #34c759, #30a74f)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>▶ Start</button>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={toggleMute} style={{ flex: 1, padding: '8px 4px', borderRadius: 9, background: muted ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${muted ? 'rgba(255,59,48,0.4)' : 'rgba(255,255,255,0.1)'}`, color: muted ? '#ff6b6b' : '#fff', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{muted ? '🔇' : '🎤'}</button>
          <button onClick={stop} disabled={status === 'ending'} style={{ flex: 2, padding: '8px 4px', borderRadius: 9, background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', color: '#ff6b6b', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>■ End</button>
        </div>
      )}
    </div>
  );
}

// ─── Config field ─────────────────────────────────────────────────────────────
function ConfigField({ label, value, onChange, password }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <input type={password ? 'password' : 'text'} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '6px 9px', borderRadius: 7, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: "'IBM Plex Mono', monospace" }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AvatarTest() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [langCode, setLangCode] = useState('en');
  const [prompt, setPrompt] = useState(LANGUAGES[0].prompt);
  const [promptEdited, setPromptEdited] = useState(false);
  const [kbText, setKbText] = useState('');
  const [kbName, setKbName] = useState('');
  const [kbEnabled, setKbEnabled] = useState(false);
  const [kbLoading, setKbLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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
  function resetConfig() { setConfig(DEFAULT_CONFIG); localStorage.removeItem(LS_KEY); }

  const langConfig = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];

  function handleLangChange(code) {
    setLangCode(code);
    if (!promptEdited) setPrompt((LANGUAGES.find(l => l.code === code) || LANGUAGES[0]).prompt);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setKbLoading(true); setKbText(''); setKbEnabled(false);
    try {
      const fd = new FormData(); fd.append('pdf', file);
      const res = await fetch('/api/anam/parse-pdf', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.text()).slice(0, 200));
      const { text, error: err } = await res.json();
      if (err || !text) throw new Error(err || 'Failed');
      setKbText(text.trim()); setKbName(file.name); setKbEnabled(true);
    } catch (ex) { setError('PDF: ' + ex.message); }
    finally { setKbLoading(false); e.target.value = ''; }
  }

  async function loadBuiltinKb() {
    if (kbName === 'programa-curs.pdf' && kbText) { setKbEnabled(true); return; }
    setKbLoading(true);
    try {
      const blob = await (await fetch('/programa-curs.pdf')).blob();
      const fd = new FormData(); fd.append('pdf', blob, 'programa-curs.pdf');
      const res = await fetch('/api/anam/parse-pdf', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.text()).slice(0, 200));
      const { text, error: err } = await res.json();
      if (err || !text) throw new Error(err || 'Failed');
      setKbText(text.trim()); setKbName('programa-curs.pdf'); setKbEnabled(true);
    } catch (ex) { setError('KB: ' + ex.message); }
    finally { setKbLoading(false); }
  }

  function buildPrompt() {
    if (kbEnabled && kbText) return `${prompt}\n\n--- KNOWLEDGE BASE (${kbName}) ---\n${kbText}\n--- END KNOWLEDGE BASE ---`;
    return prompt;
  }

  // Card 1 (key1): full personaConfig
  async function startCard1() {
    const res = await fetch('/api/anam/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        personaConfig: {
          personaId: config.personaId,
          name: 'Alexandra',
          avatarId: config.avatarId,
          llmId: config.llmId,
          voiceId: config.voices[langCode],
          languageCode: langCode,
          systemPrompt: buildPrompt(),
        },
      }),
    });
    return res.json();
  }

  // Cards 2-4 (key2): persona defaults only, no overrides
  function startKey2Card(personaId) {
    return async () => {
      const res = await fetch('/api/anam/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: KEY2, personaOnly: true, personaConfig: { personaId } }),
      });
      return res.json();
    };
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#fff', padding: '52px 20px 40px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 16, left: 20, opacity: 0.35 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>Avatar Test</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Shared controls ── */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Language */}
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 5 }}>Language (Card 1)</label>
              <select value={langCode} onChange={e => handleLangChange(e.target.value)} style={inputStyle}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'IBM Plex Mono', monospace" }}>{langConfig.voiceLabel}</div>
            </div>

            {/* KB */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 5 }}>Knowledge Base (Card 1)</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button onClick={loadBuiltinKb} disabled={kbLoading} style={{ padding: '6px 10px', borderRadius: 8, background: (kbEnabled && kbName === 'programa-curs.pdf') ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${(kbEnabled && kbName === 'programa-curs.pdf') ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`, color: (kbEnabled && kbName === 'programa-curs.pdf') ? '#34c759' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Programa TIC</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={kbLoading} style={{ padding: '6px 10px', borderRadius: 8, background: (kbEnabled && kbName !== 'programa-curs.pdf') ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${(kbEnabled && kbName !== 'programa-curs.pdf') ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`, color: (kbEnabled && kbName !== 'programa-curs.pdf') ? '#34c759' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{kbLoading ? '⏳' : '+ PDF'}</button>
                <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
                {kbText && <button onClick={() => setKbEnabled(v => !v)} style={{ padding: '6px 10px', borderRadius: 8, background: 'none', border: `1px solid ${kbEnabled ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.12)'}`, color: kbEnabled ? '#34c759' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{kbEnabled ? 'KB ON' : 'KB OFF'}</button>}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 5 }}>System Prompt (Card 1)</label>
            <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setPromptEdited(true); }} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, boxSizing: 'border-box' }} />
            {promptEdited && <button onClick={() => { setPrompt(langConfig.prompt); setPromptEdited(false); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer', padding: 0 }}>↺ Reset</button>}
          </div>

          {error && <div style={{ fontSize: 11, color: '#ff6b6b', background: 'rgba(255,59,48,0.1)', borderRadius: 7, padding: '7px 10px' }}>{error}</div>}
        </div>

        {/* ── 4 Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <AvatarCard
            cardId="0"
            name="Alexandra"
            photo="/avatar-photo.png"
            voiceLabel={langConfig.voiceLabel}
            onStart={startCard1}
          />
          {KEY2_PERSONAS.map((p, i) => (
            <AvatarCard
              key={p.personaId}
              cardId={String(i + 1)}
              name={p.name}
              photo={p.photo}
              voiceLabel={p.voice}
              onStart={startKey2Card(p.personaId)}
              isKey2
            />
          ))}
        </div>

        {/* ── Config toggle ── */}
        <button onClick={() => setShowConfig(v => !v)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 14px', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace', alignSelf: 'flex-start'" }}>
          {showConfig ? '▲ hide config' : '⚙ api config (card 1)'}
        </button>

        {/* ── Config panel ── */}
        {showConfig && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace" }}>Card 1 — Key 1</div>
            <ConfigField label="API Key (blank = default)" value={config.apiKey} onChange={v => updateConfig({ apiKey: v })} password />
            <ConfigField label="Persona ID" value={config.personaId} onChange={v => updateConfig({ personaId: v })} />
            <ConfigField label="LLM ID" value={config.llmId} onChange={v => updateConfig({ llmId: v })} />
            <ConfigField label="Avatar ID" value={config.avatarId} onChange={v => updateConfig({ avatarId: v })} />

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 6 }}>Voice IDs (Card 1)</div>
            {LANGUAGES.map(l => (
              <ConfigField key={l.code} label={`${l.label} (${l.code})`} value={config.voices[l.code]} onChange={v => updateVoice(l.code, v)} />
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 6 }}>Cards 2–4 — Key 2 (read-only)</div>
            {KEY2_PERSONAS.map((p, i) => (
              <div key={p.personaId} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Card {i + 2}: {p.name} — {p.personaId}
              </div>
            ))}

            <button onClick={resetConfig} style={{ background: 'none', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 8, padding: '7px', color: 'rgba(255,59,48,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>↺ Reset card 1 to defaults</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
