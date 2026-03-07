'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MeshGradient, LiquidMetal, FlutedGlass, HalftoneDots } from '@paper-design/shaders-react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import { InCallCard } from './InCallCard';
import { DockIcons } from './DockIcons';

const ANAM_API_KEY = "NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9";
const ANAM_PERSONA_ID = "6ccddf38-aed1-4bbb-9809-fc92986eb436";

const PHOTO_URL = "https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png";
const CLASP_URL = "https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJWH9TN7PGJARNM3D4GSKEJ.png";

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
    function onMouseMove(e) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function onMouseLeave() { targetX = 0; targetY = 0; }
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [ref]);
}

export function Homepage({ onSubmit, exiting = false, onGoCall, onGoWorkers }) {
  const [companyName, setCompanyName] = useState('');
  const [ready, setReady] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarConnecting, setAvatarConnecting] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [subLines, setSubLines] = useState([]);
  const [avatarEnergy, setAvatarEnergy] = useState(0);
  const [shyVisible, setShyVisible] = useState(false);
  const [ohNoVisible, setOhNoVisible] = useState(false);

  const anamClientRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const wordSeqRef = useRef(0);
  const lineSeqRef = useRef(0);
  const lastWordTimeRef = useRef(0);
  const energyRafRef = useRef(0);
  const badgeGroupRef = useRef(null);
  const shyTimerRef = useRef(null);
  const ohNoTimerRef = useRef(null);

  useCursorTracking(badgeGroupRef);

  useEffect(() => {
    // Skip intro video, show main page immediately
    setReady(true);
  }, []);

  // Energy animation
  useEffect(() => {
    if (!avatarOpen || avatarConnecting) { setAvatarEnergy(0); return; }
    let current = 0, cancelled = false;
    function tick() {
      if (cancelled) return;
      const now = Date.now();
      const timeSinceWord = now - lastWordTimeRef.current;
      const target = timeSinceWord < 600 ? 1 - (timeSinceWord / 600) * 0.5 : Math.max(0, 0.5 - (timeSinceWord - 600) / 800);
      const lerpSpeed = target > current ? 0.2 : 0.04;
      current += (target - current) * lerpSpeed;
      setAvatarEnergy(current);
      energyRafRef.current = requestAnimationFrame(tick);
    }
    energyRafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(energyRafRef.current); setAvatarEnergy(0); };
  }, [avatarOpen, avatarConnecting]);

  const handleOpenAvatar = useCallback(async () => {
    setAvatarOpen(true);
    setAvatarConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setCameraOn(true);
    } catch (err) { console.warn('Camera denied:', err); }
  }, []);

  // Start Anam session
  useEffect(() => {
    if (!avatarOpen || !avatarConnecting) return;
    let cancelled = false;
    async function startSession() {
      try {
        const client = unsafe_createClientWithApiKey(ANAM_API_KEY, { personaId: ANAM_PERSONA_ID });
        anamClientRef.current = client;
        client.addListener('VIDEO_PLAY_STARTED', () => {
          if (!cancelled) { setCallStartTime(Date.now()); setAvatarConnecting(false); }
        });
        client.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (evt) => {
          if (evt.content) {
            if (evt.role !== 'user') lastWordTimeRef.current = Date.now();
            const wid = ++wordSeqRef.current;
            const isUser = evt.role === 'user';
            setSubLines(prev => {
              const lines = prev.map(l => ({ ...l, words: [...l.words] }));
              const last = lines[lines.length - 1];
              const punctBreak = last?.words.length && /[.!?;]$/.test(last.words[last.words.length - 1].text);
              const roleSwitch = last?.words.length && last.words[last.words.length - 1].isUser !== isUser;
              const needNewLine = !last || last.words.length >= 6 || punctBreak || roleSwitch;
              if (needNewLine) {
                lines.push({ id: ++lineSeqRef.current, words: [{ text: evt.content, wid, isUser }] });
              } else {
                lines[lines.length - 1].words.push({ text: evt.content, wid, isUser });
              }
              return lines.filter(l => l.words.some(w => wid - w.wid < 16));
            });
            if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
            subtitleTimerRef.current = setTimeout(() => setSubLines([]), 6000);
          }
        });
        await client.streamToVideoElement('hp-avatar-video');
      } catch (err) {
        console.error('Anam connection failed:', err);
        if (!cancelled) setAvatarConnecting(false);
      }
    }
    const timer = setTimeout(startSession, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [avatarOpen, avatarConnecting]);

  const handleCloseAvatar = useCallback(() => {
    if (anamClientRef.current) { anamClientRef.current.stopStreaming(); anamClientRef.current = null; }
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; }
    setAvatarOpen(false); setAvatarConnecting(false); setMicMuted(false); setAvatarMuted(false); setCameraOn(false); setCallStartTime(null); setSubLines([]);
  }, []);

  const handleToggleMute = useCallback(() => {
    const client = anamClientRef.current;
    if (!client) return;
    if (micMuted) { client.unmuteInputAudio(); setMicMuted(false); }
    else { client.muteInputAudio(); setMicMuted(true); }
  }, [micMuted]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null; setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream; setCameraOn(true);
      } catch (err) { console.warn('Camera denied:', err); }
    }
  }, [cameraOn]);

  const handleToggleAvatarMute = useCallback(() => {
    const videoEl = document.getElementById('hp-avatar-video');
    if (!videoEl) return;
    const next = !avatarMuted;
    videoEl.muted = next;
    setAvatarMuted(next);
  }, [avatarMuted]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = companyName.trim();
    if (!text) return;
    if (avatarOpen && !avatarConnecting && anamClientRef.current) {
      anamClientRef.current.sendUserMessage(text);
      setCompanyName('');
    } else {
      onSubmit?.(text, anamClientRef.current, cameraStreamRef.current);
    }
  }

  const cameraAttach = useCallback(el => {
    if (el && cameraStreamRef.current) el.srcObject = cameraStreamRef.current;
  }, []);

  return (
    <div className={`hp ${ready ? 'hp--ready' : ''} ${exiting ? 'hp--exiting' : ''}`}>
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

        <div className={`hp-badge ${avatarOpen && !avatarConnecting ? 'hp-badge--video' : ''}`}>
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
            className={`hp-photo ${avatarOpen && !avatarConnecting ? 'hp-photo--video' : ''}`}
            onClick={!avatarOpen ? handleOpenAvatar : undefined}
            style={{
              backgroundImage: `radial-gradient(ellipse 51.17% 51.17% at 50% 38.76% in oklab, oklab(95.2% -0.008 0.003 / 0%) 0%, oklab(95.2% -0.008 0.003 / 0%) 64.83%, oklab(95.2% -0.008 0.003) 100%), url(${PHOTO_URL})`,
            }}
          >
            {!avatarOpen && ready && (
              <button className="hp-photo-call-btn" onClick={e => { e.stopPropagation(); handleOpenAvatar(); }} aria-label="Start call">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {avatarOpen && (
              <>
                {avatarConnecting && (
                  <div className="hp-photo-loading"><div className="hp-photo-loading-spinner" /></div>
                )}
                <video id="hp-avatar-video" autoPlay playsInline
                  className={`hp-photo-video ${!avatarConnecting ? 'hp-photo-video--active' : ''}`} />
                <div className={`hp-photo-fade ${!avatarConnecting ? 'hp-photo-fade--active' : ''}`} />
                {!avatarConnecting && (
                  <button className={`hp-avatar-mute ${avatarMuted ? 'hp-avatar-mute--on' : ''}`}
                    onClick={e => { e.stopPropagation(); handleToggleAvatarMute(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {!avatarMuted && <path d="M15.5 8.5a5 5 0 010 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
                    </svg>
                  </button>
                )}
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
                <div key={line.id} className="hp-lyrics-line"
                  style={{ filter: lineAge > 0 ? `blur(${lineAge * 10}px)` : undefined, opacity: Math.max(1 - lineAge * 0.7, 0) }}>
                  {line.words.map(w => {
                    const age = latestWid - w.wid;
                    return (
                      <span key={w.wid} className="hp-lyrics-word"
                        style={{ ...(lineAge === 0 ? { filter: `blur(${Math.min(age * 1.2, 10)}px)`, opacity: Math.max(1 - age * 0.06, 0.3) } : undefined) }}>
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
          active={avatarOpen && !avatarConnecting}
          muted={micMuted} cameraOn={cameraOn}
          onToggleMute={handleToggleMute} onToggleCamera={handleToggleCamera}
          onEndCall={handleCloseAvatar} startTime={callStartTime} cameraVideoRef={cameraAttach}
        />
      </div>

      <form className="hp-input-wrap" onSubmit={handleSubmit}>
        <input type="text" className="hp-input"
          placeholder={avatarOpen && !avatarConnecting ? 'Type a message...' : 'Enter your company name'}
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

      {ready && avatarOpen && !avatarConnecting && (
        <button className="hp-continue-btn"
          onClick={() => onSubmit?.(companyName.trim() || 'Meridian Corp.', anamClientRef.current, cameraStreamRef.current)}>
          Continue
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
          <DockIcons active="home" onHome={() => {}} onCall={onGoCall} onWorkers={onGoWorkers} />
        </div>
        <div className="hp-menubar-right">
          <button className="hp-menubar-btn">About</button>
          <div className="hp-menubar-avatar">S</div>
        </div>
      </nav>
    </div>
  );
}
