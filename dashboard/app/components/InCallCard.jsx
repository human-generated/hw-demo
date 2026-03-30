'use client';
import { useEffect, useState, useRef } from 'react';

const WAVEFORM_BARS = [
  { x: 0, h: 12, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 6, h: 20, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 12, h: 8, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 18, h: 24, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 24, h: 16, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 30, h: 10, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 36, h: 28, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 42, h: 14, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 48, h: 6, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 54, h: 18, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 60, h: 12, fill: "rgba(0,0,0,0.12)", active: true },
  { x: 66, h: 22, fill: "rgba(0,0,0,0.15)", active: true },
  { x: 72, h: 26, fill: "rgba(0,0,0,0.15)", active: true },
  { x: 78, h: 16, fill: "rgba(0,0,0,0.15)", active: true },
  { x: 84, h: 10, fill: "rgba(0,0,0,0.18)", active: true },
  { x: 90, h: 20, fill: "rgba(0,0,0,0.18)", active: true },
  { x: 96, h: 30, fill: "#34c759", opacity: 0.5, active: true },
  { x: 102, h: 22, fill: "#34c759", opacity: 0.45, active: true },
  { x: 108, h: 14, fill: "#34c759", opacity: 0.4, active: true },
  { x: 114, h: 26, fill: "#34c759", opacity: 0.4, active: true },
  { x: 120, h: 18, fill: "#34c759", opacity: 0.35, active: true },
  { x: 126, h: 10, fill: "rgba(0,0,0,0.08)", active: false },
  { x: 132, h: 6, fill: "rgba(0,0,0,0.06)", active: false },
  { x: 138, h: 8, fill: "rgba(0,0,0,0.06)", active: false },
  { x: 144, h: 4, fill: "rgba(0,0,0,0.05)", active: false },
  { x: 150, h: 6, fill: "rgba(0,0,0,0.05)", active: false },
  { x: 156, h: 4, fill: "rgba(0,0,0,0.04)", active: false },
  { x: 162, h: 4, fill: "rgba(0,0,0,0.04)", active: false },
  { x: 168, h: 2, fill: "rgba(0,0,0,0.03)", active: false },
  { x: 174, h: 2, fill: "rgba(0,0,0,0.03)", active: false },
  { x: 180, h: 2, fill: "rgba(0,0,0,0.02)", active: false },
];

export function InCallCard({ active = false, muted = false, cameraOn = false, onToggleMute, onToggleCamera, onEndCall, onInterrupt, onSessions, startTime, cameraVideoRef }) {
  const [elapsed, setElapsed] = useState(0);
  const [barHeights, setBarHeights] = useState(() => WAVEFORM_BARS.map(b => b.h));
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) { setBarHeights(WAVEFORM_BARS.map(b => b.h)); return; }
    if (muted) { setBarHeights(WAVEFORM_BARS.map(() => 2)); return; }

    let cancelled = false;
    async function startAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const barCount = WAVEFORM_BARS.length;
        function tick() {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const heights = WAVEFORM_BARS.map((bar, i) => {
            const binIdx = Math.floor((i / barCount) * dataArray.length);
            const val = dataArray[binIdx] / 255;
            return bar.active ? 2 + val * 28 : bar.h;
          });
          setBarHeights(heights);
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) { console.warn('Mic for waveform failed:', err); }
    }
    startAudio();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
      analyserRef.current = null;
    };
  }, [active, muted]);

  useEffect(() => {
    if (!active || !startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="in-call-card">
      {cameraOn && (
        <div className="in-call-camera-wrap">
          <video ref={cameraVideoRef} autoPlay playsInline muted className="in-call-camera-video" />
        </div>
      )}
      <div className="in-call-header">
        <div className="in-call-header-left">
          <div className="in-call-title-row">
            <span className={`in-call-dot ${active ? 'in-call-dot--active' : ''}`} />
            <span className="in-call-title">{active ? 'In Call' : 'Idle'}</span>
          </div>
          <span className="in-call-subtitle">{active ? 'Audio Conversation' : 'Click photo to start'}</span>
        </div>
      </div>
      <div className="in-call-waveform">
        <svg width="222" height="32" viewBox="0 0 222 32" fill="none">
          {WAVEFORM_BARS.map((bar, i) => {
            const h = barHeights[i] ?? bar.h;
            const y = (32 - h) / 2;
            return (
              <rect key={i} className="bar" x={bar.x} y={y} width="3" height={h}
                rx={h <= 2 ? 1 : 1.5} fill={bar.fill} opacity={bar.opacity} />
            );
          })}
        </svg>
      </div>
      <div className="in-call-footer">
        <div className="in-call-time-group">
          <span className="in-call-time">{active ? timeStr : '0:00'}</span>
          <span className="in-call-time-label">min</span>
        </div>
        <div className="in-call-actions">
          <button className={`in-call-action-btn ${muted ? 'in-call-action-btn--danger' : ''}`}
            aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} disabled={!active}>
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="6" y="2" width="4" height="7" rx="2" fill="currentColor" opacity="0.4" />
                <path d="M4 8C4 8 4 11.5 8 11.5C12 11.5 12 8 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="6" y="2" width="4" height="7" rx="2" fill="currentColor" />
                <path d="M4 8C4 8 4 11.5 8 11.5C12 11.5 12 8 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="11.5" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <button className={`in-call-action-btn ${cameraOn ? 'in-call-action-btn--on' : ''}`}
            aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'} onClick={onToggleCamera} disabled={!active}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M17 9.5L22 7V17L17 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {!cameraOn && <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
            </svg>
          </button>
          {onSessions && (
            <button className="in-call-action-btn" aria-label="Sessions" title="Sessions" onClick={onSessions}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
          {onInterrupt && (
            <button className="in-call-action-btn" title="Interrupt agent" onClick={onInterrupt} disabled={!active}
              style={{ background: 'rgba(255,149,0,0.12)', color: '#ff9500' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
          <button className="in-call-action-btn in-call-action-btn--end"
            aria-label="End call" onClick={onEndCall} disabled={!active}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
