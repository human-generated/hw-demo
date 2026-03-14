'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import { MeshGradient, LiquidMetal, FlutedGlass } from '@paper-design/shaders-react';
import { WordsStagger } from './WordsStagger';
import { DockIcons } from './DockIcons';

const ANAM_API_KEY = "NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9";
const ANAM_PERSONA_ID = "6ccddf38-aed1-4bbb-9809-fc92986eb436";
const PHOTO_URL = "https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png";

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
    <svg width="69" height="21" viewBox="0 0 80 24" fill="none" style={{ opacity: 0.2, flexShrink: 0 }}>
      {BARS.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}


export function Workspace({ companyName = 'Meridian Corp.', company = null, researchSummary = '', researchFindings = [], anamClient = null, cameraStream = null, avatarStream = null, onOpenWorkerProfile, onGoHome, onGoCall, onGoHub, onGoWorkers, onGoPlatforms, onGoAbout, sessionId, onBackToDashboard }) {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, author: 'ALEXANDRA', text: "I'm your orchestrator. What company should I research?", time: 'Just now', isUser: false },
  ]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(!!cameraStream);
  const [callStartTime, setCallStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [orchestratorLoading, setOrchestratorLoading] = useState(false);
  const [tilesData, setTilesData] = useState(null);
  const [tilesLoading, setTilesLoading] = useState(false);

  const anamClientRef = useRef(anamClient);
  const cameraStreamRef = useRef(cameraStream);
  const cameraVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const msgSeqRef = useRef(2);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    function attachSubtitleListener(client) {
      client.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (evt) => {
        if (evt.content && evt.role !== 'user') {
          setSubtitleText(prev => {
            const words = prev ? prev.split(' ') : [];
            words.push(evt.content);
            if (words.length > 8) words.shift();
            return words.join(' ');
          });
          if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
          subtitleTimerRef.current = setTimeout(() => setSubtitleText(''), 4000);
        }
      });
    }
    async function init() {
      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
      }
      if (anamClientRef.current) {
        // Existing client handed off from Homepage — already connected, just re-attach stream
        attachSubtitleListener(anamClientRef.current);
        // VIDEO_PLAY_STARTED already fired; mark connected immediately
        if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        // Attach the media stream directly to the Workspace video element
        const videoEl = document.getElementById('ws-avatar-video');
        if (videoEl && avatarStream) {
          videoEl.srcObject = avatarStream;
          videoEl.muted = false;
          videoEl.play().catch(() => {});
        } else if (videoEl) {
          // No stream captured — try re-streaming (may not fire VIDEO_PLAY_STARTED again)
          try { await anamClientRef.current.streamToVideoElement('ws-avatar-video'); } catch {}
        }
        return;
      }
      await createFreshSession();
    }
    async function createFreshSession() {
      if (cancelled) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!cancelled) { cameraStreamRef.current = stream; setCameraOn(true); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream; }
      } catch { console.warn('Camera denied'); }
      if (cancelled) return;
      try {
        const newClient = unsafe_createClientWithApiKey(ANAM_API_KEY, { personaId: ANAM_PERSONA_ID });
        anamClientRef.current = newClient;
        newClient.addListener('VIDEO_PLAY_STARTED', () => {
          if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        });
        attachSubtitleListener(newClient);
        await newClient.streamToVideoElement('ws-avatar-video');
      } catch (err) { console.error('Anam connection failed:', err); if (!cancelled) setIsConnecting(false); }
    }
    const timer = setTimeout(init, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setTilesLoading(true);
    fetch(`/api/demo/research/${sessionId}/tiles`)
      .then(r => r.json())
      .then(d => { if (!d.error) setTilesData(d); })
      .catch(() => {})
      .finally(() => setTilesLoading(false));
  }, [sessionId, companyName]);

  const attachCamera = useCallback(el => {
    cameraVideoRef.current = el;
    if (el && cameraStreamRef.current) el.srcObject = cameraStreamRef.current;
  }, []);

  useEffect(() => {
    if (!isConnected || !callStartTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - callStartTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isConnected, callStartTime]);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  const handleToggleMute = useCallback(() => {
    const client = anamClientRef.current;
    if (!client) return;
    if (micMuted) { client.unmuteInputAudio(); setMicMuted(false); }
    else { client.muteInputAudio(); setMicMuted(true); }
  }, [micMuted]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream; setCameraOn(true);
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      } catch { /* */ }
    }
  }, [cameraOn]);

  const handleEndCall = useCallback(() => {
    anamClientRef.current?.stopStreaming(); anamClientRef.current = null;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null;
    setIsConnected(false); setCameraOn(false); setCallStartTime(null);
  }, []);

  const handleToggleAvatarMute = useCallback(() => {
    const videoEl = document.getElementById('ws-avatar-video');
    if (!videoEl) return;
    const next = !avatarMuted; videoEl.muted = next; setAvatarMuted(next);
  }, [avatarMuted]);

  async function handleChatSubmit(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || orchestratorLoading) return;
    const userMsg = { id: ++msgSeqRef.current, author: 'YOU', text, time: 'Just now', isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    if (isConnected && anamClientRef.current) {
      anamClientRef.current.sendUserMessage(text);
    }

    // Send to real orchestrator
    setOrchestratorLoading(true);
    try {
      const res = await fetch('/api/demo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId || 'workspace-session' }),
      });
      const data = await res.json();
      if (data.reply || data.message) {
        setMessages(prev => [...prev, {
          id: ++msgSeqRef.current,
          author: 'ALEXANDRA',
          text: data.reply || data.message,
          time: 'Just now',
          isUser: false,
        }]);
      }
    } catch (err) {
      console.error('Orchestrate error:', err);
    } finally {
      setOrchestratorLoading(false);
    }
  }

  return (
    <div className="ws">
      <MeshGradient
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        speed={0.19} scale={1.51} distortion={0.88} swirl={1}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      <nav className="ws-menu">
        <div className="ws-menu-left">
          <span className="ws-menu-logo">h</span>
          <div className="ws-menu-sep" />
          <span className="ws-menu-label">Workspace</span>
        </div>
        <div className="ws-menu-center">
          <DockIcons active="hub" onHome={onGoHome} onHub={onGoHub || onGoCall} onWorkers={onGoWorkers} onPlatforms={onGoPlatforms} onAbout={onGoAbout} />
        </div>
        <div className="ws-menu-right">
          {sessionId && (
            <span onClick={() => navigator.clipboard?.writeText(sessionId).catch(() => {})} title="Click to copy session ID" style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', userSelect: 'all', letterSpacing: '0.04em' }}>{sessionId}</span>
          )}
          {onBackToDashboard && (
            <button onClick={onBackToDashboard} title="Back to Dashboard" className="ws-menu-btn" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className="ws-menu-avatar">S</div>
        </div>
      </nav>

      <div className="ws-left">
        <div className="ws-card">
          <div className="ws-badge">
            <div className="ws-badge-green-bg" />
            <div className="ws-badge-photo-wrap">
              <div className="ws-badge-photo" style={{
                backgroundImage: `radial-gradient(ellipse 61% 61% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${PHOTO_URL})`,
                backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
              }} />
              <video id="ws-avatar-video" autoPlay playsInline className="ws-badge-video" style={{ display: isConnected ? 'block' : 'none' }} />
              {isConnected && <div className="ws-badge-video-fade" />}
              <button className={`ws-avatar-mute ${avatarMuted ? 'ws-avatar-mute--on' : ''} ${isConnected ? '' : 'ws-avatar-mute--hidden'}`} onClick={handleToggleAvatarMute}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {!avatarMuted && <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
                </svg>
              </button>
              {subtitleText && <div className="ws-badge-subtitles">{subtitleText}</div>}
            </div>
            <div className="ws-badge-info">
              <div className="ws-badge-name-row">
                <div className="ws-badge-name-col">
                  <span className="ws-badge-name" onClick={onOpenWorkerProfile} style={{ cursor: onOpenWorkerProfile ? 'pointer' : undefined }}>
                    Alexandra{'\n'}Seaman
                  </span>
                  <span className="ws-badge-role">Orchestrator · Humans.AI</span>
                </div>
                {cameraOn && (
                  <div className="ws-badge-camera-pip">
                    <video ref={attachCamera} autoPlay playsInline muted />
                  </div>
                )}
              </div>
            </div>
            <div className="ws-call-controls">
              <div className="ws-call-info">
                <span className={`ws-call-dot ${isConnected ? 'ws-call-dot--active' : ''}`} />
                <span className="ws-call-label">{isConnected ? 'In Call' : isConnecting ? 'Connecting...' : 'Idle'}</span>
                <span className="ws-call-time">{isConnected ? timeStr : ''}</span>
              </div>
              <div className="ws-call-buttons">
                <button className={`ws-call-btn ws-call-btn--mic ${micMuted ? 'ws-call-btn--mic-muted' : ''}`} onClick={handleToggleMute} disabled={!isConnected}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="7" rx="2" fill="#fff" /><path d="M4 8C4 8 4 11.5 8 11.5C12 11.5 12 8 12 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><line x1="8" y1="11.5" x2="8" y2="14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <button className="ws-call-btn ws-call-btn--phone" onClick={handleToggleCamera} disabled={!isConnected}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4.5C2 4.5 4 2 8 2C12 2 14 4.5 14 4.5L12.5 7L10.5 5.5V10.5L12.5 9L14 11.5C14 11.5 12 14 8 14C4 14 2 11.5 2 11.5L3.5 9L5.5 10.5V5.5L3.5 7L2 4.5Z" fill="#fff" /></svg>
                </button>
                <button className="ws-call-btn ws-call-btn--end" onClick={handleEndCall} disabled={!isConnected}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
            <div className="ws-badge-top">
              <div className="ws-badge-verif">
                <span>VERIFIEDAIHUMAN&lt;&lt;&lt;&lt;&lt;</span>
                <span>ORCHESTRATOR&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
              </div>
              <BarcodeSvg />
            </div>
            <FlutedGlass className="ws-badge-glass" size={0.95} shape="zigzag" angle={0} distortionShape="cascade" distortion={1} shift={0} blur={0.34} edges={0.25} stretch={0} scale={1} fit="cover" highlights={0} shadows={0.25} colorBack="#00000000" colorHighlight="#FFFFFF" colorShadow="#FFFFFF" />
          </div>

          <div className="ws-chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`ws-msg ${msg.isUser ? 'ws-msg--right' : ''}`}>
                <div className="ws-msg-meta">
                  <span className="ws-msg-author">{msg.author}</span>
                  <span className="ws-msg-time">{msg.time}</span>
                </div>
                <div className="ws-msg-bubble">{msg.text}</div>
              </div>
            ))}
            {orchestratorLoading && (
              <div className="ws-msg">
                <div className="ws-msg-meta"><span className="ws-msg-author">ALEXANDRA</span></div>
                <div className="ws-msg-bubble" style={{ opacity: 0.5 }}>Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="ws-chat-input" onSubmit={handleChatSubmit}>
            <div className="ws-chat-input-wrap">
              <input className="ws-chat-input-field" placeholder="Message the orchestrator..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <div className="ws-send-wrap">
                <LiquidMetal className="ws-send-ring" speed={1} softness={0.1} repetition={2} shiftRed={0.3} shiftBlue={0.3} distortion={0.07} contour={0.4} scale={1.87} rotation={0} shape="diamond" angle={70} colorBack="#00000000" colorTint="#FFFFFF" style={{ backgroundColor: '#AAAAAC', borderRadius: '999px', height: '44px', width: '44px' }} />
                <button type="submit" className="ws-chat-send" aria-label="Send">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="ws-right">
        <div className="ws-research-header">
          <div className="ws-research-title-row">
            <WordsStagger className="ws-research-prefix" delay={0.3} stagger={0.06} speed={0.4}>Company Research</WordsStagger>
            <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: 20 }}>|</span>
            <WordsStagger className="ws-research-company" delay={0.5} stagger={0.08} speed={0.5}>{tilesData?.companyName || companyName}</WordsStagger>
            {!tilesLoading && tilesData && (
              <div className="ws-live-badge"><span className="ws-live-dot" /><span className="ws-live-text">Live Data</span></div>
            )}
            {tilesLoading && <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>loading…</span>}
          </div>
          {tilesData?.lastUpdated && <div className="ws-updated">Updated {new Date(tilesData.lastUpdated).toLocaleDateString()}</div>}
        </div>

        {/* Fixed metric tiles — always shown, data from API */}
        <div className="ws-metrics">
          {[
            { label: 'Annual Revenue', value: tilesData?.fixed?.revenue ?? '--' },
            { label: 'Employees', value: tilesData?.fixed?.employees ?? '--' },
            { label: 'Market Cap', value: tilesData?.fixed?.marketCap ?? '--' },
            { label: 'Sector', value: tilesData?.fixed?.sector ?? '--' },
          ].map((m, i) => (
            <div key={m.label} className="ws-metric">
              <WordsStagger className="ws-metric-label" delay={0.6 + i * 0.1} stagger={0.05} speed={0.35}>{m.label}</WordsStagger>
              <WordsStagger className="ws-metric-value" delay={0.8 + i * 0.1} stagger={0.08} speed={0.4}>{m.value}</WordsStagger>
            </div>
          ))}
        </div>

        {/* Dynamic tiles from research */}
        {tilesLoading && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '0 1.5rem 1rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(0,0,0,0.05)', flex: '1 1 160px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}
        {!tilesLoading && tilesData?.tiles?.length > 0 && (
          <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {tilesData.tiles.map(tile => (
              <div key={tile.id} style={{ flex: tile.wide ? '1 1 100%' : '1 1 160px', minWidth: tile.wide ? '100%' : 140, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '0.85rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', marginBottom: 6 }}>{tile.label}</div>
                <div style={{ fontSize: tile.wide ? '0.78rem' : '0.88rem', fontWeight: tile.wide ? 400 : 600, color: '#1a1a1a', lineHeight: 1.45 }}>{tile.value}</div>
              </div>
            ))}
          </div>
        )}
        {!tilesLoading && !tilesData && (
          <div style={{ padding: '1rem 1.5rem', color: 'rgba(0,0,0,0.3)', fontSize: '0.8rem' }}>
            Research a company to see insights here.
          </div>
        )}
      </div>
    </div>
  );
}
