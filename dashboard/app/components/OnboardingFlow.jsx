'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';
import { useWorkerSession } from './useWorkerSession';

const ALEXANDRA_WORKER = { id: 'alexandra-onboard', name: 'Alexandra', role: 'Onboarding Guide at Humans.AI' };
const ANAM_PERSONA_ID = '6ccddf38-aed1-4bbb-9809-fc92986eb436';
const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const STEPS = ['research', 'platforms', 'workers', 'hub'];

function getSystemPrompt(step, company) {
  const co = company?.name || 'the company';
  if (step === 'research') return `You are Alexandra, an AI assistant at Humans.AI. Guide the user through setting up their AI-powered back-office hub. Start by asking them to tell you about their company — name, industry, or website. Be warm and encouraging. Keep responses short (1-2 sentences). When they give you a company name, say you'll start researching now.`;
  if (step === 'platforms') return `You are Alexandra. You've just finished researching ${co}. Tell them about the platforms detected and ask if they'd like to add, remove, or modify any. Mention they can also upload screenshots of their current systems. Keep it conversational and brief.`;
  if (step === 'workers') return `You are Alexandra. The platforms for ${co} are ready. Now present the AI worker proposals — each worker is specialized for one of their platforms. Ask if the selection looks right. Keep responses short and clear.`;
  if (step === 'hub') return `You are Alexandra. Everything is set up for ${co}! Welcome them to the Humans.AI Hub. Be brief and enthusiastic.`;
  return `You are Alexandra, an AI assistant at Humans.AI. Be helpful and concise.`;
}

// ── StepStepper ───────────────────────────────────────────────────────────────
function StepStepper({ current }) {
  const labels = { research: 'Research', platforms: 'Platforms', workers: 'Workers', hub: 'Dashboard' };
  const colors = { research: '#6CDDEF', platforms: '#6CEFA0', workers: '#B06CEF', hub: '#EF9B6C' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((s, i) => {
        const idx = STEPS.indexOf(current);
        const isDone = i < idx;
        const isCurrent = s === current;
        const color = colors[s];
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99,
              background: isCurrent ? color : isDone ? `${color}22` : 'rgba(0,0,0,0.05)',
              border: isCurrent ? 'none' : `1px solid ${isDone ? color + '44' : 'rgba(0,0,0,0.08)'}`,
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              transform: isCurrent ? 'scale(1.06)' : 'scale(1)',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isCurrent ? '#fff' : isDone ? color : 'rgba(0,0,0,0.2)',
                transition: 'all 0.35s',
              }} />
              <span style={{
                fontSize: '0.65rem', fontFamily: "'JetBrains Mono',monospace",
                fontWeight: isCurrent ? 700 : isDone ? 600 : 400,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: isCurrent ? '#fff' : isDone ? color : 'rgba(0,0,0,0.4)',
                transition: 'color 0.35s',
              }}>{labels[s]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 28, height: 1.5, borderRadius: 1,
                background: i < STEPS.indexOf(current)
                  ? `linear-gradient(90deg, ${colors[STEPS[i]]}, ${colors[STEPS[i+1]]})`
                  : 'rgba(0,0,0,0.1)',
                transition: 'background 0.5s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AlexandraPanel ────────────────────────────────────────────────────────────
function AlexandraPanel({ connected, connecting, videoTrack, agentText, audioElRef, micMuted, toggleMute }) {
  const videoRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const speakTimerRef = useRef(null);

  useEffect(() => {
    if (agentText) {
      setSpeaking(true);
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = setTimeout(() => setSpeaking(false), 3000);
    }
  }, [agentText]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;
    try { videoTrack.attach(el); } catch {}
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

  return (
    <div style={{
      width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 20px', gap: 16, borderRight: '1px solid rgba(0,0,0,0.06)',
      background: 'rgba(255,255,255,0.35)',
    }}>
      {/* Avatar */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        {/* Animated ring */}
        {(connecting || speaking) && (
          <div style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: `2.5px solid ${speaking ? '#6CEFA0' : '#6CDDEF'}`,
            opacity: 0.7,
            animation: 'pulse-ring 1.4s ease-out infinite',
          }} />
        )}
        <div style={{
          width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          background: 'linear-gradient(135deg, #e0eaff, #aee8e2)',
          border: `2px solid ${connected ? (speaking ? '#6CEFA0' : 'rgba(108,223,239,0.5)') : 'rgba(0,0,0,0.08)'}`,
          transition: 'border-color 0.3s',
        }}>
          {videoTrack ? (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <img src={PHOTO_URL} alt="Alexandra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        {/* Status dot */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff',
          background: connected ? '#6CEFA0' : connecting ? '#F5C842' : '#ccc',
          transition: 'background 0.3s',
        }} />
      </div>

      {/* Name */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a' }}>Alexandra</div>
        <div style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
          {connecting ? 'Connecting…' : connected ? 'Live · Onboarding Guide' : 'AI Guide · Humans.AI'}
        </div>
      </div>

      {/* Speech bubble */}
      <div style={{
        flex: 1, width: '100%', minHeight: 60, maxHeight: 180,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
        borderRadius: 14, padding: '12px 14px', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'flex-start',
        transition: 'all 0.3s',
      }}>
        {agentText ? (
          <p style={{ margin: 0, fontFamily: 'system-ui', fontSize: '0.82rem', lineHeight: 1.55, color: '#1a1a1a' }}>
            {agentText}
          </p>
        ) : (
          <p style={{ margin: 0, fontFamily: 'system-ui', fontSize: '0.82rem', color: 'rgba(0,0,0,0.3)', fontStyle: 'italic' }}>
            {connecting ? 'Connecting to Alexandra…' : connected ? 'Listening…' : 'Voice guide ready'}
          </p>
        )}
      </div>

      {/* Mic button */}
      {connected && (
        <button
          onClick={toggleMute}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: micMuted ? 'rgba(239,68,68,0.12)' : 'rgba(108,239,160,0.12)',
            border: `1.5px solid ${micMuted ? 'rgba(239,68,68,0.3)' : 'rgba(108,239,160,0.4)'}`,
            cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={micMuted ? 'Unmute' : 'Mute'}
        >
          {micMuted ? '🔇' : '🎤'}
        </button>
      )}

      <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          70% { transform: scale(1.1); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── ResearchStep ──────────────────────────────────────────────────────────────
function ResearchStep({ sessionId, sendText, onDone }) {
  const [input, setInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]); // { name, dataUrl }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [error, setError] = useState('');
  const [visibleTiles, setVisibleTiles] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Animate research tiles appearing
  useEffect(() => {
    if (!result) return;
    let i = 0;
    const t = setInterval(() => {
      i++; setVisibleTiles(i);
      if (i >= 6) clearInterval(t);
    }, 180);
    return () => clearInterval(t);
  }, [result]);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res({ name: f.name, dataUrl: fr.result });
      fr.readAsDataURL(f);
    }))).then(imgs => setMediaFiles(prev => [...prev, ...imgs]));
  }

  async function doResearch(e) {
    e?.preventDefault();
    if (!input.trim()) return;
    setLoading(true); setError('');
    // Tell Alexandra we're starting
    if (sendText) sendText(`Researching ${input.trim()} now…`);
    try {
      const body = { company: input.trim(), sessionId };
      if (mediaFiles.length > 0) body.image_urls = mediaFiles.map(f => f.dataUrl);
      const r = await fetch('/api/demo/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.company) { setError(d.error || 'Research failed. Please try again.'); setLoading(false); return; }
      setResult(d);
      const all = (d.platforms || []).map(p => ({ ...p }));
      setPlatforms(all);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doResearch(); }
  }

  const infoTiles = result ? [
    result.company?.industry && { label: 'Industry', value: result.company.industry },
    result.company?.size && { label: 'Size', value: result.company.size },
    result.company?.country && { label: 'Country', value: result.company.country },
    result.company?.description && { label: 'About', value: result.company.description, wide: true },
    result.summary && { label: 'Summary', value: result.summary, wide: true },
    platforms.length > 0 && { label: 'Platforms found', value: `${platforms.length} systems detected`, wide: true },
  ].filter(Boolean) : [];

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {!result ? (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.6rem', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a' }}>
              Let's research your company
            </h2>
            <p style={{ fontFamily: 'system-ui', fontSize: '0.875rem', color: 'rgba(0,0,0,0.45)', margin: 0 }}>
              Enter a company name or website. We'll discover their tech stack and suggest platforms to simulate.
            </p>
          </div>

          <form onSubmit={doResearch} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Altex Romania or altex.ro"
                disabled={loading}
                style={{
                  flex: 1, padding: '0.75rem 1rem', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.85)',
                  fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#6CDDEF'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.12)'}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  padding: '0.75rem 1.4rem', background: 'linear-gradient(135deg,#6CDDEF,#4db8d4)',
                  color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer', opacity: (!input.trim() || loading) ? 0.6 : 1,
                  whiteSpace: 'nowrap', fontFamily: "'Space Grotesk','Inter',sans-serif",
                  transition: 'opacity 0.2s', boxShadow: '0 4px 16px rgba(108,221,239,0.35)',
                }}
              >
                {loading ? '⟳ Researching…' : 'Research →'}
              </button>
            </div>
          </form>

          {/* Upload section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Upload screenshots of current systems (optional)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {mediaFiles.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={f.dataUrl} alt={f.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                  <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <label style={{
                width: 72, height: 72, borderRadius: 10, border: '1.5px dashed rgba(0,0,0,0.18)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.5)',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6CDDEF'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>+</span>
                <span style={{ fontSize: '0.55rem', marginTop: 4 }}>Add image</span>
                <input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
              </label>
            </div>
          </div>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(108,221,239,0.2)', borderTopColor: '#6CDDEF', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)' }}>Researching {input} using web agents…</span>
              </div>
              {mediaFiles.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 34 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)' }}>Analyzing {mediaFiles.length} uploaded image{mediaFiles.length > 1 ? 's' : ''}…</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8rem', color: '#c53030' }}>
              {error}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Research results */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h2 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
                {result.company?.name || input}
              </h2>
              <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(108,239,160,0.15)', border: '1px solid rgba(108,239,160,0.35)', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: '#2a7a4a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Research complete
              </div>
            </div>
            {result.company?.description && (
              <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: 'rgba(0,0,0,0.55)', margin: 0, lineHeight: 1.6 }}>
                {result.company.description}
              </p>
            )}
          </div>

          {/* Info tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {infoTiles.map((t, i) => (
              <div
                key={i}
                style={{
                  gridColumn: t.wide ? '1 / -1' : undefined,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  opacity: i < visibleTiles ? 1 : 0,
                  transform: i < visibleTiles ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                }}
              >
                <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6CDDEF', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.5 }}>{t.value}</div>
              </div>
            ))}
          </div>

          {/* Platform selection */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Detected Platforms — select to build
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {platforms.map((p, i) => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, cursor: 'pointer',
                  background: p.selected ? 'rgba(108,239,160,0.1)' : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${p.selected ? 'rgba(108,239,160,0.3)' : 'rgba(0,0,0,0.07)'}`,
                  transition: 'all 0.2s',
                  opacity: i < visibleTiles ? 1 : 0,
                  transform: i < visibleTiles ? 'translateX(0)' : 'translateX(-16px)',
                }}>
                  <input type="checkbox" checked={!!p.selected} onChange={() => setPlatforms(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))} style={{ accentColor: '#34c759', width: 15, height: 15, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a' }}>{p.actual_software || p.name}</div>
                    {p.reason && <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.45)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.reason}</div>}
                  </div>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(0,0,0,0.35)', flexShrink: 0 }}>{p.id}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setResult(null); setPlatforms([]); setVisibleTiles(0); }}
              style={{ padding: '0.65rem 1.2rem', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.55)' }}>
              ← Re-search
            </button>
            <button
              onClick={() => onDone({ company: result.company, platforms })}
              disabled={!platforms.some(p => p.selected)}
              style={{
                flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg,#6CEFA0,#4dcc80)',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Space Grotesk','Inter',sans-serif",
                opacity: platforms.some(p => p.selected) ? 1 : 0.5,
                boxShadow: '0 4px 16px rgba(108,239,160,0.35)',
              }}
            >
              Build {platforms.filter(p => p.selected).length} platform{platforms.filter(p => p.selected).length !== 1 ? 's' : ''} →
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── PlatformsStep ─────────────────────────────────────────────────────────────
function PlatformsStep({ sessionId, company, platforms: initialPlatforms, onDone, onBack }) {
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [building, setBuilding] = useState(false);
  const [buildMsg, setBuildMsg] = useState('');
  const [deployed, setDeployed] = useState([]);
  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const selected = platforms.filter(p => p.selected);

  async function doBuild() {
    setBuilding(true); setBuildMsg('Discovering platform APIs…');
    const msgs = ['Cloning synthetic environment…', 'Spinning up sandboxes…', 'Seeding with demo data…'];
    let mi = 0;
    const t = setInterval(() => { if (mi < msgs.length) setBuildMsg(msgs[mi++]); }, 2500);
    try {
      const r = await fetch('/api/demo/build-platforms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms: selected }),
      });
      const d = await r.json();
      clearInterval(t);
      if (d.platforms) { setDeployed(d.platforms); setBuildMsg(''); }
    } catch { clearInterval(t); }
    setBuilding(false);
  }

  async function doAdjust() {
    if (!adjustInput.trim()) return;
    setAdjusting(true);
    const q = adjustInput.toLowerCase().trim();
    setAdjustInput('');
    // Parse simple commands like "add messaging", "remove hr", "add ecommerce"
    const addMatch = q.match(/^(add|include)\s+(\w+)/);
    const removeMatch = q.match(/^(remove|delete|drop)\s+(\w+)/);
    if (addMatch) {
      const id = addMatch[2];
      const already = platforms.find(p => p.id === id || p.name.toLowerCase().includes(id));
      if (already) {
        setPlatforms(prev => prev.map(p => (p.id === id || p.name.toLowerCase().includes(id)) ? { ...p, selected: true } : p));
      } else {
        // Add new platform
        const names = { crm: 'CRM', erp: 'ERP', hr: 'HR', messaging: 'Messaging', ecommerce: 'E-Commerce', analytics: 'Analytics', support: 'Support' };
        setPlatforms(prev => [...prev, { id, name: names[id] || id, selected: true, reason: 'Added manually' }]);
      }
    } else if (removeMatch) {
      const id = removeMatch[2];
      setPlatforms(prev => prev.map(p => (p.id === id || p.name.toLowerCase().includes(id)) ? { ...p, selected: false } : p));
    }
    setAdjusting(false);
  }

  if (deployed.length > 0) {
    return (
      <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            Platforms ready
          </h2>
          <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(108,239,160,0.15)', border: '1px solid rgba(108,239,160,0.35)', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: '#2a7a4a', textTransform: 'uppercase' }}>
            {deployed.length} deployed
          </div>
        </div>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.85rem', marginTop: 4, marginBottom: 20 }}>
          All platforms are live and seeded with demo data. You can preview them later.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {deployed.map((p, i) => (
            <div key={p.id} style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(108,239,160,0.25)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: 1, animation: `fadeSlideUp 0.4s ease ${i * 0.08}s both`,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(108,239,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                {{ crm: '👥', support: '🎫', analytics: '📊', erp: '📦', ecommerce: '🛒', hr: '🧑‍💼', messaging: '💬' }[p.id] || '🖥️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1a1a' }}>{p.actual_software || p.name}</div>
                {p.url && <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{p.url}</div>}
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6CEFA0', boxShadow: '0 0 6px rgba(108,239,160,0.5)', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        <button onClick={() => onDone(deployed)} style={{
          width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg,#B06CEF,#9040d0)',
          color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Space Grotesk','Inter',sans-serif",
          boxShadow: '0 4px 16px rgba(176,108,239,0.35)',
        }}>
          Propose AI Workers →
        </button>
        <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a' }}>
          Confirm platforms
        </h2>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.85rem', margin: 0 }}>
          {selected.length} platforms selected for {company?.name || 'this company'}. Adjust if needed, then build.
        </p>
      </div>

      {/* Platform list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
        {platforms.map((p, i) => (
          <label key={p.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer',
            background: p.selected ? 'rgba(108,239,160,0.1)' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${p.selected ? 'rgba(108,239,160,0.3)' : 'rgba(0,0,0,0.07)'}`,
            transition: 'all 0.2s',
          }}>
            <input type="checkbox" checked={!!p.selected} onChange={() => setPlatforms(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))} style={{ accentColor: '#34c759', width: 15, height: 15 }} />
            <span style={{ fontSize: '1.1rem' }}>{{ crm: '👥', support: '🎫', analytics: '📊', erp: '📦', ecommerce: '🛒', hr: '🧑‍💼', messaging: '💬' }[p.id] || '🖥️'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a' }}>{p.actual_software || p.name}</div>
              {p.reason && <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>{p.reason}</div>}
            </div>
          </label>
        ))}
      </div>

      {/* Voice adjust input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>
          Say or type: "add messaging", "remove hr", etc.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={adjustInput}
            onChange={e => setAdjustInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doAdjust()}
            placeholder="Adjust platforms…"
            style={{ flex: 1, padding: '0.6rem 0.875rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={doAdjust} disabled={adjusting || !adjustInput.trim()} style={{ padding: '0.6rem 1rem', borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', color: 'rgba(0,0,0,0.6)' }}>
            Apply
          </button>
        </div>
      </div>

      {building && (
        <div style={{ marginBottom: 16, padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(108,239,160,0.2)', borderTopColor: '#6CEFA0', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(0,0,0,0.5)' }}>{buildMsg || 'Building…'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.map(p => (
              <span key={p.id} style={{ padding: '3px 10px', background: 'rgba(108,239,160,0.1)', borderRadius: 6, fontSize: '0.7rem', color: '#1a1a1a', border: '1px solid rgba(108,239,160,0.2)' }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '0.65rem 1rem', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.5)' }}>
          ← Back
        </button>
        <button
          onClick={doBuild}
          disabled={building || selected.length === 0}
          style={{
            flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg,#6CEFA0,#4dcc80)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
            cursor: building ? 'wait' : 'pointer', fontFamily: "'Space Grotesk','Inter',sans-serif",
            opacity: (building || selected.length === 0) ? 0.6 : 1,
            boxShadow: '0 4px 16px rgba(108,239,160,0.35)',
          }}
        >
          {building ? 'Building…' : `Build ${selected.length} platform${selected.length !== 1 ? 's' : ''} →`}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── WorkersStep ───────────────────────────────────────────────────────────────
function WorkersStep({ sessionId, deployedPlatforms, onDone, onBack }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [visibleCards, setVisibleCards] = useState(0);
  const PHOTO = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/demo/workers/propose', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, platforms: deployedPlatforms }),
        });
        const d = await r.json();
        if (d.workers) {
          setWorkers(d.workers);
          const sel = {};
          d.workers.forEach(w => { sel[w.id] = true; });
          setSelected(sel);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Animate cards appearing
  useEffect(() => {
    if (loading || !workers.length) return;
    let i = 0;
    const t = setInterval(() => { i++; setVisibleCards(i); if (i >= workers.length) clearInterval(t); }, 150);
    return () => clearInterval(t);
  }, [loading, workers.length]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a' }}>
          AI Worker Proposals
        </h2>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.85rem', margin: 0 }}>
          One worker per platform, each with a specialized role. Select the ones to deploy.
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.06)', animation: 'pulse-skeleton 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(176,108,239,0.2)', borderTopColor: '#B06CEF', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(0,0,0,0.45)' }}>Designing AI workers for each platform…</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {workers.map((w, i) => (
          <div
            key={w.id}
            onClick={() => setSelected(prev => ({ ...prev, [w.id]: !prev[w.id] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderRadius: 12, cursor: 'pointer',
              background: selected[w.id] ? 'rgba(176,108,239,0.08)' : 'rgba(255,255,255,0.55)',
              border: `1.5px solid ${selected[w.id] ? 'rgba(176,108,239,0.3)' : 'rgba(0,0,0,0.07)'}`,
              transition: 'all 0.2s',
              opacity: i < visibleCards ? 1 : 0,
              transform: i < visibleCards ? 'translateX(0)' : 'translateX(20px)',
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <img src={w.photo || PHOTO} alt={w.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.src = PHOTO} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>{w.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.role || w.platform}</div>
              {w.capabilities?.length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                  {w.capabilities.slice(0, 3).map((c, j) => (
                    <span key={j} style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 99, background: 'rgba(176,108,239,0.1)', color: '#7a3dcf', fontFamily: 'monospace' }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: selected[w.id] ? '#B06CEF' : 'rgba(0,0,0,0.07)',
              border: `2px solid ${selected[w.id] ? '#B06CEF' : 'rgba(0,0,0,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {selected[w.id] && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
            </div>
          </div>
        ))}
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '0.65rem 1rem', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.5)' }}>
            ← Back
          </button>
          <button
            onClick={() => onDone(workers.filter(w => selected[w.id]))}
            disabled={selectedCount === 0}
            style={{
              flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg,#B06CEF,#9040d0)',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Space Grotesk','Inter',sans-serif",
              opacity: selectedCount === 0 ? 0.5 : 1,
              boxShadow: '0 4px 16px rgba(176,108,239,0.35)',
            }}
          >
            Open Hub with {selectedCount} worker{selectedCount !== 1 ? 's' : ''} →
          </button>
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-skeleton { 0%,100% { opacity:0.5; } 50% { opacity:0.9; } }
      `}</style>
    </div>
  );
}

// ── HubTransition ─────────────────────────────────────────────────────────────
function HubTransition({ onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => { onDone?.(); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, padding: '40px' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #EF9B6C, #d4784a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 16px 48px rgba(239,155,108,0.4)',
        transform: phase >= 1 ? 'scale(1)' : 'scale(0.5)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <span style={{ fontSize: '2rem', lineHeight: 1 }}>✦</span>
      </div>
      <div style={{
        textAlign: 'center',
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.4s ease 0.2s',
      }}>
        <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>Hub is ready</div>
        <div style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: 'rgba(0,0,0,0.45)' }}>Opening your AI back-office…</div>
      </div>
    </div>
  );
}

// ── OnboardingFlow (main) ─────────────────────────────────────────────────────
export function OnboardingFlow({ sessionId, onDone, onCancel }) {
  const [step, setStep] = useState('research');
  const [company, setCompany] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [deployedPlatforms, setDeployedPlatforms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [transitionDir, setTransitionDir] = useState(1); // 1=forward -1=backward

  const systemPrompt = getSystemPrompt(step, company);

  const { connected, connecting, videoTrack, agentText, sendText, updatePrompt, toggleMute, micMuted, audioElRef } = useWorkerSession({
    worker: ALEXANDRA_WORKER,
    sessionId,
    enabled: true,
    audioEnabled: true,
    videoEnabled: true,
    systemPrompt,
    personaId: ANAM_PERSONA_ID,
  });

  // Update Alexandra's prompt when step changes
  useEffect(() => {
    if (connected) updatePrompt(systemPrompt);
  }, [step, connected]);

  function goForward(s) { setTransitionDir(1); setStep(s); }
  function goBack(s) { setTransitionDir(-1); setStep(s); }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MeshGradient
          style={{ width: '100%', height: '100%' }}
          speed={0.15} scale={1.4} distortion={0.7} swirl={0.8}
          colors={['#E8F4FF', '#FFFFFF', '#E8FFE8', '#F0E8FF']}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', height: 60,
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#34c759,#30a74f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(52,199,89,0.3)' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#fff', fontWeight: 700, lineHeight: 1 }}>h</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>Humans.AI Hub</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Session Setup</div>
            </div>
          </div>

          <StepStepper current={step} />

          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '1.2rem', lineHeight: 1, padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Alexandra panel */}
          <AlexandraPanel
            connected={connected}
            connecting={connecting}
            videoTrack={videoTrack}
            agentText={agentText}
            audioElRef={audioElRef}
            micMuted={micMuted}
            toggleMute={toggleMute}
          />

          {/* Step content */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0,
              animation: `slideIn${transitionDir > 0 ? 'Forward' : 'Back'} 0.35s cubic-bezier(0.25,0.46,0.45,0.94) both`,
            }}>
              {step === 'research' && (
                <ResearchStep
                  sessionId={sessionId}
                  sendText={sendText}
                  onDone={(data) => {
                    setCompany(data.company);
                    setPlatforms(data.platforms);
                    goForward('platforms');
                  }}
                />
              )}
              {step === 'platforms' && (
                <PlatformsStep
                  sessionId={sessionId}
                  company={company}
                  platforms={platforms}
                  onDone={(deployed) => {
                    setDeployedPlatforms(deployed);
                    goForward('workers');
                  }}
                  onBack={() => goBack('research')}
                />
              )}
              {step === 'workers' && (
                <WorkersStep
                  sessionId={sessionId}
                  deployedPlatforms={deployedPlatforms}
                  onDone={(w) => {
                    setWorkers(w);
                    goForward('hub');
                  }}
                  onBack={() => goBack('platforms')}
                />
              )}
              {step === 'hub' && (
                <HubTransition onDone={onDone} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInForward {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInBack {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
