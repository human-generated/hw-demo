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

function parseCompanyMetrics(company) {
  if (!company) return { revenue: '$--', employees: '--', marketCap: '$--', sectorRank: '--', sector: '--', domain: '', siteName: 'COMPANY' };
  const size = company.size || '';
  const empMatch = size.match(/~?([\d,]+(?:\.\d+)?[Kk]?)\s*(?:000\s*)?employees/i);
  const revMatch = size.match(/~?([€$£]\s*[\d,]+(?:\.\d+)?[MBKmb]+)\b/i);
  const employees = empMatch ? empMatch[1].replace(/,/g, '') : '--';
  const revenue = revMatch ? revMatch[1].replace(/\s+/g, '') : '--';
  const domainRaw = company.domain || '';
  const domain = domainRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const words = company.name ? company.name.split(/\s+/) : [];
  const siteName = (words[0] || 'COMPANY').toUpperCase().slice(0, 10);
  return {
    revenue: revenue !== '--' ? revenue : '$--',
    employees: employees !== '--' ? employees : '--',
    marketCap: '$--',
    sectorRank: '--',
    sector: company.industry || '--',
    domain,
    siteName,
  };
}

export function Workspace({ companyName = 'Meridian Corp.', company = null, researchSummary = '', researchFindings = [], anamClient = null, cameraStream = null, avatarStream = null, onOpenWorkerProfile, onGoHome, onGoCall, onGoWorkers, sessionId }) {
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
  const metrics = parseCompanyMetrics(company);

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
          <DockIcons active="home" onHome={onGoHome} onCall={onGoCall} onWorkers={onGoWorkers} />
        </div>
        <div className="ws-menu-right">
          <button className="ws-menu-btn">About</button>
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
            <WordsStagger className="ws-research-company" delay={0.5} stagger={0.08} speed={0.5}>{companyName}</WordsStagger>
            <div className="ws-live-badge">
              <span className="ws-live-dot" />
              <span className="ws-live-text">Live Data</span>
            </div>
          </div>
          <WordsStagger className="ws-updated" delay={0.7} stagger={0.06} speed={0.4}>Updated 2m ago</WordsStagger>
        </div>

        <div className="ws-metrics">
          {[
            { label: 'Annual Revenue', value: metrics.revenue, change: company?.industry || 'Enterprise', delay: 0.6 },
            { label: 'Employees', value: metrics.employees, change: company?.size?.match(/([A-Za-z]+\s*enterprise|[A-Za-z]+\s*company)/i)?.[0] || 'Global operations', delay: 0.7 },
            { label: 'Market Cap', value: metrics.marketCap, change: company?.country || '--', delay: 0.8 },
            { label: 'Sector', value: (company?.industry || '--').split(/[,/]/)[0].trim(), change: company?.size?.split(',').slice(-1)[0]?.trim() || '--', delay: 0.9 },
          ].map(m => (
            <div key={m.label} className="ws-metric">
              <WordsStagger className="ws-metric-label" delay={m.delay} stagger={0.05} speed={0.35}>{m.label}</WordsStagger>
              <WordsStagger className="ws-metric-value" delay={m.delay + 0.2} stagger={0.08} speed={0.4}>{m.value}</WordsStagger>
              <WordsStagger className="ws-metric-change" delay={m.delay + 0.4} stagger={0.06} speed={0.35}>{m.change}</WordsStagger>
            </div>
          ))}
        </div>

        <div className="ws-charts-row">
          <div className="ws-chart-card" style={{ flex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <WordsStagger className="ws-chart-title" delay={1.2} stagger={0.06} speed={0.4}>Revenue Trend</WordsStagger>
              <div style={{ display: 'flex', gap: 12 }}>
                {['1M', '6M', '1Y', 'ALL'].map(p => (
                  <span key={p} style={{ fontFamily: "'DM Sans', system-ui", fontSize: 11, color: p === '1Y' ? '#1a1a1a' : 'rgba(0,0,0,0.3)', fontWeight: p === '1Y' ? 600 : 400, cursor: 'pointer' }}>{p}</span>
                ))}
              </div>
            </div>
            <svg className="ws-chart-svg" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34c759" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#34c759" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,85 C50,80 100,70 150,55 C200,40 250,35 300,25 C340,18 380,15 400,12 L400,100 L0,100 Z" fill="url(#chartGrad)" />
              <path d="M0,85 C50,80 100,70 150,55 C200,40 250,35 300,25 C340,18 380,15 400,12" fill="none" stroke="#34c759" strokeWidth="2" />
            </svg>
            <div className="ws-chart-footer">
              <WordsStagger className="ws-chart-value" delay={1.4} stagger={0.08} speed={0.4}>{metrics.revenue}</WordsStagger>
              <WordsStagger className="ws-metric-change" delay={1.5} stagger={0.06} speed={0.35}>{company?.industry || 'Revenue'}</WordsStagger>
            </div>
          </div>

          <div className="ws-chart-card" style={{ flex: 1 }}>
            <WordsStagger className="ws-chart-title" delay={1.3} stagger={0.06} speed={0.4}>Competitive Landscape</WordsStagger>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: companyName, pct: 34, color: '#34c759' },
                { name: 'Industry Leader', pct: 28, color: 'rgba(0,0,0,0.12)' },
                { name: 'Peer Co.', pct: 22, color: 'rgba(0,0,0,0.08)' },
                { name: 'Others', pct: 16, color: 'rgba(0,0,0,0.05)' },
              ].map(c => (
                <div key={c.name}>
                  <div className="ws-competitor-row">
                    <span className="ws-competitor-name">{c.name}</span>
                    <span className="ws-competitor-pct" style={{ color: c.name === companyName ? '#34c759' : 'rgba(0,0,0,0.35)' }}>{c.pct}%</span>
                  </div>
                  <div className="ws-competitor-bar" style={{ width: `${c.pct * 2.5}%`, background: c.color }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ws-signals-row">
          <div className="ws-signals-card">
            <WordsStagger className="ws-signals-title" delay={1.5} stagger={0.06} speed={0.4}>Key Signals</WordsStagger>
            <div className="ws-signals-tags">
              {(researchFindings && researchFindings.length > 0
                ? researchFindings.slice(0, 5).map(f => (typeof f === 'string' ? f : (f.title || f.text || '')).replace(/^[-•*]\s*/, '').slice(0, 35))
                : ['Research Pending', 'AI Analysis', 'Data Collection', 'Market Scan', 'Report Ready']
              ).map(s => (
                <span key={s} className="ws-signal-tag">{s}</span>
              ))}
            </div>
          </div>
          <div className="ws-ai-score">
            <WordsStagger className="ws-ai-score-label" delay={1.6} stagger={0.06} speed={0.35}>AI Score</WordsStagger>
            <WordsStagger className="ws-ai-score-value" delay={1.8} stagger={0.1} speed={0.5}>87</WordsStagger>
            <WordsStagger className="ws-ai-score-sub" delay={2.0} stagger={0.06} speed={0.35}>out of 100</WordsStagger>
          </div>
        </div>

        <div className="ws-sandbox-section">
          <div className="ws-sandbox-header">
            <WordsStagger className="ws-sandbox-label" delay={1.8} stagger={0.06} speed={0.4}>Virtual Sandbox</WordsStagger>
            <div className="ws-sandbox-env-badge">
              <span>2 environments running</span>
              <span className="ws-sandbox-env-dot" />
            </div>
          </div>
          <div className="ws-sandbox-container">
            <div className="ws-sandbox-browser">
              <div className="ws-sandbox-toolbar">
                <div className="ws-sandbox-dots">
                  <span className="ws-sandbox-dot ws-sandbox-dot--red" />
                  <span className="ws-sandbox-dot ws-sandbox-dot--yellow" />
                  <span className="ws-sandbox-dot ws-sandbox-dot--green" />
                </div>
                <div className="ws-sandbox-nav-arrows">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="ws-sandbox-url"><span>{metrics.domain ? `${metrics.domain}/investor-relations` : 'investor-relations'}</span></div>
              </div>
              <div className="ws-sandbox-page">
                <div className="ws-sandbox-app-nav">
                  <span className="ws-sandbox-site-name">{metrics.siteName}</span>
                  <div className="ws-sandbox-app-links"><span>Products</span><span>Investors</span><span>About</span></div>
                </div>
                <div className="ws-sandbox-results-section">
                  <span className="ws-sandbox-results-title">{company?.industry || 'Company'} Overview</span>
                  <span className="ws-sandbox-results-subtitle">{company?.description ? company.description.split('.')[0] + '.' : `${companyName} — AI back-office simulation.`}</span>
                </div>
                <div className="ws-sandbox-dash-metrics">
                  <div className="ws-sandbox-dash-metric ws-sandbox-dash-metric--highlight">
                    <span className="ws-sandbox-dash-metric-label">REVENUE</span>
                    <span className="ws-sandbox-dash-metric-value">{metrics.revenue}</span>
                  </div>
                  <div className="ws-sandbox-dash-metric">
                    <span className="ws-sandbox-dash-metric-label">EMPLOYEES</span>
                    <span className="ws-sandbox-dash-metric-value">{metrics.employees}</span>
                  </div>
                  <div className="ws-sandbox-dash-metric">
                    <span className="ws-sandbox-dash-metric-label">SECTOR</span>
                    <span className="ws-sandbox-dash-metric-value ws-sandbox-dash-metric-value--green">{(company?.industry || '--').split(/[,/]/)[0].slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ws-sandbox-phone">
              <div className="ws-sandbox-phone-notch" />
              <div className="ws-sandbox-phone-screen">
                <div className="ws-sandbox-phone-status">
                  <span className="ws-sandbox-phone-time">9:41</span>
                </div>
                <div className="ws-sandbox-stock-name">{companyName.split(' ')[0]}</div>
                <div className="ws-sandbox-stock-price-row">
                  <span className="ws-sandbox-stock-price">$68.42</span>
                  <span className="ws-sandbox-stock-change">+2.4%</span>
                </div>
                <svg className="ws-sandbox-stock-chart" width="100%" height="24" viewBox="0 0 90 24" fill="none" preserveAspectRatio="none">
                  <path d="M0 20 Q10 18 20 16 T40 12 T60 8 T80 5 T90 3" stroke="#34C759" strokeWidth="1.5" fill="none" />
                  <path d="M0 20 Q10 18 20 16 T40 12 T60 8 T80 5 T90 3 L90 24 L0 24 Z" fill="#34C759" style={{ opacity: 0.08 }} />
                </svg>
                <div className="ws-sandbox-stock-buttons">
                  <div className="ws-sandbox-stock-btn ws-sandbox-stock-btn--buy">Buy</div>
                  <div className="ws-sandbox-stock-btn ws-sandbox-stock-btn--sell">Sell</div>
                </div>
                <div className="ws-sandbox-stock-stats">
                  {[{ l: 'Mkt Cap', v: metrics.marketCap }, { l: 'Country', v: company?.country?.slice(0, 5) || '--' }, { l: 'Staff', v: metrics.employees }].map(s => (
                    <div key={s.l} className="ws-sandbox-stock-stat">
                      <span className="ws-sandbox-stock-stat-label">{s.l}</span>
                      <span className="ws-sandbox-stock-stat-value">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ws-sandbox-phone-home" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
