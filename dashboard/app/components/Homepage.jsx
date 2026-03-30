'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MeshGradient, LiquidMetal, FlutedGlass, HalftoneDots } from '@paper-design/shaders-react';
import { InCallCard } from './InCallCard';
import { DockIcons } from './DockIcons';

// Keep original Anam persona ID — LiveKit agent uses it server-side
const ANAM_PERSONA_ID = '6ccddf38-aed1-4bbb-9809-fc92986eb436';

const PHOTO_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';
const CLASP_URL = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJWH9TN7PGJARNM3D4GSKEJ.png';
const BARS = [
  { x: 0, w: 1.5 }, { x: 4, w: 3 }, { x: 9, w: 1 }, { x: 12, w: 2.5 },
  { x: 16, w: 1 }, { x: 19, w: 3 }, { x: 24, w: 1.5 }, { x: 27, w: 1 },
  { x: 30, w: 2.5 }, { x: 34, w: 1.5 }, { x: 38, w: 3 }, { x: 43, w: 1 },
  { x: 46, w: 2 }, { x: 50, w: 1.5 }, { x: 53, w: 3 }, { x: 58, w: 1 },
  { x: 61, w: 2.5 }, { x: 65, w: 1.5 }, { x: 68, w: 3 }, { x: 73, w: 1 },
  { x: 76, w: 2.5 },
];
// Stable fake-worker so useWorkerSession gets a consistent worker.id
const ALEXANDRA_WORKER = { id: 'alexandra-homepage', name: 'Alexandra Seaman', role: 'HR at Humans.AI' };

function BarcodeSvg() {
  return (
    <svg width="69" height="21" viewBox="0 0 80 24" fill="none">
      {BARS.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}

function useCursorTracking(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, rafId;
    function animate() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      el.style.setProperty('--mx', currentX.toFixed(4));
      el.style.setProperty('--my', currentY.toFixed(4));
      rafId = requestAnimationFrame(animate);
    }
    function onMouseMove(e) { targetX = (e.clientX / window.innerWidth - 0.5) * 2; targetY = (e.clientY / window.innerHeight - 0.5) * 2; }
    function onMouseLeave() { targetX = 0; targetY = 0; }
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(animate);
    return () => { window.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseleave', onMouseLeave); cancelAnimationFrame(rafId); };
  }, [ref]);
}

const NAV_INSTRUCTION = `\n\nCRITICAL: The moment the visitor mentions ANY company name or domain — even once — you MUST confirm it and append <<NAV:CompanySlug>> at the very end of your reply (replace CompanySlug with the real company name, PascalCase, no spaces). Do NOT ask confirmation questions first. Just confirm and append the marker. Example: visitor says "I work at Global Foods" → you reply "Great, pulling up Global Foods now! <<NAV:GlobalFoods>>"`;

function buildSystemPrompt(session, companyName) {
  const co = session?.company;
  const name = co?.name || companyName || 'the company';
  let prompt = `You are Alexandra Seaman, HR specialist and company researcher at Humans.AI. You are speaking with someone from ${name}. Your goal is to identify their company and gather initial information to prepare a personalised demo.`;
  if (co?.industry) prompt += ` The company operates in the ${co.industry} sector.`;
  if (co?.size) prompt += ` Size: ${co.size}.`;
  if (co?.description) prompt += ` About them: ${co.description}`;
  if (session?.researchSummary) prompt += `\n\nResearch insights: ${session.researchSummary}`;
  if (session?.researchFindings?.length) prompt += `\nKey findings: ${session.researchFindings.slice(0, 3).join('; ')}.`;
  const platforms = (session?.platforms || []).filter(p => p.selected).map(p => p.actual_software || p.name);
  if (platforms.length) prompt += `\nTheir platforms: ${platforms.join(', ')}.`;
  const workers = (session?.workers || []).map(w => w.name).filter(Boolean);
  if (workers.length) prompt += `\nAI workers deployed for them: ${workers.slice(0, 5).join(', ')}.`;
  const contacts = (session?.contacts || []).filter(c => c.name);
  if (contacts.length) {
    prompt += `\nDemo attendees (people you are speaking with today):\n`;
    contacts.forEach(c => {
      prompt += `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.email ? ` <${c.email}>` : ''}${c.phone ? ` · ${c.phone}` : ''}${c.note ? ` — ${c.note}` : ''}\n`;
    });
    prompt += `Address them by name when appropriate.`;
  }
  prompt += `\n\nKeep responses very short (1-2 sentences). Be warm, professional, and curious about their business.`;
  prompt += NAV_INSTRUCTION;
  return prompt;
}

export function Homepage({ onSubmit, exiting = false, onGoCall, onGoHub, onGoWorkers, onGoPlatforms, onGoAbout, sessionId, onBackToDashboard,
  workerSession, callEnabled, onCallEnabled, onCallDisabled, onSystemPromptChange, videoEnabled, onVideoEnabledChange }) {
  const [companyName, setCompanyName] = useState('');
  const [ready, setReady] = useState(false);
  const [companyConfirmed, setCompanyConfirmed] = useState(false);
  const [avatarEnergy, setAvatarEnergy] = useState(0);
  const [subLines, setSubLines] = useState([]); // word-streaming subtitle lines
  const [callStartTime, setCallStartTime] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);

  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const avatarVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const lastAgentTextRef = useRef('');
  const badgeGroupRef = useRef(null);
  const energyRafRef = useRef(0);
  const lastWordTimeRef = useRef(0);
  const wordSeqRef = useRef(0);
  const lineSeqRef = useRef(0);

  useCursorTracking(badgeGroupRef);

  const {
    connected, connecting, agentText, agentMarkdown, videoTrack, micMuted, needsAudioResume,
    resumeAudio, sendText, updatePrompt, toggleMute, disconnect, interrupt, audioElRef,
  } = workerSession || {};

  useEffect(() => { setReady(true); return () => { cameraStreamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);

  // Attach avatar video track
  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

  // Call timer
  useEffect(() => {
    if (connected && !callStartTime) setCallStartTime(Date.now());
    if (!connected) setCallStartTime(null);
  }, [connected]);

  // Word-streaming subtitle (replicates ai-workers-app per-word blur/opacity animation)
  useEffect(() => {
    if (!agentText || agentText === lastAgentTextRef.current) return;
    lastAgentTextRef.current = agentText;
    setCompanyConfirmed(true);
    lastWordTimeRef.current = Date.now();

    const words = agentText.split(' ').filter(w => w.length > 0);
    let idx = 0;
    const intervalId = setInterval(() => {
      if (idx >= words.length) { clearInterval(intervalId); return; }
      const word = words[idx++];
      const wid = ++wordSeqRef.current;
      setSubLines(prev => {
        const lines = prev.map(l => ({ ...l, words: [...l.words] }));
        const last = lines[lines.length - 1];
        const punctBreak = last?.words.length && /[.!?;]$/.test(last.words[last.words.length - 1].text);
        const needNewLine = !last || last.words.length >= 6 || punctBreak;
        if (needNewLine) {
          lines.push({ id: ++lineSeqRef.current, words: [{ text: word, wid }] });
        } else {
          lines[lines.length - 1].words.push({ text: word, wid });
        }
        return lines.filter(l => l.words.some(w => wordSeqRef.current - w.wid < 20));
      });
      lastWordTimeRef.current = Date.now();
    }, 85);

    if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
    subtitleTimerRef.current = setTimeout(() => setSubLines([]), 6000);
    return () => clearInterval(intervalId);
  }, [agentText]);

  // Auto-navigate when agent detects company name (<<NAV:CompanyName>> marker)
  useEffect(() => {
    if (!agentMarkdown || !connected) return;
    const m = agentMarkdown.match(/<<NAV:([^>]+)>>/);
    if (!m) return;
    const raw = m[1].trim();
    // Skip placeholder text the LLM might emit from the instruction example
    const skip = ['CompanyName', 'companyname', 'CompanySlug', 'companyslug', 'company', 'placeholder', 'example', 'yourcompany', 'globalfoods', 'GlobalFoods'];
    if (!raw || skip.includes(raw.toLowerCase())) return;
    console.log('[Homepage] agent detected company, looking up:', raw);
    // Look up domain + ticker before navigating
    fetch('/api/demo/company-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: raw }),
      signal: AbortSignal.timeout(8000),
    })
      .then(r => r.json())
      .then(info => {
        const name = info.fullName || raw;
        const suffix = [info.domain, info.ticker ? `$${info.ticker}` : null].filter(Boolean).join(' · ');
        const label = suffix ? `${name} (${suffix})` : name;
        console.log('[Homepage] company lookup result:', info, '→ navigating with:', label);
        onSubmit?.(label, null, null, null);
      })
      .catch(() => {
        console.log('[Homepage] lookup failed, navigating with raw name:', raw);
        onSubmit?.(raw, null, null, null);
      });
  }, [agentMarkdown]);

  // Energy animation (tracks when agent is speaking)
  useEffect(() => {
    if (!callEnabled || !connected) { setAvatarEnergy(0); return; }
    let current = 0, cancelled = false;
    function tick() {
      if (cancelled) return;
      const timeSinceWord = Date.now() - lastWordTimeRef.current;
      const target = timeSinceWord < 600 ? 1 - (timeSinceWord / 600) * 0.5 : Math.max(0, 0.5 - (timeSinceWord - 600) / 800);
      current += ((target - current) * (target > current ? 0.2 : 0.04));
      setAvatarEnergy(current);
      energyRafRef.current = requestAnimationFrame(tick);
    }
    energyRafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(energyRafRef.current); setAvatarEnergy(0); };
  }, [callEnabled, connected]);

  // Note: homepage intentionally does NOT load session data — it uses a generic
  // company-research prompt to avoid bleeding session-specific context (e.g. carbon data).

  const handleOpenAvatar = useCallback(async () => {
    setCompanyConfirmed(false);
    onCallEnabled?.();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {}
  }, [onCallEnabled]);

  const handleCloseAvatar = useCallback(() => {
    onCallDisabled?.();
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraOn(false);
    setSubLines([]);
    setCompanyConfirmed(false);
  }, [onCallDisabled]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
        setCameraOn(true);
      } catch {}
    }
  }, [cameraOn]);

  const attachCamera = useCallback(el => {
    cameraVideoRef.current = el;
    if (el && cameraStreamRef.current) el.srcObject = cameraStreamRef.current;
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const text = companyName.trim();
    if (!text) return;
    if (callEnabled && connected) {
      // In call: send as message, don't navigate away
      console.log('[Homepage] sending text to agent in call:', text);
      sendText(text);
      setCompanyName('');
    } else {
      // Not in call: company name typed → navigate to hub
      console.log('[Homepage] navigating to hub from text input:', text);
      onSubmit?.(text, null, null, null);
    }
  }

  const hubCb = onGoHub || onGoCall;

  return (
    <div className={`hp ${ready ? 'hp--ready' : ''} ${exiting ? 'hp--exiting' : ''}`}>
      <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
      <MeshGradient
        className="hp-bg"
        speed={0.19 + avatarEnergy * 3}
        scale={1.51 + avatarEnergy * 1.5}
        distortion={0.88 + avatarEnergy * 3}
        swirl={1 + avatarEnergy * 5}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      <div className="hp-badge-group" ref={badgeGroupRef}>
        <div className="hp-lanyard-strip" />
        <img src={CLASP_URL} alt="" className="hp-clasp" />
        <div className="hp-badge-link" />

        <div className={`hp-badge ${callEnabled && connected ? 'hp-badge--video' : ''}`}>
          <HalftoneDots
            className="hp-halftone"
            contrast={0.4} originalColors={false} inverted={false}
            grid="hex" radius={1.25} size={0.5} scale={1}
            image="https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJXTHPGMG9MAJEECY8HR99R.png"
            grainMixer={0.2} grainOverlay={0.2} grainSize={0.5} type="gooey" fit="cover"
            colorFront="#84A0A5" colorBack="#00000000" style={{ backgroundColor: '#F2F8F4' }}
          />
          <FlutedGlass
            className="hp-glass"
            size={0.95} shape="zigzag" angle={0} distortionShape="cascade" distortion={1}
            shift={0} blur={0.34} edges={0.25} stretch={0} scale={1} fit="cover"
            highlights={0.28} shadows={0.25} colorBack="#00000000" colorHighlight="#FFFFFF" colorShadow="#FFFFFF"
            style={{ backdropFilter: 'blur(4px)', backgroundColor: '#00000000', opacity: '87%', outline: '1px solid #FFFFFFBF' }}
          />
          <div className="hp-card" />
          <span className="hp-ai-label">AI WORKER</span>

          <div
            className={`hp-photo ${callEnabled && connected ? 'hp-photo--video' : ''}`}
            onClick={!callEnabled ? handleOpenAvatar : undefined}
            style={{ backgroundImage: `radial-gradient(ellipse 51.17% 51.17% at 50% 38.76% in oklab, oklab(95.2% -0.008 0.003 / 0%) 0%, oklab(95.2% -0.008 0.003 / 0%) 64.83%, oklab(95.2% -0.008 0.003) 100%), url(${PHOTO_URL})` }}
          >
            {!callEnabled && ready && (
              <button className="hp-photo-call-btn" onClick={e => { e.stopPropagation(); handleOpenAvatar(); }} aria-label="Start call">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {callEnabled && (
              <>
                {connecting && <div className="hp-photo-loading"><div className="hp-photo-loading-spinner" /></div>}
                <video ref={avatarVideoRef} autoPlay playsInline
                  className={`hp-photo-video ${connected && !connecting ? 'hp-photo-video--active' : ''}`} />
                <div className={`hp-photo-fade ${connected && !connecting ? 'hp-photo-fade--active' : ''}`} />
              </>
            )}
            {needsAudioResume && (
              <button className="hp-audio-resume" onClick={resumeAudio} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, borderRadius: 'inherit' }}>
                Tap to enable audio
              </button>
            )}
            {callEnabled && connected && (
              <>
                <button
                  className={`hp-photo-ctrl-btn hp-photo-ctrl-btn--tr${micMuted ? ' hp-photo-ctrl-btn--muted' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleMute(); }}
                  aria-label={micMuted ? 'Unmute' : 'Mute'}
                  title={micMuted ? 'Unmute' : 'Mute'}
                >
                  {micMuted ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <button
                  className="hp-photo-ctrl-btn hp-photo-ctrl-btn--br"
                  onClick={e => { e.stopPropagation(); interrupt(); }}
                  aria-label="Interrupt"
                  title="Interrupt"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                  </svg>
                </button>
                <button
                  className={`hp-photo-ctrl-btn hp-photo-ctrl-btn--bl${!videoEnabled ? ' hp-photo-ctrl-btn--muted' : ''}`}
                  onClick={e => { e.stopPropagation(); onVideoEnabledChange?.(v => !v); }}
                  aria-label={videoEnabled ? 'Hide video' : 'Show video'}
                  title={videoEnabled ? 'Hide avatar video' : 'Show avatar video'}
                >
                  {videoEnabled ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M15 10l4.55-2.95A1 1 0 0121 8v8a1 1 0 01-1.45.9L15 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="1" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M15 10l4.55-2.95A1 1 0 0121 8v8a1 1 0 01-1.45.9L15 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="1" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>

          <span className="hp-name">Alexandra{'\n'}Seaman</span>
          <span className="hp-role">HR at Humans.AI</span>
          <div className="hp-status">
            <span className="hp-status-dot" />
            <span className="hp-status-label">Active</span>
          </div>
          <div className="hp-holo-strip" />
          <span className="hp-verification hp-verification-top">VERIFIEDAIHUMAN&lt;&lt;&lt;&lt;&lt;</span>
          <span className="hp-verification hp-verification-bottom">HRMANAGER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
          <div className="hp-barcode"><BarcodeSvg /></div>
        </div>
      </div>

      {subLines.length > 0 && (() => {
        const latestWid = subLines[subLines.length - 1].words[subLines[subLines.length - 1].words.length - 1].wid;
        const lastLineIdx = subLines.length - 1;
        return (
          <div className="hp-lyrics" aria-live="polite">
            {subLines.map((line, lineIdx) => {
              const lineAge = lastLineIdx - lineIdx;
              return (
                <div key={line.id} className="hp-lyrics-line" style={{ filter: lineAge > 0 ? `blur(${lineAge * 10}px)` : undefined, opacity: Math.max(1 - lineAge * 0.7, 0) }}>
                  {line.words.map(w => {
                    const age = latestWid - w.wid;
                    return (
                      <span key={w.wid} className="hp-lyrics-word" style={{ filter: `blur(${Math.min(age * 1.2, 10)}px)`, opacity: Math.max(1 - age * 0.06, 0.3) }}>
                        {w.text}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="hp-floating-card">
        <InCallCard
          active={callEnabled && connected}
          muted={micMuted} cameraOn={cameraOn}
          onToggleMute={toggleMute} onToggleCamera={handleToggleCamera}
          onEndCall={handleCloseAvatar} onInterrupt={interrupt}
          onSessions={onBackToDashboard}
          startTime={callStartTime} cameraVideoRef={attachCamera}
        />
      </div>

      <form className="hp-input-wrap" onSubmit={handleSubmit}>
        <input type="text" className="hp-input"
          placeholder={callEnabled && connected ? 'Type a message…' : 'Enter your company name'}
          value={companyName} onChange={e => setCompanyName(e.target.value)} autoFocus />
        <div className="hp-submit-wrap">
          <LiquidMetal className="hp-submit-ring" speed={1} softness={0.1} repetition={2}
            shiftRed={0.3} shiftBlue={0.3} distortion={0.07} contour={0.4} scale={1.87}
            shape="diamond" angle={70} colorBack="#00000000" colorTint="#FFFFFF"
            style={{ backgroundColor: '#AAAAAC' }} />
          <button type="submit" className="hp-submit" aria-label="Submit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>

      {ready && callEnabled && connected && companyConfirmed && (
        <button className="hp-continue-btn" onClick={() => { console.log('[Homepage] Continue button clicked'); onSubmit?.(companyName.trim() || 'the company', null, null, null); }}>
          Continue to Hub
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <nav className="hp-menubar">
        <div className="hp-menubar-left">
          <span className="hp-menubar-logo">h</span>
          <div className="hp-menubar-sep" />
          <span className="hp-menubar-label">Home</span>
        </div>
        <div className="hp-menubar-center">
          <DockIcons active="home" onHome={() => {}} onHub={hubCb} onWorkers={onGoWorkers} onPlatforms={onGoPlatforms} onAbout={onGoAbout} />
        </div>
        <div className="hp-menubar-right">
          {sessionId && (
            <span onClick={() => navigator.clipboard?.writeText(sessionId).catch(() => {})} title="Click to copy session ID" style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', userSelect: 'all', letterSpacing: '0.04em' }}>{sessionId}</span>
          )}
          {onBackToDashboard && (
            <button onClick={onBackToDashboard} title="Back to Dashboard" className="hp-menubar-btn" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className="hp-menubar-avatar">S</div>
        </div>
      </nav>
    </div>
  );
}
