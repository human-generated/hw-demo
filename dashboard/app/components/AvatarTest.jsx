'use client';
import { useState, useRef } from 'react';
import { createClient } from '@anam-ai/js-sdk';

// Persona constants
const ANAM_PERSONA_ID = '6ccddf38-aed1-4bbb-9809-fc92986eb436';
const ANAM_PERSONA_NAME = 'Liv';
const ANAM_LLM_ID = '27cbd128-f1e6-4b67-8ab3-9123659be08c';

// Custom one-shot avatar IDs
const AVATAR_FEMALE = '160129b8-4668-42bf-9d77-c479ae16c403'; // Alexandra
const AVATAR_MALE   = '90505cad-620d-4a33-8976-36cd59a21bf4'; // Alex

// Voices
const VOICE_JILLIAN = '5ed805fd-e56e-46da-b1d9-0b3c4af9e146';
const VOICE_HARINI  = '9fa4b058-39b3-4980-89d8-7cbbec8098b0';
const VOICE_LAUREN  = 'd79f2051-3a89-4fcc-8c71-cf5d53f9d9e0';

const AVATARS = [
  { id: 'female', photo: '/avatar-photo.png',       avatarId: AVATAR_FEMALE, label: 'Alexandra' },
  { id: 'boy',    photo: '/avatar-boy.png',          avatarId: AVATAR_MALE,   label: 'Alex' },
  { id: 'girl2',  photo: '/avatar-girl-middle.png',  avatarId: AVATAR_FEMALE, label: 'Aria' },
  { id: 'girl3',  photo: '/avatar-girl-right.png',   avatarId: AVATAR_FEMALE, label: 'Maya' },
];

const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    voiceId: VOICE_JILLIAN,
    voice: 'Jillian (Cartesia)',
    prompt: 'You are Alexandra, a friendly AI assistant for Humans.AI Enterprise. Greet the user warmly in English and have a natural, helpful conversation. Keep responses concise.',
  },
  {
    code: 'hi',
    label: 'Hindi',
    voiceId: VOICE_HARINI,
    voice: 'Harini (ElevenLabs, native Hindi)',
    prompt: 'आप Alexandra हैं, Humans.AI Enterprise के लिए एक मित्रवत AI सहायक। उपयोगकर्ता को हिंदी में गर्मजोशी से अभिवादन करें और स्वाभाविक बातचीत करें। केवल हिंदी में बोलें।',
  },
  {
    code: 'mr',
    label: 'Marathi',
    voiceId: VOICE_HARINI,
    voice: 'Harini (ElevenLabs, approx. Marathi)',
    prompt: 'तुम्ही Alexandra आहात, Humans.AI Enterprise साठी एक मैत्रीपूर्ण AI सहाय्यक. वापरकर्त्याला मराठीत उबदारपणे अभिवादन करा आणि नैसर्गिक संभाषण करा. केवळ मराठीत बोला.',
  },
  {
    code: 'ro',
    label: 'Romanian',
    voiceId: VOICE_LAUREN,
    voice: 'Lauren (ElevenLabs, Romanian)',
    prompt: 'Ești Alexandra, un asistent AI prietenos pentru Humans.AI Enterprise. Salută utilizatorul cu căldură în română și poartă o conversație naturală. Vorbește exclusiv în română.',
  },
];

// Romanian ICT curriculum knowledge base (Programa școlară TIC, Clasa a IX-a, 2025)
const KB_PROGRAMA = `KNOWLEDGE BASE – Programa școlară TIC, Clasa a IX-a (2025)

Disciplina: Tehnologia informației și a comunicațiilor (TIC), trunchi comun, 1 oră/săptămână, clasele IX–XII.

COMPETENȚE GENERALE:
CG1 – Recunoaște conceptele, instrumentele și relațiile fundamentale din domeniul TIC pentru a construi cunoștințe utilizabile.
CG2 – Explică principiile și rolul instrumentelor TIC pentru rezolvarea sarcinilor într-o societate digitală.
CG3 – Utilizează instrumentele și metodele TIC pentru rezolvarea de sarcini specifice, respectând pașii operaționali.
CG4 – Analizează instrumentele și strategiile TIC pentru a face alegeri adecvate într-o societate digitală.
CG5 – Evaluează eficiența și impactul instrumentelor TIC pe baza unor criterii tehnice, etice și legale.
CG6 – Creează produse și soluții digitale personalizate, adecvate scopului propus.

DOMENII DE CONȚINUT (Clasa a IX-a):
1. Comunicare și colaborare digitală – platforme de comunicare, colaborare online, glosar digital, forme de comunicare digitală.
2. Inteligență artificială și societate digitală – termeni cheie (IA, algoritm, învățare automată, rețea neuronală, realitate virtuală), instrumente IA, utilizare responsabilă.
3. Arhitectura sistemelor de calcul – componente hardware, funcționare, internet of things, roboți, obiecte inteligente.
4. Aplicații dedicate – procesare text, calcul tabelar, prezentări, aplicații cu interfețe vizuale.
5. Programare vizuală și robotică – creare programe cu elemente vizuale interactive, gândire logică, algoritmică.
6. Competențe digitale transversale – organizare, comunicare, colaborare, gândire critică, securitate cibernetică.

METODOLOGIE: Activități în laboratorul de informatică, proiecte individuale și de grup, abordare practică, interdisciplinară.`;

const KNOWLEDGE_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'programa', label: 'Programa TIC IX-a (RO)' },
];

const VIDEO_ID = 'avatar-test-video';

export function AvatarTest() {
  const [langCode, setLangCode] = useState('en');
  const [prompt, setPrompt] = useState(LANGUAGES[0].prompt);
  const [promptEdited, setPromptEdited] = useState(false);
  const [status, setStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [knowledgeBase, setKnowledgeBase] = useState('none');
  const clientRef = useRef(null);

  const langConfig = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  const avatarConfig = AVATARS.find(a => a.id === selectedAvatar) || AVATARS[0];

  function handleLangChange(code) {
    setLangCode(code);
    if (!promptEdited) {
      const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
      setPrompt(lang.prompt);
    }
  }

  function buildPrompt() {
    let p = prompt;
    if (knowledgeBase === 'programa') {
      p = `${p}\n\n${KB_PROGRAMA}`;
    }
    return p;
  }

  async function startCall() {
    setError('');
    setStatus('connecting');
    try {
      const personaConfig = {
        personaId: ANAM_PERSONA_ID,
        name: ANAM_PERSONA_NAME,
        avatarId: avatarConfig.avatarId,
        llmId: ANAM_LLM_ID,
        voiceId: langConfig.voiceId,
        languageCode: langConfig.code,
        systemPrompt: buildPrompt(),
      };
      const tokenRes = await fetch('/api/anam/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaConfig }),
      });
      const { sessionToken, error: tokenErr } = await tokenRes.json();
      if (!sessionToken) throw new Error(tokenErr ? JSON.stringify(tokenErr) : 'Failed to get session token');

      const client = createClient(sessionToken);
      clientRef.current = client;

      client.addListener('CONNECTION_ESTABLISHED', () => console.log('[AvatarTest] connection established'));
      client.addListener('VIDEO_PLAY_STARTED', () => { console.log('[AvatarTest] video playing'); setStatus('connected'); });
      client.addListener('CONNECTION_CLOSED', () => { console.log('[AvatarTest] connection closed'); setStatus('idle'); clientRef.current = null; });

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
      gap: 20,
      overflowY: 'auto',
      padding: '20px 0',
    }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>
          Avatar Test
        </span>
      </div>

      {/* Video area */}
      <div style={{
        width: 360, height: 480, borderRadius: 20,
        background: '#1a1a1a', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', flexShrink: 0,
      }}>
        <img
          src={avatarConfig.photo}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
        <video
          id={VIDEO_ID}
          autoPlay
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }}
        />
        {status !== 'connected' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: status === 'connecting' ? 'rgba(0,0,0,0.45)' : 'transparent',
            gap: 12,
          }}>
            {status === 'connecting' && (
              <>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#fff', opacity: 0.7 }}>Connecting…</span>
              </>
            )}
          </div>
        )}
        {status === 'connected' && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759' }} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </div>
        )}
        {status === 'connected' && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 10px' }}>
            <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "'IBM Plex Mono', monospace" }}>{langConfig.voice}</span>
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

        {/* Avatar selector */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>
            Avatar
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {AVATARS.map(av => (
              <button
                key={av.id}
                onClick={() => !isActive && setSelectedAvatar(av.id)}
                disabled={isActive}
                style={{
                  flex: 1, padding: 0, border: 'none', background: 'none', cursor: isActive ? 'not-allowed' : 'pointer',
                  opacity: isActive ? 0.5 : 1,
                }}
              >
                <div style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `2px solid ${selectedAvatar === av.id ? '#34c759' : 'rgba(255,255,255,0.1)'}`,
                  aspectRatio: '3/4', position: 'relative',
                }}>
                  <img src={av.photo} alt={av.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '4px 4px 3px',
                    fontSize: 9, textAlign: 'center', color: '#fff', fontWeight: 600,
                  }}>{av.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
            Language
          </label>
          <select
            value={langCode}
            onChange={e => { handleLangChange(e.target.value); setPromptEdited(false); }}
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
          {!isActive && (
            <div style={{ marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              voice: {langConfig.voice}
            </div>
          )}
        </div>

        {/* Knowledge base */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
            Knowledge Base
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {KNOWLEDGE_OPTIONS.map(kb => (
              <button
                key={kb.id}
                onClick={() => !isActive && setKnowledgeBase(kb.id)}
                disabled={isActive}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none',
                  background: knowledgeBase === kb.id ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${knowledgeBase === kb.id ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: knowledgeBase === kb.id ? '#34c759' : 'rgba(255,255,255,0.5)',
                  fontSize: 12, fontWeight: 600, cursor: isActive ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: isActive ? 0.5 : 1,
                }}
              >
                {kb.label}
              </button>
            ))}
          </div>
          {knowledgeBase === 'programa' && !isActive && (
            <div style={{ marginTop: 5, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Programa școlară TIC, Clasa a IX-a, 2025 — injected into prompt
            </div>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
            System Prompt
          </label>
          <textarea
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setPromptEdited(true); }}
            disabled={isActive}
            rows={4}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9,
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical',
              fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5,
              boxSizing: 'border-box',
              opacity: isActive ? 0.5 : 1,
            }}
          />
          {promptEdited && !isActive && (
            <button
              onClick={() => { setPrompt(langConfig.prompt); setPromptEdited(false); }}
              style={{ marginTop: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              ↺ Reset to default
            </button>
          )}
        </div>

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
