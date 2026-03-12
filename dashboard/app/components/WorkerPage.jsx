'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MeshGradient, LiquidMetal, FlutedGlass } from '@paper-design/shaders-react';
import { useWorkerSession } from './useWorkerSession';
import { WordsStagger } from './WordsStagger';
import { DockIcons } from './DockIcons';
import { WORKER_CONFIG, WORKER_PHOTOS, DEFAULT_WORKER, WORKER_PERSONA_IDS, guessWorkerCode, getWorkerCode, getWorkerPhoto, buildConfigFromWorker } from './WorkerConfig';

const DEFAULT_PHOTO = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const WKP_TABS = ['Dashboard', 'Overview', 'Live Activity', 'Skills', 'Workflows', 'Outputs', 'Integrations', 'Human Team', 'Technical', 'Business Impact', 'Canvas'];

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const sp = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

function BarcodeSvg() {
  const bars = [
    { x: 0, w: 1.5 }, { x: 4, w: 3 }, { x: 9, w: 1 }, { x: 12, w: 2.5 }, { x: 16, w: 1 }, { x: 19, w: 3 },
    { x: 24, w: 1.5 }, { x: 27, w: 1 }, { x: 30, w: 2.5 }, { x: 34, w: 1.5 }, { x: 38, w: 3 }, { x: 43, w: 1 },
    { x: 46, w: 2 }, { x: 50, w: 1.5 }, { x: 53, w: 3 }, { x: 58, w: 1 }, { x: 61, w: 2.5 }, { x: 65, w: 1.5 },
    { x: 68, w: 3 }, { x: 73, w: 1 }, { x: 76, w: 2.5 },
  ];
  return (
    <svg width="69" height="21" viewBox="0 0 80 24" fill="none" style={{ opacity: 0.2, flexShrink: 0 }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}

function IntegrationIcon({ name }) {
  const c = 'currentColor';
  switch (name) {
    case 'SAP Ariba': case 'SAP S/4HANA': return <svg {...sp} stroke={c}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M3 9h18" /></svg>;
    case 'Microsoft 365': case 'Microsoft Teams': return <svg {...sp} stroke={c}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>;
    case 'Salesforce': return <svg {...sp} stroke={c}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
    case 'DocuSign': return <svg {...sp} stroke={c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 17l2-2 4 4" /></svg>;
    case 'Slack': return <svg {...sp} stroke={c}><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20 10h-1.5M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83 0-1.5 1.5-1.5zM4 14h1.5M10 9.5C10 8.67 10.67 8 11.5 8h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM10 4V5.5M14 14.5c0 .83-.67 1.5-1.5 1.5h-5C6.67 16 6 15.33 6 14.5S6.67 13 7.5 13h5c.83 0 1.5.67 1.5 1.5zM14 20v-1.5" /></svg>;
    case 'Jira': return <svg {...sp} stroke={c}><path d="M12 2L2 12l10 10 10-10L12 2z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'AWS S3': case 'AWS (EC2/S3/RDS)': return <svg {...sp} stroke={c}><path d="M4 7v10l8 5 8-5V7l-8-5-8 5z" /><path d="M4 7l8 5 8-5M12 12v10" /></svg>;
    case 'Google Workspace': case 'Google Analytics 4': return <svg {...sp} stroke={c}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'Notion': return <svg {...sp} stroke={c}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h5M8 15h6" /></svg>;
    case 'Snowflake': return <svg {...sp} stroke={c}><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" /></svg>;
    case 'GitHub': return <svg {...sp} stroke={c}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" /></svg>;
    case 'Figma': return <svg {...sp} stroke={c}><path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5zM12 2h3.5a3.5 3.5 0 110 7H12V2z" /><path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0zM5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5zM8.5 16H12v3.5a3.5 3.5 0 01-3.5-3.5z" /></svg>;
    case 'Datadog': return <svg {...sp} stroke={c}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
    default: return <svg {...sp} stroke={c}><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>;
  }
}

function OutputTypeIcon({ type }) {
  const c = 'currentColor';
  switch (type) {
    case 'Document': return <svg {...sp} stroke={c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case 'Email': return <svg {...sp} stroke={c}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
    case 'Report': return <svg {...sp} stroke={c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M8 18v-4M12 18v-6M16 18v-2" /></svg>;
    default: return <svg {...sp} stroke={c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>;
  }
}

function ToolIcon({ type }) {
  const tp = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#1A1A1A', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'phone': return <svg {...tp}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>;
    case 'message': return <svg {...tp}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
    case 'search': return <svg {...tp}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case 'code': return <svg {...tp}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case 'mic': return <svg {...tp}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>;
    case 'face': return <svg {...tp}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    default: return null;
  }
}

function guessToolIcon(label) {
  const l = label.toLowerCase();
  if (/phone|call|dial|outreach/.test(l)) return 'phone';
  if (/email|message|chat|slack|sms|notify/.test(l)) return 'message';
  if (/search|research|scrape|browse|web|sec|finan/.test(l)) return 'search';
  if (/code|api|sql|data|script|program|query|sandbox/.test(l)) return 'code';
  if (/voice|mic|audio|speak|record/.test(l)) return 'mic';
  if (/face|video|visual|camera/.test(l)) return 'face';
  return null;
}

function FileThumb({ type, color, bg, ext }) {
  return (
    <div className="wkp-file-thumb" style={{ background: bg }}>
      <div className="wkp-file-icon">
        {type === 'doc' && (
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path d="M0 4C0 1.79 1.79 0 4 0H20L32 12V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#fff" />
            <path d="M20 0L32 12H24C21.79 12 20 10.21 20 8V0Z" fill={color} opacity="0.2" />
            <rect x="6" y="18" width="14" height="2" rx="1" fill={color} opacity="0.6" />
            <rect x="6" y="23" width="20" height="2" rx="1" fill={color} opacity="0.35" />
            <rect x="6" y="28" width="17" height="2" rx="1" fill={color} opacity="0.35" />
            <rect x="6" y="33" width="10" height="2" rx="1" fill={color} opacity="0.2" />
          </svg>
        )}
        {type === 'mic' && (
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path d="M0 4C0 1.79 1.79 0 4 0H20L32 12V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#fff" />
            <path d="M20 0L32 12H24C21.79 12 20 10.21 20 8V0Z" fill={color} opacity="0.2" />
            <rect x="5" y="22" width="2" height="8" rx="1" fill={color} opacity="0.4" />
            <rect x="9" y="19" width="2" height="14" rx="1" fill={color} opacity="0.6" />
            <rect x="13" y="21" width="2" height="10" rx="1" fill={color} opacity="0.5" />
            <rect x="17" y="17" width="2" height="16" rx="1" fill={color} opacity="0.7" />
            <rect x="21" y="20" width="2" height="12" rx="1" fill={color} opacity="0.45" />
            <rect x="25" y="23" width="2" height="6" rx="1" fill={color} opacity="0.3" />
          </svg>
        )}
        {type === 'transcript' && (
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path d="M0 4C0 1.79 1.79 0 4 0H20L32 12V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#fff" />
            <path d="M20 0L32 12H24C21.79 12 20 10.21 20 8V0Z" fill={color} opacity="0.2" />
            <rect x="6" y="17" width="20" height="1.5" rx="0.75" fill={color} opacity="0.3" />
            <rect x="6" y="21" width="16" height="1.5" rx="0.75" fill={color} opacity="0.3" />
            <rect x="6" y="25" width="20" height="1.5" rx="0.75" fill={color} opacity="0.3" />
            <rect x="6" y="29" width="12" height="1.5" rx="0.75" fill={color} opacity="0.3" />
            <rect x="6" y="33" width="18" height="1.5" rx="0.75" fill={color} opacity="0.2" />
          </svg>
        )}
        {type === 'email' && (
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path d="M0 4C0 1.79 1.79 0 4 0H20L32 12V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#fff" />
            <path d="M20 0L32 12H24C21.79 12 20 10.21 20 8V0Z" fill={color} opacity="0.2" />
            <rect x="5" y="18" width="22" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
            <path d="M5 20L16 27L27 20" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
        )}
        {(type === 'media' || (!['doc','mic','transcript','email'].includes(type))) && (
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path d="M0 4C0 1.79 1.79 0 4 0H20L32 12V36C32 38.21 30.21 40 28 40H4C1.79 40 0 38.21 0 36V4Z" fill="#fff" />
            <path d="M20 0L32 12H24C21.79 12 20 10.21 20 8V0Z" fill={color} opacity="0.2" />
            <rect x="6" y="18" width="14" height="2" rx="1" fill={color} opacity="0.5" />
            <rect x="6" y="23" width="20" height="2" rx="1" fill={color} opacity="0.3" />
            <rect x="6" y="28" width="12" height="2" rx="1" fill={color} opacity="0.3" />
          </svg>
        )}
      </div>
      <span className="wkp-file-ext" style={{ background: color }}>{ext}</span>
    </div>
  );
}

const STATIC_OUTPUTS = [
  { label: 'Q3 Report', ext: 'PDF', color: '#DC4B4B', bg: '#FEF2F2', icon: 'doc' },
  { label: 'Voice recording', ext: 'WAV', color: '#16A34A', bg: '#F0FDF4', icon: 'mic' },
  { label: 'Call transcript', ext: 'TXT', color: '#6B7B8D', bg: '#F1F5F9', icon: 'transcript' },
  { label: 'Email draft', ext: 'EML', color: '#9333EA', bg: '#FAF5FF', icon: 'email' },
];

function StepDiagramIcon({ status, label }) {
  const color = (status === 'done' || status === 'active') ? '#fff' : 'rgba(26,26,26,0.25)';
  const tp = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: status === 'active' ? '#2DB563' : color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (label) {
    case 'Search': return <svg {...tp}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case 'Extract': return <svg {...tp}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case 'Compile': return <svg {...tp}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case 'Report': return <svg {...tp}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    default: return <svg {...tp}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg>;
  }
}

/* ─── Reusable sub-components ───────────────────────────────────────────────── */
function SkillBar({ label, value }) {
  return (
    <div className="wkpt-skill">
      <div className="wkpt-skill-head"><span className="wkpt-skill-label">{label}</span><span className="wkpt-skill-val">{value}%</span></div>
      <div className="wkpt-skill-track"><div className="wkpt-skill-fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}
function KV({ k, v, mono }) {
  return <div className="wkpt-kv"><span className="wkpt-kv-k">{k}</span><span className={`wkpt-kv-v${mono ? ' wkpt-kv-v--mono' : ''}`}>{v}</span></div>;
}
function Stat({ value, label, sub, accent }) {
  return (
    <div className="wkpt-stat">
      <span className="wkpt-stat-val" style={accent ? { color: accent } : undefined}>{value}</span>
      <span className="wkpt-stat-label">{label}</span>
      {sub && <span className="wkpt-stat-sub">{sub}</span>}
    </div>
  );
}
function Card({ title, badge, badgeColor, sub, children, className }) {
  return (
    <div className={`wkpt-card ${className || ''}`}>
      <div className="wkpt-card-head">
        <span className="wkpt-card-title">{title}</span>
        {badge && <span className="wkpt-badge" style={badgeColor ? { background: `${badgeColor}15`, color: badgeColor } : undefined}>{badge}</span>}
        {sub && <span className="wkpt-card-sub">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
function TiltCard({ children, className }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const rafRef = useRef(0);
  const handleMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      setStyle({ transform: `perspective(600px) rotateX(${(0.5-y)*20}deg) rotateY(${(x-0.5)*20}deg) scale3d(1.04,1.04,1.04)`, transition: 'transform 0.1s ease-out', boxShadow: `${(x-0.5)*-20}px ${(y-0.5)*-20}px 40px rgba(0,0,0,0.12)` });
    });
  }, []);
  const handleLeave = useCallback(() => { cancelAnimationFrame(rafRef.current); setStyle({ transform: 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)', transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)', boxShadow: 'none' }); }, []);
  return <div ref={ref} className={className} style={style} onMouseMove={handleMove} onMouseLeave={handleLeave}>{children}</div>;
}

/* ─── Tab Components (all data-driven) ──────────────────────────────────────── */

function PlatformPreviewCard({ platform, sessionId, companyName }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const slug = (companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
  const displayUrl = `${slug}.humans.ai/${platform.name.toLowerCase()}`;
  const proxyUrl = sessionId && platform.id
    ? `/api/demo/platform-proxy/${sessionId}/${platform.id}/`
    : platform.url;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  async function sendChat(e) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const sandboxId = platform.sandboxId || platform.id;
      const r = await fetch(`/api/demo/platforms/${sandboxId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const d = await r.json();
      setChatHistory(h => [...h, { role: 'assistant', content: d.reply || d.message || '…' }]);
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Error connecting to platform.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="wkp-browser wkp-platform-card">
      {/* Toolbar */}
      <div className="wkp-browser-toolbar wkp-platform-toolbar">
        <div className="wkp-browser-dots">
          <span className="wkp-dot wkp-dot--red" /><span className="wkp-dot wkp-dot--yellow" /><span className="wkp-dot wkp-dot--green" />
        </div>
        <div className="wkp-browser-nav">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="wkp-browser-url wkp-platform-url">{displayUrl}</div>
        <div className="wkp-platform-actions">
          <button className={`wkp-platform-action-btn${chatOpen ? ' wkp-platform-action-btn--active' : ''}`} onClick={() => setChatOpen(o => !o)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Chat
          </button>
          <a href={platform.url} target="_blank" rel="noopener noreferrer" className="wkp-platform-action-btn">
            Open ↗
          </a>
        </div>
      </div>

      {/* Live status strip */}
      <div className="wkp-platform-strip">
        <span className="wkp-platform-dot" />
        <span className="wkp-platform-strip-name">{platform.name}</span>
        <span className="wkp-platform-strip-status">Live</span>
      </div>

      {/* iframe preview */}
      <div className="wkp-platform-frame">
        <iframe
          src={proxyUrl}
          title={platform.name}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="wkp-platform-iframe"
        />
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="wkp-platform-chat">
          <div className="wkp-platform-chat-msgs">
            {chatHistory.length === 0 && (
              <div className="wkp-platform-chat-empty">Ask anything about this platform…</div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`wkp-platform-chat-msg wkp-platform-chat-msg--${m.role}`}>{m.content}</div>
            ))}
            {chatLoading && <div className="wkp-platform-chat-msg wkp-platform-chat-msg--assistant wkp-platform-chat-loading">…</div>}
            <div ref={chatEndRef} />
          </div>
          <form className="wkp-platform-chat-form" onSubmit={sendChat}>
            <input
              className="wkp-platform-chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask the platform…"
              autoFocus
            />
            <button type="submit" className="wkp-platform-chat-send" disabled={chatLoading}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function DashboardTab({ cfg, firstName, companyName, platforms, sessionId }) {
  const d = cfg.dashboard;
  return (
    <div className="wkp-center">
      <div className="wkp-status-banner">
        <div className="wkp-status-dot-live" />
        <span className="wkp-status-text">{cfg.banner}</span>
        <span className="wkp-status-time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="wkp-metrics-row">
        <TiltCard className="wkp-metric-card wkp-metric-card--job">
          <WordsStagger className="wkp-metric-label" delay={0.3} stagger={0.05} speed={0.35}>Job</WordsStagger>
          <WordsStagger className="wkp-metric-desc" delay={0.5} stagger={0.04} speed={0.4}>{cfg.job}</WordsStagger>
        </TiltCard>
        <div className="wkp-metric-card">
          <WordsStagger className="wkp-metric-label" delay={0.4} stagger={0.05} speed={0.35}>ROI</WordsStagger>
          <WordsStagger className="wkp-metric-big" delay={0.6} stagger={0.08} speed={0.5}>{d.roi}</WordsStagger>
        </div>
        <div className="wkp-metric-card">
          <WordsStagger className="wkp-metric-label" delay={0.5} stagger={0.05} speed={0.35}>h / day</WordsStagger>
          <WordsStagger className="wkp-metric-big" delay={0.7} stagger={0.08} speed={0.5}>{d.hoursPerDay}</WordsStagger>
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={0.6} stagger={0.05} speed={0.35}>Tools</WordsStagger>
        <div className="wkp-tools-wrap">
          {d.tools.map(t => {
            const icon = guessToolIcon(t);
            return (
              <div key={t} className="wkp-tool-pill">
                {icon && <ToolIcon type={icon} />}
                <span>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={0.8} stagger={0.05} speed={0.35}>{firstName}'s office</WordsStagger>
        <div className="wkp-office-row">
          {platforms && platforms.length > 0 ? (
            platforms.map(p => (
              <PlatformPreviewCard key={p.id} platform={p} sessionId={sessionId} companyName={companyName} />
            ))
          ) : (
            <>
              <div className="wkp-browser">
                <div className="wkp-browser-toolbar">
                  <div className="wkp-browser-dots">
                    <span className="wkp-dot wkp-dot--red" /><span className="wkp-dot wkp-dot--yellow" /><span className="wkp-dot wkp-dot--green" />
                  </div>
                  <div className="wkp-browser-nav">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="wkp-browser-url">{d.office}</div>
                </div>
                <div className="wkp-browser-page">
                  <div className="wkp-browser-nav-row">
                    <span className="wkp-browser-site">{d.siteName}</span>
                    <div className="wkp-browser-links"><span>Dashboard</span><span>Reports</span><span>Settings</span></div>
                  </div>
                  <div className="wkp-browser-content">
                    <span className="wkp-browser-title">{d.browserTitle}</span>
                    <span className="wkp-browser-sub">{d.browserSub}</span>
                  </div>
                  <div className="wkp-browser-metrics">
                    {d.browserMetrics.map(m => (
                      <div key={m.label} className={`wkp-browser-metric${m === d.browserMetrics[0] ? ' wkp-browser-metric--hl' : ''}`}>
                        <span className="wkp-browser-metric-label">{m.label}</span>
                        <span className={`wkp-browser-metric-value${m.value.includes('%') || m.value.includes('↑') ? ' wkp-green' : ''}`}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="wkp-phone">
                <div className="wkp-phone-notch" />
                <div className="wkp-phone-screen">
                  <div className="wkp-phone-status"><span className="wkp-phone-time">9:41</span></div>
                  <div className="wkp-phone-stock-name">{d.siteName || companyName}</div>
                  <div className="wkp-phone-price-row">
                    <span className="wkp-phone-price">$68.42</span>
                    <span className="wkp-phone-change">+2.4%</span>
                  </div>
                  <svg width="100%" height="24" viewBox="0 0 90 24" fill="none" preserveAspectRatio="none">
                    <path d="M0 20 Q10 18 20 16 T40 12 T60 8 T80 5 T90 3" stroke="#34C759" strokeWidth="1.5" fill="none" />
                    <path d="M0 20 Q10 18 20 16 T40 12 T60 8 T80 5 T90 3 L90 24 L0 24 Z" fill="#34C759" style={{ opacity: 0.08 }} />
                  </svg>
                  <div className="wkp-phone-buttons">
                    <div className="wkp-phone-btn wkp-phone-btn--buy">Buy</div>
                    <div className="wkp-phone-btn wkp-phone-btn--sell">Sell</div>
                  </div>
                  <div className="wkp-phone-stats">
                    <div className="wkp-phone-stat"><span className="wkp-phone-stat-label">Mkt Cap</span><span className="wkp-phone-stat-val">$24.1B</span></div>
                    <div className="wkp-phone-stat"><span className="wkp-phone-stat-label">P/E</span><span className="wkp-phone-stat-val">28.4x</span></div>
                    <div className="wkp-phone-stat"><span className="wkp-phone-stat-label">Vol</span><span className="wkp-phone-stat-val">3.2M</span></div>
                  </div>
                </div>
                <div className="wkp-phone-home" />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={0.9} stagger={0.05} speed={0.35}>Outputs</WordsStagger>
        <div className="wkp-outputs-row">
          {STATIC_OUTPUTS.map(o => (
            <div key={o.label} className="wkp-output">
              <FileThumb type={o.icon} color={o.color} bg={o.bg} ext={o.ext} />
              <span className="wkp-output-label">{o.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={1.0} stagger={0.05} speed={0.35}>Recent Activity</WordsStagger>
        <div className="wkp-activity-list">
          {d.activity.map((a, i) => (
            <div key={i} className="wkp-activity-item">
              <span className="wkp-activity-dot" style={{ background: a.color }} />
              <span className="wkp-activity-text">{a.text}</span>
              <span className="wkp-activity-time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
      {cfg.dashboard.sandboxes && cfg.dashboard.sandboxes.length > 0 && (
        <div className="wkp-section">
          <WordsStagger className="wkp-section-label" delay={1.2} stagger={0.05} speed={0.35}>Sandboxes</WordsStagger>
          <div className="wkpt-card">
            <div className="wkpt-card-head" />
            <div className="wkpt-sandbox-grid">
              {cfg.dashboard.sandboxes.map((sb, i) => (
                <div key={i} className="wkpt-sandbox-item">
                  <div className="wkpt-sandbox-header">
                    <span className="wkpt-sandbox-name">{sb.name}</span>
                    <span className={`wkpt-sandbox-status${sb.status === 'running' ? ' wkpt-sandbox-status--running' : sb.status === 'idle' ? ' wkpt-sandbox-status--idle' : ''}`}>{sb.status}</span>
                  </div>
                  <div className="wkpt-sandbox-meta">
                    <span>{sb.type}</span>
                    <span>·</span>
                    <span>{sb.region}</span>
                    {sb.cost && <><span>·</span><span>{sb.cost}/hr</span></>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ cfg }) {
  const d = cfg.overview;
  return (
    <div className="wkpt-page">
      <div className="wkpt-stats-row">
        <Stat value={d.stats.tasksCompleted} label="Tasks Completed" sub={d.statSubs.tasks} accent="#1a1a1a" />
        <Stat value={d.stats.uptime} label="Uptime" sub={d.statSubs.uptime} accent="#34c759" />
        <Stat value={d.stats.escalationRate} label="Escalation Rate" sub={d.statSubs.escalation} />
        <Stat value={d.stats.dailyActive} label="Daily Active" sub={d.statSubs.daily} />
      </div>
      <div className="wkpt-grid-2">
        <Card title="Identity & Deployment" badge="Production">
          <div className="wkpt-kv-list">
            <KV k="Worker ID" v={d.identity.workerId} mono />
            <KV k="Role" v={d.identity.role} />
            <KV k="Department" v={d.identity.department} />
            <KV k="Region" v={d.identity.region} />
            <KV k="Deployed" v={d.identity.deployed} mono />
            <KV k="Last Updated" v={new Date().toISOString().slice(0,16).replace('T',' ') + ' UTC'} mono />
            <KV k="Version" v={d.identity.version} mono />
            <KV k="Environment" v="Production" />
          </div>
        </Card>
        <Card title="Personality & Style">
          <div className="wkpt-kv-list">
            <KV k="Communication" v={d.personality.communication} />
            <KV k="Formality" v={d.personality.formality} />
            <KV k="Response Length" v={d.personality.responseLength} />
            <KV k="Proactivity" v={d.personality.proactivity} />
            <KV k="Languages" v={d.personality.languages} />
            <KV k="Humor" v={d.personality.humor} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function LiveActivityTab({ cfg, sessionId, activeGuiTask, onRunGuiAgent }) {
  const d = cfg.liveActivity;
  const [desktop, setDesktop] = useState(null);
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!activeGuiTask) return;
    setDesktop(activeGuiTask);
  }, [activeGuiTask]);

  async function handleRun() {
    if (!task.trim() || running) return;
    setRunning(true);
    await onRunGuiAgent?.(task.trim());
    setTask('');
    setRunning(false);
  }

  return (
    <div className="wkpt-page">
      <div className="wkpt-live-banner">
        <div className="wkpt-live-pulse" />
        <div className="wkpt-live-info">
          <span className="wkpt-live-task">{desktop ? `GUI Agent: ${desktop.task}` : d.currentTask}</span>
          <span className="wkpt-live-meta">{desktop ? `Desktop :${desktop.display} · port ${desktop.novncPort}` : d.currentMeta}</span>
        </div>
        <span className="wkpt-live-badge">LIVE</span>
      </div>

      <div style={{ marginBottom: '12px', background: '#fff', border: '1px solid #e5e5ea', borderRadius: '12px', padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun(); }}
          placeholder="Give the vision agent a task… e.g. Search OTP to MUC flights on 2026-03-09"
          rows={2}
          style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: '13px', color: '#1a1a1a', background: 'transparent', fontFamily: 'inherit', lineHeight: '1.5' }}
        />
        <button onClick={handleRun} disabled={!task.trim() || running} style={{ background: task.trim() && !running ? '#1a1a1a' : '#e5e5ea', color: task.trim() && !running ? '#fff' : '#aaa', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: task.trim() && !running ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}>
          {running ? 'Starting…' : 'Run'}
        </button>
      </div>

      {desktop && (
        <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e5ea', background: '#111', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '8px', left: '10px', right: '10px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34c759', display: 'inline-block' }} />
              XFCE Desktop · Vision Agent
            </div>
            <a href={desktop.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 10px', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open in new tab
            </a>
          </div>
          <div style={{ width: '100%', height: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#666' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', marginBottom: '4px' }}>Desktop running on port {desktop.novncPort}</div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>Browser blocks HTTP frames on HTTPS pages</div>
              <a href={desktop.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1a1a1a', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open Desktop
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="wkpt-grid-2">
        <Card title="Activity Feed" sub="Today — cost &amp; tokens per event">
          <div className="wkpt-feed">
            {d.feed.map((e, i) => (
              <div key={i} className="wkpt-feed-item">
                <span className="wkpt-feed-time">{e.time}</span>
                <span className="wkpt-feed-dot" style={{ background: e.color }} />
                <span className="wkpt-feed-text">{e.event}</span>
                {(e.cost || e.tokens) && (
                  <span className="wkpt-feed-costs">
                    {e.cost && <span className="wkpt-feed-cost">{e.cost}</span>}
                    {e.tokens && <span className="wkpt-feed-tokens">{e.tokens}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
        <div className="wkpt-stack">
          <Card title="Session Stats" sub="Today">
            <div className="wkpt-kv-list">
              <KV k="Tasks Completed" v={String(d.sessionStats.tasksCompleted)} />
              <KV k="Documents Processed" v={String(d.sessionStats.documentsProcessed)} />
              <KV k="Emails Drafted" v={String(d.sessionStats.emailsDrafted)} />
              <KV k="Escalations" v={String(d.sessionStats.escalations)} />
              <KV k="Tokens Used" v={d.sessionStats.tokensUsed} mono />
              <KV k="Avg Response" v={d.sessionStats.avgResponse} mono />
            </div>
          </Card>
          <Card title="Scheduled">
            <div className="wkpt-feed">
              {d.scheduled.map((e, i) => (
                <div key={i} className="wkpt-feed-item">
                  <span className="wkpt-feed-time">{e.time}</span>
                  <span className="wkpt-feed-dot" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.15)' }} />
                  <span className="wkpt-feed-text">{e.event}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const SKILL_CATEGORY_COLORS = { Data: '#3b82f6', Research: '#8b5cf6', Communication: '#f59e0b', Creative: '#ec4899', AI: '#34c759' };
const SKILL_ICONS = {
  db: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  sms: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  telegram: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  brain: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12h8M12 8v8"/></svg>,
  desktop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

function SkillsTab({ cfg, sessionId, workerId, onRunGuiAgent }) {
  const [skills, setSkills] = useState(null);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (!sessionId || !workerId) return;
    fetch(`/api/demo/skills?sessionId=${sessionId}&workerId=${workerId}`)
      .then(r => r.json())
      .then(d => { setSkills(d.skills || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId, workerId]);

  async function handleRun() {
    if (!task.trim() || running) return;
    setRunning(true);
    const isGui = selectedSkill && (selectedSkill.id === 'gui_agent' || selectedSkill.icon === 'eye' || selectedSkill.icon === 'desktop');
    if (isGui) {
      await onRunGuiAgent?.(task.trim());
    } else {
      await fetch('/api/demo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: task.trim(), workerId }),
      });
    }
    setTask('');
    setRunning(false);
  }

  const guardrails = cfg.skills?.guardrails || [];

  if (loading) return (
    <div className="wkpt-page">
      <div style={{ padding: '32px', color: '#aaa', fontSize: '13px' }}>Loading skills…</div>
      {guardrails.length > 0 && (
        <Card title="Guardrails" badge="Enforced" badgeColor="#ef4444">
          <div className="wkpt-guardrails">
            {guardrails.map((g, i) => (
              <div key={i} className="wkpt-guardrail">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
  if (!skills || skills.length === 0) return (
    <div className="wkpt-page">
      <div style={{ padding: '32px 0 16px', color: '#aaa', fontSize: '13px' }}>No skills available. Grant data access or API keys in the Integrations tab.</div>
      {guardrails.length > 0 && (
        <Card title="Guardrails" badge="Enforced" badgeColor="#ef4444">
          <div className="wkpt-guardrails">
            {guardrails.map((g, i) => (
              <div key={i} className="wkpt-guardrail">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const byCategory = skills.reduce((acc, s) => { (acc[s.category] = acc[s.category] || []).push(s); return acc; }, {});

  return (
    <div className="wkpt-page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Object.entries(byCategory).map(([cat, catSkills]) => (
          <div key={cat} className="wkpt-card">
            <div className="wkpt-card-head">
              <span style={{ fontSize: '10px', fontWeight: 700, color: SKILL_CATEGORY_COLORS[cat] || '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {catSkills.map(sk => (
                <div key={sk.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f4f4f4' }}>
                    <span style={{ color: SKILL_CATEGORY_COLORS[cat] || '#888', marginTop: '2px', flexShrink: 0 }}>{SKILL_ICONS[sk.icon] || SKILL_ICONS.brain}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '2px' }}>{sk.label}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>{sk.description}</div>
                      {sk.samples && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {sk.samples.map((s, i) => (
                            <button key={i} onClick={() => { setTask(s); setSelectedSkill(sk); }} style={{ fontSize: '11px', color: SKILL_CATEGORY_COLORS[cat] || '#555', background: `${SKILL_CATEGORY_COLORS[cat]}10` || '#f5f5f5', border: `1px solid ${SKILL_CATEGORY_COLORS[cat]}30`, borderRadius: '20px', padding: '2px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '14px', background: '#fff', border: '1px solid #e5e5ea', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedSkill && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: SKILL_CATEGORY_COLORS[selectedSkill.category] || '#888' }}>
            <span>{SKILL_ICONS[selectedSkill.icon] || SKILL_ICONS.brain}</span>
            <span style={{ fontWeight: 600 }}>{selectedSkill.label}</span>
            <button onClick={() => setSelectedSkill(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '14px', lineHeight: 1 }}>×</button>
          </div>
        )}
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun(); }}
          placeholder="Describe what you want the agent to do… click a sample above or type freely"
          rows={3}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: '13px', color: '#1a1a1a', background: 'transparent', fontFamily: 'inherit', lineHeight: '1.5' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleRun} disabled={!task.trim() || running} style={{ background: task.trim() && !running ? '#1a1a1a' : '#e5e5ea', color: task.trim() && !running ? '#fff' : '#aaa', border: 'none', borderRadius: '8px', padding: '8px 20px', cursor: task.trim() && !running ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' }}>
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>
      {guardrails.length > 0 && (
        <Card title="Guardrails" badge="Enforced" badgeColor="#ef4444">
          <div className="wkpt-guardrails">
            {guardrails.map((g, i) => (
              <div key={i} className="wkpt-guardrail">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function WorkflowChat({ wf, sessionId, workerId, workerName, onWorkerUpdate }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMsgs(h => [...h, { role: 'user', text }]);
    setLoading(true);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const d = await r.json();
      setMsgs(h => [...h, { role: 'assistant', text: d.message || '…' }]);
      if (d.worker) onWorkerUpdate?.(d.worker);
    } catch {
      setMsgs(h => [...h, { role: 'assistant', text: 'Could not reach agent.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="wkpt-wf-chat">
      <div className="wkpt-wf-chat-msgs">
        {msgs.length === 0 && <div className="wkpt-wf-chat-empty">Ask {workerName} to modify this workflow…</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`wkpt-wf-chat-msg wkpt-wf-chat-msg--${m.role}`}>{m.text}</div>
        ))}
        {loading && <div className="wkpt-wf-chat-msg wkpt-wf-chat-msg--assistant wkpt-wf-chat-typing">…</div>}
        <div ref={endRef} />
      </div>
      <form className="wkpt-wf-chat-form" onSubmit={send}>
        <input className="wkpt-wf-chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask ${workerName}…`} autoComplete="off" />
        <button type="submit" className="wkpt-wf-chat-send" disabled={loading}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  );
}

function WorkflowsTab({ cfg, sessionId, workerId, workerName, defaultExpandedId = null, onWorkflowSelect = null, channels = {}, onChannelsChange = null, onWorkerUpdate = null }) {
  const wfList = cfg.workflows?.list || [];
  const escalation = cfg.workflows?.escalation || [];
  const [expanded, setExpanded] = useState(() => {
    if (defaultExpandedId) {
      const idx = wfList.findIndex(wf => wf.id === defaultExpandedId);
      return idx >= 0 ? idx : null;
    }
    return null;
  });
  const [activeRun, setActiveRun] = useState(null); // { wfIndex, mode }
  const [runResults, setRunResults] = useState({});  // wfIndex → runData
  const [visibleSteps, setVisibleSteps] = useState({}); // wfIndex → count
  const intRef = useRef(null);

  async function startRun(wf, i, mode) {
    if (activeRun) return;
    setActiveRun({ wfIndex: i, mode });
    setRunResults(prev => ({ ...prev, [i]: null }));
    setVisibleSteps(prev => ({ ...prev, [i]: 0 }));
    const PREDEFINED = /^(HRMANAGER|SALESREP0|LEGALADV0|FINANALYS|RESEARCHER|ENGINEER0|MARKETING|DESIGNER0)$/;
    try {
      let d;
      if (workerId && !PREDEFINED.test(workerId)) {
        // Real session worker — call actual run-steps endpoint
        const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/run-steps`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, mode, workflowId: wf.id, channels }),
        });
        d = await r.json();
        if (d.error) throw new Error(d.error);
      } else {
        // Hub worker — call orchestrate and synthesize result
        await fetch('/api/demo/orchestrate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${mode === 'hard' ? 'Execute' : 'Simulate'} workflow: ${wf.name}`,
            sessionId: sessionId || 'worker-session',
            context: `${mode === 'hard' ? 'HARD RUN' : 'SOFT RUN (read-only)'}: "${wf.name}" (${wf.trigger}). Steps: ${(wf.steps || []).map(s => s.label).join(' → ')}.`,
          }),
        });
        d = {
          mode,
          steps: (wf.steps || []).map((s, j) => ({
            id: `step-${j}`, name: s.label, skill: 'ai-task', status: 'ok',
            durationMs: 700 + j * 350 + Math.floor(Math.random() * 300),
            tokens: Math.floor(600 + Math.random() * 1400),
            costUsd: 0.0015 + Math.random() * 0.009,
          })),
          totalDurationMs: (wf.steps || []).length * 1100 + Math.floor(Math.random() * 800),
        };
      }
      setRunResults(prev => ({ ...prev, [i]: d }));
      let n = 0;
      clearInterval(intRef.current);
      intRef.current = setInterval(() => {
        n++;
        setVisibleSteps(prev => ({ ...prev, [i]: n }));
        if (n >= (d.steps || []).length) clearInterval(intRef.current);
      }, 600);
    } catch (e) {
      setRunResults(prev => ({ ...prev, [i]: { error: e.message, steps: [] } }));
    }
    setActiveRun(null);
  }

  // Pick first "active" workflow or first workflow for the top card
  const activeWf = wfList.find(wf => wf.status === 'active') || wfList[0];
  const activeSteps = activeWf ? (activeWf.steps || []).map((s, i) => ({
    ...s,
    status: i === 0 ? 'done' : i === 1 ? 'done' : i === 2 ? 'active' : 'pending',
  })) : [];

  return (
    <div className="wkpt-page">
      <Card title="All Workflows" sub={`${wfList.length} automated workflows`} className="wkpt-card--full">
        {wfList.map((wf, i) => (
          <div key={wf.id || i} className={`wkpt-wf-row${expanded === i ? ' wkpt-wf-row--open' : ''}`}>
            <div className="wkpt-wf-row-head" onClick={() => { const next = expanded === i ? null : i; setExpanded(next); if (next !== null && wfList[next] && onWorkflowSelect) onWorkflowSelect(wfList[next].id); }}>
              <div className="wkpt-wf-row-left">
                <span className={`wkpt-wf-status-dot wkpt-wf-status-dot--${wf.status}`} />
                <div className="wkpt-wf-row-info">
                  <span className="wkpt-wf-row-name">{wf.name}</span>
                  <span className="wkpt-wf-row-trigger">{wf.trigger} · last: {wf.lastRun}</span>
                </div>
              </div>
              <div className="wkpt-wf-row-meta">
                <span className="wkpt-wf-row-cost">{wf.cost}/run</span>
                <span className="wkpt-wf-row-runs">{wf.runs} runs</span>
                <span className={`wkpt-badge${wf.status === 'active' ? '' : ' wkpt-badge--idle'}`}>{wf.status}</span>
                <span className="wkpt-wf-chevron">{expanded === i ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === i && (
              <div className="wkpt-wf-row-body">
                <div className="wkpt-wf-steps">
                  {(wf.steps || []).map((s, j) => (
                    <div key={j} className={`wkpt-wf-step wkpt-wf-step--${s.status}`}>
                      <div className="wkpt-wf-node">
                        {s.status === 'done' && <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        {s.status === 'active' && <div className="wkpt-wf-pulse" />}
                      </div>
                      {j < wf.steps.length - 1 && <div className="wkpt-wf-line" />}
                      <span className="wkpt-wf-label">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="wkpt-wf-row-foot">
                  <span>Avg duration: {wf.avgDuration}</span>
                  <span>Cost per run: {wf.cost}</span>
                </div>

                {/* ── Soft / Hard Run Panel ── */}
                <div className="wkpt-wf-run-area">
                  <div className="wkpt-wf-channels">
                    <span className="wkpt-wf-channels-label">Channels</span>
                    <div className="wkpt-wf-channel-field">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                      <input placeholder="email" type="email" value={channels.email || ''} onChange={e => { const c = {...channels, email: e.target.value}; if(typeof onChannelsChange==='function') onChannelsChange(c); }} />
                    </div>
                    <div className="wkpt-wf-channel-field">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <input placeholder="phone" type="tel" value={channels.phone || ''} onChange={e => { const c = {...channels, phone: e.target.value}; if(typeof onChannelsChange==='function') onChannelsChange(c); }} />
                    </div>
                    <div className="wkpt-wf-channel-field">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .164 4.205l3.99 1.266 1.27 3.975a2.25 2.25 0 0 0 4.163.067L21.8 5.55a2.25 2.25 0 0 0-2.602-3.117z"/></svg>
                      <input placeholder="telegram ID" type="text" value={channels.telegram || ''} onChange={e => { const c = {...channels, telegram: e.target.value}; if(typeof onChannelsChange==='function') onChannelsChange(c); }} />
                    </div>
                  </div>
                  <div className="wkpt-wf-run-header">
                    <span className="wkpt-wf-run-desc">
                      {runResults[i]
                        ? (runResults[i].mode === 'soft' ? '🔍 Soft run · read-only' : '⚡ Hard run · live execution')
                        : 'Soft = preview only · Hard = real actions'}
                    </span>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      {runResults[i] && !activeRun && (
                        <button className="wkpt-run-reset" onClick={() => { setRunResults(prev => ({ ...prev, [i]: null })); setVisibleSteps(prev => ({ ...prev, [i]: 0 })); }}>Reset</button>
                      )}
                      <button className="wkpt-wf-soft-btn" onClick={() => startRun(wf, i, 'soft')} disabled={!!activeRun}>
                        {activeRun?.wfIndex === i && activeRun?.mode === 'soft' ? '⟳ Running…' : '🔍 Soft Run'}
                      </button>
                      <button className="wkpt-wf-hard-btn" onClick={() => startRun(wf, i, 'hard')} disabled={!!activeRun}>
                        {activeRun?.wfIndex === i && activeRun?.mode === 'hard' ? '⟳ Running…' : '⚡ Hard Run'}
                      </button>
                    </div>
                  </div>

                  {runResults[i]?.error && (
                    <div className="wkpt-run-error">✗ {runResults[i].error}</div>
                  )}

                  {runResults[i] && (runResults[i].steps || []).map((sr, j) => (
                    <div key={sr.id || j} className={`wkpt-run-step${j < (visibleSteps[i] || 0) ? ' wkpt-run-step--visible' : ''}`}>
                      <div className="wkpt-run-step-header">
                        <span className={`wkpt-run-step-status wkpt-run-step-status--${j < (visibleSteps[i] || 0) ? (sr.status || 'ok') : 'pending'}`}>
                          {j < (visibleSteps[i] || 0) ? (sr.status === 'error' ? '✗' : '✓') : '○'}
                        </span>
                        <span className="wkpt-run-step-name">{sr.name}</span>
                        {j < (visibleSteps[i] || 0) && sr.durationMs && <span className="wkpt-run-step-dur">{sr.durationMs < 1000 ? sr.durationMs + 'ms' : (sr.durationMs / 1000).toFixed(1) + 's'}</span>}
                        {j < (visibleSteps[i] || 0) && sr.tokens > 0 && <span className="wkpt-run-step-tokens">{sr.tokens.toLocaleString()}t</span>}
                      </div>
                    </div>
                  ))}

                  {runResults[i] && (visibleSteps[i] || 0) >= (runResults[i].steps || []).length && (runResults[i].steps || []).length > 0 && (() => {
                    const rd = runResults[i];
                    const isSoft = rd.mode === 'soft';
                    const totalTokens = (rd.steps || []).reduce((s, r) => s + (r.tokens || 0), 0);
                    const totalCost = (rd.steps || []).reduce((s, r) => s + (r.costUsd || 0), 0);
                    return (
                      <div className={`wkpt-run-summary${isSoft ? ' wkpt-run-summary--soft' : ' wkpt-run-summary--hard'}`}>
                        <span>{isSoft ? '🔍 Soft Run complete' : '⚡ Hard Run complete'}</span>
                        {totalTokens > 0 && <span className="wkpt-run-summary-tokens">🔤 {totalTokens.toLocaleString()} tokens</span>}
                        {totalCost > 0 && <span className="wkpt-run-summary-cost">💰 ${totalCost.toFixed(4)}</span>}
                        {rd.totalDurationMs && <span className="wkpt-run-summary-time">⏱ {(rd.totalDurationMs / 1000).toFixed(1)}s total</span>}
                      </div>
                    );
                  })()}
                </div>
              <WorkflowChat wf={wf} sessionId={sessionId} workerId={workerId} workerName={workerName || 'Agent'} onWorkerUpdate={onWorkerUpdate} />
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

function OutputsTab({ cfg }) {
  const d = cfg.outputs;
  const total = d.breakdown.documents + d.breakdown.reports + d.breakdown.emails + d.breakdown.other;
  const pcts = { documents: Math.round(d.breakdown.documents/total*100), reports: Math.round(d.breakdown.reports/total*100), emails: Math.round(d.breakdown.emails/total*100), other: Math.round(d.breakdown.other/total*100) };
  const circumference = 2 * Math.PI * 50;
  let offset = 0;
  const slices = [
    { key: 'documents', color: '#1a1a1a', pct: pcts.documents },
    { key: 'reports', color: '#34c759', pct: pcts.reports },
    { key: 'emails', color: '#f59e0b', pct: pcts.emails },
    { key: 'other', color: '#8e8e93', pct: pcts.other },
  ];
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Recent Outputs" sub={`Last ${d.recent.length}`}>
          <div className="wkpt-output-list">
            {d.recent.map((o, i) => (
              <div key={i} className="wkpt-output-item">
                <span className="wkpt-output-icon"><OutputTypeIcon type={o.type} /></span>
                <div className="wkpt-output-info"><span className="wkpt-output-name">{o.name}</span><span className="wkpt-output-time">{o.type} · {o.time}</span></div>
                <span className={`wkpt-output-score${o.score >= 95 ? ' wkpt-output-score--high' : ''}`}>{o.score}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="wkpt-stack">
          <Card title="Output Breakdown">
            <div className="wkpt-donut-wrap">
              <svg viewBox="0 0 120 120" className="wkpt-donut">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="14" />
                {slices.map(s => {
                  const dash = (s.pct / 100) * circumference;
                  const el = <circle key={s.key} cx="60" cy="60" r="50" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                  offset += dash;
                  return el;
                })}
              </svg>
              <div className="wkpt-donut-legend">
                {slices.map(s => <div key={s.key} className="wkpt-legend-item"><span className="wkpt-legend-dot" style={{ background: s.color }} />{s.key.charAt(0).toUpperCase()+s.key.slice(1)} <b>{s.pct}%</b></div>)}
              </div>
            </div>
          </Card>
          <Card title="Quality Stats">
            <div className="wkpt-kv-list">
              <KV k="Avg Quality Score" v={d.qualityStats.avgScore} />
              <KV k="Rated Outputs" v={d.qualityStats.rated} />
              <KV k="Perfect Scores" v={d.qualityStats.perfect} />
              <KV k="Rework Rate" v={d.qualityStats.reworkRate} />
              <KV k="Avg Time to Output" v={d.qualityStats.avgTime} mono />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const DB_OPS = ['read', 'write', 'delete'];
const DB_OP_LABELS = { read: 'Read', write: 'Write', delete: 'Delete' };
const DB_OP_COLORS = { read: '#34c759', write: '#f59e0b', delete: '#ff3b30' };

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ background: on ? '#34c759' : '#e5e5ea', border: 'none', borderRadius: '999px', width: '36px', height: '20px', cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
    </button>
  );
}

function IntegrationsTab({ sessionId, workerId, workerPermissions, onPermissionsChange, channels = {}, onChannelsChange }) {
  const [data, setData] = useState(null);
  const [perms, setPerms] = useState(workerPermissions || { sandboxes: {}, keys: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/demo/sessions/${sessionId}/integrations`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (!workerPermissions) {
          // Default: all deployed sandboxes get read+write+delete; all keys enabled
          const defaultSandboxes = {};
          (d.sandboxes || []).filter(s => s.status === 'deployed').forEach(s => { defaultSandboxes[s.id] = ['read', 'write', 'delete']; });
          setPerms({ sandboxes: defaultSandboxes, keys: (d.keys || []).map(k => k.id) });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  async function save(newPerms) {
    setPerms(newPerms);
    setSaving(true);
    try {
      await fetch(`/api/demo/workers/${workerId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, permissions: newPerms }),
      });
      onPermissionsChange?.(newPerms);
    } finally { setSaving(false); }
  }

  function toggleOp(sbId, op) {
    const cur = (perms.sandboxes || {})[sbId] || [];
    const next = cur.includes(op) ? cur.filter(x => x !== op) : [...cur, op];
    const newSandboxes = { ...perms.sandboxes, [sbId]: next };
    save({ ...perms, sandboxes: newSandboxes });
  }

  function toggleKey(keyId) {
    const cur = perms.keys || [];
    const next = cur.includes(keyId) ? cur.filter(x => x !== keyId) : [...cur, keyId];
    save({ ...perms, keys: next });
  }

  if (!data) return <div className="wkpt-page" style={{ padding: '2rem', color: '#999' }}>Loading integrations…</div>;

  const statusColor = s => s === 'deployed' ? '#34c759' : s === 'error' ? '#ff3b30' : '#8e8e93';
  const sbPerms = perms.sandboxes || {};

  function setChannel(key, val) {
    onChannelsChange?.({ ...channels, [key]: val });
  }

  return (
    <div className="wkpt-page">
      <Card title="Communication Channels" sub="Used when running flows">
        <div className="wkpt-channel-list">
          <div className="wkpt-channel">
            <span className="wkpt-channel-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" /></svg>
            </span>
            <span className="wkpt-channel-label">Email</span>
            <input className="wkpt-channel-input" type="email" placeholder="contact@company.com" value={channels.email || ''} onChange={e => setChannel('email', e.target.value)} />
          </div>
          <div className="wkpt-channel">
            <span className="wkpt-channel-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </span>
            <span className="wkpt-channel-label">Phone</span>
            <input className="wkpt-channel-input" type="tel" placeholder="+1 555 000 0000" value={channels.phone || ''} onChange={e => setChannel('phone', e.target.value)} />
          </div>
          <div className="wkpt-channel">
            <span className="wkpt-channel-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .164 4.205l3.99 1.266 1.27 3.975a2.25 2.25 0 0 0 4.163.067L21.8 5.55a2.25 2.25 0 0 0-2.602-3.117z" /></svg>
            </span>
            <span className="wkpt-channel-label">Telegram</span>
            <input className="wkpt-channel-input" type="text" placeholder="@channel or chat ID" value={channels.telegram || ''} onChange={e => setChannel('telegram', e.target.value)} />
          </div>
        </div>
      </Card>
      <div style={{ marginTop: '12px' }}>
        <Card title="Data Access — Platforms" sub="Read / Write / Delete per sandbox">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.sandboxes.length === 0 && <span style={{ color: '#999', fontSize: '12px' }}>No platforms deployed yet</span>}
            {data.sandboxes.map(sb => {
              const ops = sbPerms[sb.id] || [];
              const anyOn = ops.length > 0;
              return (
                <div key={sb.id} style={{ background: anyOn ? '#f9f9f9' : '#f2f2f2', borderRadius: '10px', padding: '10px 12px', opacity: sb.status === 'error' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="wkpt-integration-icon"><IntegrationIcon name={sb.name} /></span>
                    <div style={{ flex: 1 }}>
                      <span className="wkpt-integration-name">{sb.name}</span>
                      {sb.url && <span style={{ display: 'block', fontSize: '10px', color: '#999' }}>{sb.url}</span>}
                    </div>
                    <span style={{ fontSize: '10px', color: statusColor(sb.status), fontWeight: 600 }}>{sb.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', paddingLeft: '28px' }}>
                    {DB_OPS.map(op => (
                      <label key={op} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: sb.status === 'error' ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 500, color: sb.status === 'error' ? '#ccc' : ops.includes(op) ? DB_OP_COLORS[op] : '#aaa' }}>
                        <input type="checkbox" checked={ops.includes(op)} disabled={sb.status === 'error'} onChange={() => toggleOp(sb.id, op)}
                          style={{ accentColor: DB_OP_COLORS[op], width: '13px', height: '13px', cursor: sb.status === 'error' ? 'not-allowed' : 'pointer' }} />
                        {DB_OP_LABELS[op]}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div style={{ marginTop: '12px' }}>
        <Card title="Data Access — API Keys" sub={`${(perms.keys || []).length} of ${data.keys.length} enabled`}>
          <div className="wkpt-integrations">
            {data.keys.map(k => {
              const on = (perms.keys || []).includes(k.id);
              return (
                <div key={k.id} className="wkpt-integration" style={{ opacity: on ? 1 : 0.45 }}>
                  <span className="wkpt-integration-icon"><IntegrationIcon name={k.label} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="wkpt-integration-name">{k.label}</span>
                    <span style={{ display: 'block', fontSize: '10px', color: k.hasValue ? '#34c759' : '#ff3b30' }}>{k.hasValue ? 'Configured' : 'Not set'}</span>
                  </div>
                  <Toggle on={on} onClick={() => toggleKey(k.id)} />
                </div>
              );
            })}
          </div>
          {saving && <span style={{ fontSize: '11px', color: '#999', marginTop: '8px', display: 'block' }}>Saving…</span>}
        </Card>
      </div>
      <div style={{ marginTop: '12px' }}>
        <Card title="Effective Capabilities" sub="Injected into worker prompt at call time">
          <div className="wkpt-perms">
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">Platform access</span>
              {Object.keys(sbPerms).length === 0 && <div className="wkpt-perm-item" style={{ color: '#ff3b30' }}><span>No platforms enabled</span></div>}
              {Object.entries(sbPerms).map(([id, ops]) => {
                if (!ops.length) return null;
                const sb = data.sandboxes.find(s => s.id === id);
                return sb ? <div key={id} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{sb.name}: {ops.join(', ')}{sb.url ? ` · ${sb.url}` : ''}</span></div> : null;
              })}
            </div>
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">API keys</span>
              {(perms.keys || []).length === 0 && <div className="wkpt-perm-item" style={{ color: '#ff3b30' }}><span>No keys enabled</span></div>}
              {(perms.keys || []).map(id => {
                const k = data.keys.find(x => x.id === id);
                return k ? <div key={id} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 5l3 3-3 3" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{k.label}</span></div> : null;
              })}
            </div>
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">Channels</span>
              {!channels.email && !channels.phone && !channels.telegram && <div className="wkpt-perm-item" style={{ color: '#ff3b30' }}><span>No channels configured</span></div>}
              {channels.email && <div className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg><span>Email: {channels.email}</span></div>}
              {channels.phone && <div className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>Phone: {channels.phone}</span></div>}
              {channels.telegram && <div className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .164 4.205l3.99 1.266 1.27 3.975a2.25 2.25 0 0 0 4.163.067L21.8 5.55a2.25 2.25 0 0 0-2.602-3.117z"/></svg><span>Telegram: {channels.telegram}</span></div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HumanTeamTab({ cfg }) {
  const d = cfg.humanTeam;
  const peers = d.peers || [];
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Team Members" sub={`${peers.length} AI workers in network`}>
          <div className="wkpt-team-list">
            {peers.map((p, i) => (
              <div key={i} className="wkpt-team-item">
                <div className="wkpt-team-avatar">{(p.name || 'AI').split(/[\s\n]/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="wkpt-team-info"><span className="wkpt-team-name">{p.name}</span><span className="wkpt-team-role">{p.role}</span></div>
                <div className="wkpt-team-right"><span className="wkpt-team-relation">{p.relation}</span><span className="wkpt-team-sat">{p.satisfaction ? `★ ${p.satisfaction}` : p.freq}</span></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Collaboration Stats">
          <div className="wkpt-collab">
            <div className="wkpt-collab-bars">
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Autonomous</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill" style={{ width: `${d.autonomousPct}%` }} /><span>{d.autonomousPct}%</span></div></div>
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Escalated</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill wkpt-collab-fill--yellow" style={{ width: `${d.escalatedPct}%` }} /><span>{d.escalatedPct}%</span></div></div>
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Override</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill wkpt-collab-fill--red" style={{ width: `${d.overridePct}%` }} /><span>{d.overridePct}%</span></div></div>
            </div>
            <div className="wkpt-kv-list" style={{ marginTop: 20 }}>
              <KV k="Team Satisfaction" v={d.stats.satisfaction} />
              <KV k="Response Quality" v={d.stats.quality} />
              <KV k="Avg Escalation Time" v={d.stats.escalationTime} mono />
              <KV k="Weekly Interactions" v={d.stats.weeklyInteractions} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TechnicalTab({ cfg }) {
  const d = cfg.technical;
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-3">
        <Card title="Model Configuration">
          <div className="wkpt-kv-list">
            <KV k="Base Model" v={d.model.baseModel} />
            <KV k="Context Window" v={d.model.contextWindow} mono />
            <KV k="Memory" v={d.model.memory} />
            <KV k="Modalities" v={d.model.modalities} />
            <KV k="Access Level" v={d.model.accessLevel} />
            <KV k="Environment" v={d.model.environment} />
            <KV k="Data Residency" v={d.model.dataResidency} />
            <KV k="Encryption" v={d.model.encryption} mono />
          </div>
        </Card>
        <Card title="SLA & Performance">
          <div className="wkpt-kv-list">
            <KV k="Uptime Target" v={d.sla.uptimeTarget} />
            <KV k="Uptime Actual" v={d.sla.uptimeActual} />
            <KV k="Response p50" v={d.sla.p50} mono />
            <KV k="Response p95" v={d.sla.p95} mono />
            <KV k="Error Rate" v={d.sla.errorRate} />
            <KV k="Token Cost / Day" v={d.sla.costPerDay} mono />
            <KV k="Token Cost / Task" v={d.sla.costPerTask} mono />
            <KV k="Monthly Budget" v={d.sla.monthlyBudget} />
          </div>
        </Card>
        <Card title="Version History">
          <div className="wkpt-versions">
            {d.versions.map((v, i) => (
              <div key={i} className="wkpt-version">
                <div className="wkpt-version-head"><span className="wkpt-version-tag">{v.ver}</span><span className="wkpt-version-date">{v.date}</span></div>
                <span className="wkpt-version-notes">{v.notes}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BusinessImpactTab({ cfg, onPutInProduction }) {
  const d = cfg.businessImpact;
  return (
    <div className="wkpt-page">
      <div className="wkpt-stats-row wkpt-stats-row--3">
        <Stat value={d.hoursSaved} label="Hours Saved" sub="Since deployment" accent="#1a1a1a" />
        <Stat value={d.costSavings} label="Cost Savings" sub="Labor cost equivalent" accent="#34c759" />
        <Stat value={d.roi} label="ROI" sub="Return on investment" accent="#1a1a1a" />
      </div>
      <div className="wkpt-grid-2">
        <Card title="Performance vs Targets">
          <div className="wkpt-perf-list">
            {d.performance.map((p, i) => (
              <div key={i} className="wkpt-perf-row">
                <span className="wkpt-perf-metric">{p.metric}</span>
                <div className="wkpt-perf-bar-wrap">
                  <div className="wkpt-perf-target" style={{ left: `${p.target}%` }} />
                  <div className={`wkpt-perf-fill${p.actual >= p.target ? ' wkpt-perf-fill--pass' : ' wkpt-perf-fill--fail'}`} style={{ width: `${Math.min(p.actual, 100)}%` }} />
                </div>
                <span className="wkpt-perf-val">{p.actual}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Client Deployments" sub={`${d.deployments.length} active`}>
          <div className="wkpt-deploy-list">
            {d.deployments.map((dep, i) => (
              <div key={i} className="wkpt-deploy-item">
                <div className="wkpt-deploy-info"><span className="wkpt-deploy-client">{dep.client}</span><span className="wkpt-deploy-type">{dep.type} · Since {dep.since}</span></div>
                <span className={`wkpt-deploy-status${dep.status === 'Pilot' ? ' wkpt-deploy-status--pilot' : ''}`}>{dep.status}</span>
              </div>
            ))}
          </div>
          <button className="wkpt-production-btn" onClick={onPutInProduction}>
            Put it in production
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ─── Canvas Tab ─────────────────────────────────────────────────────────────── */
function CanvasTab({ sessionId, workerId }) {
  const [cards, setCards] = useState([]);
  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 1 });
  const [flipped, setFlipped] = useState({});
  const [jsonEdits, setJsonEdits] = useState({});
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);
  const [orchInput, setOrchInput] = useState('');
  const [orchLoading, setOrchLoading] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [zooming, setZooming] = useState(false);
  const canvasRef = useRef(null);
  const draggingRef = useRef(null);
  const panningRef = useRef(null);
  const transformRef = useRef(transform);
  const zoomTimerRef = useRef(null);
  transformRef.current = transform;

  const CARD_W = 340, CARD_H = 280;

  useEffect(() => { loadArtifacts().then(fitView); }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource('/api/demo/events/stream');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'artifact:created' && (!ev.data?.sessionId || ev.data.sessionId === sessionId)) loadArtifacts();
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  async function loadArtifacts() {
    let raw = [];
    try {
      if (sessionId) {
        const r = await fetch(`/api/demo/artifacts/${sessionId}`);
        if (r.ok) { const d = await r.json(); raw = d.artifacts || []; }
      }
    } catch {}
    const results = raw.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setCards(prev => {
      const pos = {};
      prev.forEach(c => { pos[c.id] = { x: c.x, y: c.y }; });
      return results.map((a, i) => {
        const p = pos[a.id || a.name];
        const col = i % 3, row = Math.floor(i / 3);
        return { id: a.id || a.name || `card-${i}`, type: a.type || 'text', title: a.title || a.name || 'Artifact', content: a.content, imageUrl: a.imageUrl, url: a.url, imagePrompt: a.imagePrompt, resource: a.resource, createdAt: a.createdAt, docUrl: a.docUrl, driveUrl: a.driveUrl, note: a.note, json: JSON.stringify(a, null, 2), x: p ? p.x : 60 + col * (CARD_W + 24), y: p ? p.y : 60 + row * (CARD_H + 24) };
      });
    });
  }

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZooming(true);
      setTransform(t => {
        const ns = Math.max(0.15, Math.min(3, t.scale * delta));
        return { x: mx - (mx - t.x) * (ns / t.scale), y: my - (my - t.y) * (ns / t.scale), scale: ns };
      });
      // Remove GPU layer hint after zoom stops so browser re-rasterizes text at new scale
      clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => setZooming(false), 120);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = draggingRef.current;
      if (d) {
        const dx = (e.clientX - d.startMX) / transformRef.current.scale;
        const dy = (e.clientY - d.startMY) / transformRef.current.scale;
        setCards(prev => prev.map(c => c.id === d.id ? { ...c, x: d.origX + dx, y: d.origY + dy } : c));
      }
      const p = panningRef.current;
      if (p) {
        setTransform(t => ({ ...t, x: p.origTX + e.clientX - p.startMX, y: p.origTY + e.clientY - p.startMY }));
      }
    };
    const onUp = () => { draggingRef.current = null; panningRef.current = null; setDragging(null); setPanning(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  function startCardDrag(e, id) {
    e.stopPropagation(); e.preventDefault();
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const d = { id, startMX: e.clientX, startMY: e.clientY, origX: card.x, origY: card.y };
    draggingRef.current = d; setDragging(d);
  }

  function startPan(e) {
    if (e.button !== 0) return;
    if (e.target !== canvasRef.current) return;
    const p = { startMX: e.clientX, startMY: e.clientY, origTX: transform.x, origTY: transform.y };
    panningRef.current = p; setPanning(p);
  }

  function toggleFlip(id) { setFlipped(f => ({ ...f, [id]: !f[id] })); }

  function fitView() {
    // Called after cards load — zoom/pan so all cards are visible
    const el = canvasRef.current;
    if (!el) return;
    setCards(prev => {
      if (!prev.length) return prev;
      const vw = el.clientWidth || 800, vh = el.clientHeight || 600;
      const PAD = 40;
      const maxX = Math.max(...prev.map(c => c.x + CARD_W));
      const maxY = Math.max(...prev.map(c => c.y + CARD_H));
      const scaleX = (vw - PAD * 2) / maxX;
      const scaleY = (vh - PAD * 2) / maxY;
      const scale = Math.min(1, Math.max(0.15, Math.min(scaleX, scaleY)));
      setTransform({ x: PAD, y: PAD, scale });
      return prev;
    });
  }

  function autoArrange() {
    const cols = Math.max(1, Math.ceil(Math.sqrt(cards.length)));
    setArranging(true);
    setCards(prev => prev.map((c, i) => ({ ...c, x: 60 + (i % cols) * (CARD_W + 24), y: 60 + Math.floor(i / cols) * (CARD_H + 24) })));
    setTimeout(() => { setArranging(false); fitView(); }, 520);
  }

  function addBlankCard() {
    const id = `manual-${Date.now()}`;
    const json = JSON.stringify({ type: 'html', title: 'New Card', content: '<div style="padding:20px;font-family:sans-serif"><h2>Hello 👋</h2><p>Edit the JSON on the back to change this card.</p></div>' }, null, 2);
    const t = transformRef.current;
    setCards(prev => [...prev, { id, type: 'html', title: 'New Card', content: '<div style="padding:20px;font-family:sans-serif"><h2>Hello 👋</h2><p>Edit the JSON on the back to change this card.</p></div>', json, x: -t.x / t.scale + 40, y: -t.y / t.scale + 40 }]);
  }

  function applyJson(id) {
    const raw = jsonEdits[id]; if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setCards(prev => prev.map(c => c.id === id ? { ...c, ...data, id, x: c.x, y: c.y, json: raw } : c));
      setJsonEdits(j => { const n = { ...j }; delete n[id]; return n; });
    } catch {}
  }

  function removeCard(id) { setCards(prev => prev.filter(c => c.id !== id)); }

  async function runSkillAgent() {
    if (!orchInput.trim() || orchLoading) return;
    const task = orchInput.trim(); setOrchInput(''); setOrchLoading(true);
    try {
      await fetch('/api/demo/skill-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, task, workerId }) });
    } catch {}
    setOrchLoading(false);
    // Always reload after response — SSE may have raced or sessionId may differ
    loadArtifacts();
  }

  function renderPreview(card) {
    const s = { width: '100%', height: '100%', border: 'none', display: 'block' };
    const { type, content, imageUrl, url, imagePrompt, name, docUrl, driveUrl, resource, rationale } = card;

    // Images
    if (type === 'image') return <img src={imageUrl || url} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.03)' }} onError={e => { e.target.style.display='none'; }} />;

    // Videos
    if (type === 'video') return <video src={url || content} controls style={s} />;

    // Google Docs / Drive files → open in iframe or link card
    if (type === 'google_doc' || type === 'drive_file') {
      const link = docUrl || driveUrl || url;
      const embedUrl = link && link.includes('docs.google.com') ? link.replace('/edit', '/preview').replace('/pub', '/preview') : link;
      return embedUrl
        ? <iframe src={embedUrl} style={s} title={card.title} allow="autoplay" />
        : <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '28px' }}>📄</span>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{card.title}</span>
            <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)' }}>{type}</span>
          </div>;
    }

    // Doc/drive drafts (creation failed — show info)
    if (type === 'doc_draft' || type === 'drive_draft' || type === 'email_draft') {
      const note = card.note || '';
      return <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>{type === 'email_draft' ? '✉️' : '📋'}</span>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{card.title}</span>
        {note && <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>{note}</span>}
        {content && <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: 'rgba(0,0,0,0.5)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{content.slice(0, 400)}</div>}
      </div>;
    }

    // HTML srcDoc
    if (type === 'html') return <iframe srcDoc={content} sandbox="allow-scripts" style={s} title={card.title} />;

    // Webpage / document iframes
    if (type === 'webpage' || type === 'document') return <iframe src={url || content} style={s} title={card.title} />;

    // NFS uploads — detect by extension
    if (type === 'upload' && name) {
      const ext = name.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <img src={`/api/nfs?path=uploads/${name}`} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
      if (['mp4','webm','ogg'].includes(ext)) return <video src={`/api/nfs?path=uploads/${name}`} controls style={s} />;
      if (['pdf','html','htm'].includes(ext)) return <iframe src={`/api/nfs?path=uploads/${name}`} style={s} />;
    }

    // Text / code / skill_output / orchestration / db_query
    const text = content || imagePrompt || '(empty)';
    return <div style={{ padding: '14px 16px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', lineHeight: 1.6, color: 'rgba(0,0,0,0.65)', overflowY: 'auto', height: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text.slice(0, 1200)}{text.length > 1200 ? '…' : ''}</div>;
  }

  // Derive unique types from loaded cards
  const allTypes = [...new Set(cards.map(c => c.type))].sort();
  const visibleCards = cards.filter(c => !hiddenTypes.has(c.type));

  function toggleType(t) {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  const TYPE_ICONS = { image: '🖼', video: '🎬', html: '🌐', webpage: '🌐', google_doc: '📄', drive_file: '📁', email: '✉️', skill_output: '⚡', orchestration: '🔀', db_query: '🗄', upload: '📎', document: '📄', code: '💻' };

  return (
    <div className="cv-root">
      <div className="cv-toolbar">
        <div className="cv-toolbar-actions">
          <button className="cv-btn" onClick={autoArrange}>Auto-arrange</button>
          <button className="cv-btn" onClick={() => loadArtifacts().then(fitView)}>Refresh</button>
          <button className="cv-btn cv-btn--primary" onClick={addBlankCard}>+ Card</button>
        </div>
        {allTypes.length > 0 && (
          <div className="cv-type-filters">
            {allTypes.map(t => {
              const checked = !hiddenTypes.has(t);
              const count = cards.filter(c => c.type === t).length;
              return (
                <label key={t} className={`cv-filter-chip${checked ? ' cv-filter-chip--on' : ''}`} onClick={() => toggleType(t)}>
                  <span className="cv-filter-check">
                    <svg className="cv-filter-tick" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>{TYPE_ICONS[t] || '◈'} {t}</span>
                  <span className="cv-filter-count">{count}</span>
                </label>
              );
            })}
          </div>
        )}
        <div className="cv-orch-bar">
          <input className="cv-orch-input" placeholder="Ask skill agent to generate an artifact…" value={orchInput} onChange={e => setOrchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSkillAgent(); } }} />
          <button className={`cv-btn cv-btn--send${orchLoading ? ' cv-btn--loading' : ''}`} onClick={runSkillAgent} disabled={orchLoading}>
            {orchLoading ? <span className="cv-spinner" /> : '↑'}
          </button>
        </div>
      </div>
      <div ref={canvasRef} className="cv-canvas" onMouseDown={startPan}>
        {visibleCards.length === 0 && (
          <div className="cv-empty">
            <div className="cv-empty-icon">◈</div>
            <div>No artifacts yet</div>
            <div className="cv-empty-sub">Ask the skill agent or click + Card to add manually</div>
          </div>
        )}
        <div className={`cv-canvas-inner${zooming ? ' cv-canvas-inner--zooming' : ''}`} style={{ transform: `translate3d(${transform.x}px,${transform.y}px,0) scale(${transform.scale})` }}>
          {visibleCards.map(card => {
            const isFlipped = !!flipped[card.id];
            return (
              <div key={card.id} className={`cv-card-wrap${arranging ? ' cv-card-wrap--arranging' : ''}`} style={{ left: card.x, top: card.y, width: CARD_W, height: CARD_H }}>
                <div className={`cv-card${isFlipped ? ' cv-card--flipped' : ''}`}>
                  <div className="cv-card-face cv-card-front">
                    <div className="cv-card-header" onMouseDown={e => startCardDrag(e, card.id)}>
                      <span className="cv-card-type-badge">{card.type}</span>
                      <span className="cv-card-title-text">{card.title}</span>
                      <div className="cv-card-actions">
                        <button className="cv-card-btn" onClick={() => toggleFlip(card.id)} title="Edit JSON">{ '{ }' }</button>
                        <button className="cv-card-btn" onClick={() => removeCard(card.id)} title="Remove">×</button>
                      </div>
                    </div>
                    <div className="cv-card-body" onClick={() => toggleFlip(card.id)}>
                      {renderPreview(card)}
                    </div>
                  </div>
                  <div className="cv-card-face cv-card-back">
                    <div className="cv-card-header" onMouseDown={e => startCardDrag(e, card.id)}>
                      <span className="cv-card-type-badge">json</span>
                      <span className="cv-card-title-text">Edit card</span>
                      <div className="cv-card-actions">
                        <button className="cv-card-btn cv-card-btn--apply" onClick={() => { applyJson(card.id); toggleFlip(card.id); }} title="Apply">✓ Apply</button>
                        <button className="cv-card-btn" onClick={() => toggleFlip(card.id)} title="Cancel">×</button>
                      </div>
                    </div>
                    <textarea className="cv-card-json" value={jsonEdits[card.id] !== undefined ? jsonEdits[card.id] : card.json} onChange={e => setJsonEdits(prev => ({ ...prev, [card.id]: e.target.value }))} spellCheck={false} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Main WorkerPage component ──────────────────────────────────────────────── */
export function WorkerPage({ worker: workerProp = null, anamClient = null, cameraStream = null, avatarStream = null, onBack, onGoHome, onGoWorkers, sessionId, companyName = 'Humans.AI', allWorkers = [], defaultExpandedWorkflow = null, onWorkflowSelect = null, platforms = [], onWorkerUpdate = null, onBackToDashboard }) {
  // Support both hub workers ({ code, name, role }) and session workers ({ id, name, description, workflows, steps })
  const worker = workerProp || DEFAULT_WORKER;
  const workerIndex = allWorkers.length > 0 ? Math.max(0, allWorkers.findIndex(w => w.id === worker.id)) : 0;
  const workerCode = worker.code || getWorkerCode(worker, allWorkers);
  const workerId = worker.id || workerCode; // actual session worker id or predefined code
  const cfg = buildConfigFromWorker(worker, companyName, allWorkers, workerIndex);
  const photoUrl = WORKER_PHOTOS[workerCode] || DEFAULT_PHOTO;
  const firstName = (worker.name || 'Worker').split(/[\n\s]/)[0];
  const authorName = firstName.toUpperCase();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [cameraOn, setCameraOn] = useState(!!cameraStream);
  const [callStartTime, setCallStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerPermissions, setWorkerPermissions] = useState(worker.permissions || null);
  const [workerChannels, setWorkerChannels] = useState({ email: '', phone: '', telegram: '' });
  const [activeGuiTask, setActiveGuiTask] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callEnabled, setCallEnabled] = useState(false);
  const [promptEditing, setPromptEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');

  // Build system prompt for this worker
  const systemPrompt = useMemo(() => {
    const workerTitle = (worker.name || cfg.job || 'AI Worker').replace(/\n/g, ' ').trim();
    const workerDesc = (worker.description || worker.role || cfg.overview || '').slice(0, 300);
    const co = companyName && companyName !== 'Humans.AI' ? ` at ${companyName}` : '';
    return `You are an AI worker named "${workerTitle}"${co}. ${workerDesc} Be professional and concise.`;
  }, [worker.id, companyName]);

  // LiveKit session hook (replaces direct Anam SDK)
  const {
    connected: lkConnected,
    connecting: lkConnecting,
    agentText,
    videoTrack,
    micMuted,
    needsAudioResume,
    resumeAudio,
    sendText: lkSendText,
    updatePrompt,
    toggleMute: lkToggleMute,
    disconnect: lkDisconnect,
    callTool,
    audioElRef,
  } = useWorkerSession({ worker, sessionId, enabled: callEnabled, audioEnabled, videoEnabled, systemPrompt, personaId: WORKER_PERSONA_IDS[workerCode] });

  const isConnected = lkConnected;
  const isConnecting = lkConnecting;

  const cameraStreamRef = useRef(cameraStream);
  const cameraVideoRef = useRef(null);
  const avatarVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const msgSeqRef = useRef(1);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Attach video track from agent (Anam avatar) to video element
  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack]);

  // Show agent text as subtitle + add to chat
  useEffect(() => {
    if (!agentText) return;
    setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: authorName, text: agentText, time: 'Just now', isUser: false }]);
    // Show as subtitle
    setSubtitleText(agentText.split(' ').slice(0, 8).join(' '));
    if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
    subtitleTimerRef.current = setTimeout(() => setSubtitleText(''), 4000);
  }, [agentText]);

  // Start call timer when connected
  useEffect(() => {
    if (isConnected && !callStartTime) setCallStartTime(Date.now());
    if (!isConnected) setCallStartTime(null);
  }, [isConnected]);

  const attachCamera = useCallback((el) => {
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

  const timeStr = `${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')}`;

  const handleToggleMute = useCallback(() => {
    resumeAudio();
    lkToggleMute();
  }, [lkToggleMute, resumeAudio]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) { cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; setCameraOn(false); }
    else { try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); cameraStreamRef.current = s; setCameraOn(true); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = s; } catch {} }
  }, [cameraOn]);

  const handleEndCall = useCallback(() => {
    setCallEnabled(false); // triggers useEffect cleanup which handles disconnect
    cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null;
    setCameraOn(false); setCallStartTime(null);
  }, []);

  const handleToggleAvatarMute = useCallback(() => {
    const v = avatarVideoRef.current; if (!v) return;
    const next = !avatarMuted; v.muted = next; setAvatarMuted(next);
  }, [avatarMuted]);

  async function handleRunGuiAgent(task) {
    setActiveTab('Live Activity');
    try {
      const res = await fetch('/api/demo/gui-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId || 'worker-session', task }),
      });
      const data = await res.json();
      if (data.desktop) setActiveGuiTask({ ...data.desktop, task });
    } catch (e) { console.error('GUI agent error:', e); }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || workerLoading) return;
    setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: 'YOU', text, time: 'Just now', isUser: true }]);
    setChatInput('');
    // Check if message is a workflow run command
    const lowerText = text.toLowerCase();
    const wfList = cfg.workflows?.list || [];
    if (wfList.length > 0 && /\b(run|execute|trigger|start|launch)\b/.test(lowerText)) {
      const matchedWf = wfList.find(wf => lowerText.includes(wf.name.toLowerCase().split(' ').slice(0, 2).join(' ')));
      if (matchedWf) {
        const isHard = /\bhard\b/.test(lowerText) || /\bfor real\b|\bactually\b|\bexecute\b/.test(lowerText);
        const mode = isHard ? 'hard' : 'soft';
        setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: authorName, text: `${isHard ? '⚡ Executing' : '🔍 Simulating'} workflow "${matchedWf.name}" — switching to Workflows tab.`, time: 'Just now', isUser: false }]);
        setActiveTab('Workflows');
        // Fire the run via orchestrate
        fetch('/api/demo/orchestrate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `${isHard ? 'Execute' : 'Simulate'} workflow: ${matchedWf.name}`, sessionId: sessionId || 'worker-session', context: `${mode.toUpperCase()} RUN triggered via chat: "${matchedWf.name}" (${matchedWf.trigger}). Steps: ${(matchedWf.steps || []).map(s => s.label).join(' → ')}.` }),
        }).catch(() => {});
        return;
      }
    }
    // Send via LiveKit agent (handles LLM + TTS + avatar response)
    if (isConnected) {
      resumeAudio(); // unlock audio on user gesture
      lkSendText(text);
      // agent will respond via dataReceived → agentText → useEffect → messages
      return;
    }
    // Fallback: direct orchestrate call if not connected
    setWorkerLoading(true);
    try {
      const res = await fetch('/api/demo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || 'worker-session',
          workerId: workerCode,
          workerName: firstName,
          workerRole: worker.role,
          context: `Worker: ${firstName}, ${worker.role}. ${cfg.job}.`,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.message;
      if (reply) setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: authorName, text: reply, time: 'Just now', isUser: false }]);
    } catch (err) { console.error('Worker chat error:', err); }
    finally { setWorkerLoading(false); }
  }

  function handlePutInProduction() {
    setMessages(prev => [...prev, {
      id: ++msgSeqRef.current, author: authorName,
      text: `Deploying to production. I'll handle the full rollout — infrastructure provisioning, monitoring setup, and stakeholder notifications. Estimated time: 4-6 hours.`,
      time: 'Just now', isUser: false,
    }]);
  }

  return (
    <div className="wkp">
      <MeshGradient style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} speed={0.19} scale={1.51} distortion={0.88} swirl={1} colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']} />

      <nav className="wkp-menu">
        <div className="wkp-menu-left">
          <span className="wkp-menu-logo">h</span>
          <div className="wkp-menu-sep" />
          <span className="wkp-menu-label">{firstName} · {(worker.role || worker.description || cfg.job || 'AI Worker').split(' at ')[0].slice(0, 40)}</span>
        </div>
        <div className="wkp-menu-center">
          <DockIcons active="call" onHome={onGoHome} onCall={() => {}} onWorkers={onGoWorkers} />
        </div>
        <div className="wkp-menu-right">
          {sessionId && (
            <span onClick={() => navigator.clipboard?.writeText(sessionId).catch(() => {})} title="Click to copy session ID" style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', userSelect: 'all', letterSpacing: '0.04em' }}>{sessionId}</span>
          )}
          <label className="wkp-nav-toggle">
            <input type="checkbox" checked={videoEnabled} onChange={e => setVideoEnabled(e.target.checked)} />
            <span className="wkp-nav-toggle-track"><span className="wkp-nav-toggle-thumb" /></span>
            <span className="wkp-nav-toggle-label">Video</span>
          </label>
          {isConnected && (
            <button className="wkp-menu-btn" style={{ fontSize: '11px', opacity: 0.7 }} onClick={() => { setPromptDraft(systemPrompt); setPromptEditing(v => !v); }} title="Edit agent system prompt">
              {promptEditing ? 'Close Prompt' : 'Edit Prompt'}
            </button>
          )}
          {onBackToDashboard && (
            <button className="wkp-menu-btn wkp-menu-btn--back" onClick={onBackToDashboard} title="Back to Dashboard">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className="wkp-menu-avatar">S</div>
        </div>
      </nav>

      {promptEditing && (
        <div style={{ position: 'fixed', top: 52, right: 16, zIndex: 200, background: '#1c1c28', border: '1px solid #333', borderRadius: 10, padding: '12px', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Live System Prompt — updates the agent immediately</div>
          <textarea
            value={promptDraft}
            onChange={e => setPromptDraft(e.target.value)}
            rows={6}
            style={{ width: '100%', background: '#0e0e18', color: '#e0e0e0', border: '1px solid #333', borderRadius: 6, padding: '8px', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => { updatePrompt(promptDraft); setPromptEditing(false); }}
            style={{ marginTop: 8, background: '#2DB563', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', width: '100%' }}
          >
            Send to Agent
          </button>
        </div>
      )}

      <div className="wkp-left">
        <div className="wkp-card">
          <div className="wkp-badge">
            <div className="wkp-badge-green-bg" />
            <div className="wkp-badge-photo-wrap">
              <div className="wkp-badge-photo" style={{
                backgroundImage: `radial-gradient(ellipse 61% 61% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${photoUrl})`,
                backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
              }} />
              <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
              <video ref={avatarVideoRef} autoPlay playsInline className="wkp-badge-video" style={{ display: (isConnected && videoEnabled && videoTrack) ? 'block' : 'none' }} />
              {isConnected && videoEnabled && videoTrack && <div className="wkp-badge-video-fade" />}
              <button className={`wkp-avatar-mute ${avatarMuted ? 'wkp-avatar-mute--on' : ''} ${isConnected ? '' : 'wkp-avatar-mute--hidden'}`} onClick={handleToggleAvatarMute}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={avatarMuted ? 0.4 : 1} />
                  {!avatarMuted && <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
                  {avatarMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
                </svg>
              </button>
              {subtitleText && <div className="wkp-badge-subtitles">{subtitleText}</div>}
            </div>
            <div className="wkp-badge-info">
              <div className="wkp-badge-name-row">
                <div className="wkp-badge-name-col">
                  <span className="wkp-badge-name">{worker.name.replace('\\n', '\n')}</span>
                  <span className="wkp-badge-role">{worker.role}</span>
                </div>
                {cameraOn && <div className="wkp-badge-camera-pip"><video ref={attachCamera} autoPlay playsInline muted /></div>}
              </div>
            </div>
            <div className="wkp-call-controls">
              {needsAudioResume && (
                <button onClick={resumeAudio} style={{ display: 'block', width: '100%', marginBottom: 6, background: '#2DB563', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer', fontWeight: 600, letterSpacing: '0.03em' }}>
                  ▶ Tap to enable audio
                </button>
              )}
              <div className="wkp-call-info">
                <span className={`wkp-call-dot ${isConnected ? 'wkp-call-dot--active' : ''}`} />
                <span className="wkp-call-label">{isConnected ? 'In Call' : isConnecting ? 'Connecting...' : 'Idle'}</span>
                <span className="wkp-call-time">{isConnected ? timeStr : ''}</span>
              </div>
              <div className="wkp-call-buttons">
                {(isConnected || lkConnecting) ? (
                  <button className="wkp-call-btn wkp-call-btn--end" onClick={handleEndCall} title="End call">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <button className="wkp-call-btn wkp-call-btn--phone" onClick={() => setCallEnabled(true)} title="Start call">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="#fff"/></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="wkp-badge-top">
              <div className="wkp-badge-verif"><span>VERIFIEDAIHUMAN{'<<<<<'}</span><span>{workerCode}{'<<<<<<<<<<<'}</span></div>
              <BarcodeSvg />
            </div>
            <FlutedGlass className="wkp-badge-glass" size={0.95} shape="zigzag" angle={0} distortionShape="cascade" distortion={1} shift={0} blur={0.34} edges={0.25} stretch={0} scale={1} fit="cover" highlights={0} shadows={0.25} colorBack="#00000000" colorHighlight="#FFFFFF" colorShadow="#FFFFFF" />
          </div>

          <div className="wkp-chat-messages" ref={chatEndRef}>
            {messages.map(msg => (
              <div key={msg.id} className={`wkp-msg ${msg.isUser ? 'wkp-msg--right' : ''}`}>
                <div className="wkp-msg-meta"><span className="wkp-msg-author">{msg.author}</span><span className="wkp-msg-time">{msg.time}</span></div>
                <div className="wkp-msg-bubble">{msg.text}</div>
              </div>
            ))}
            {workerLoading && (
              <div className="wkp-msg">
                <div className="wkp-msg-meta"><span className="wkp-msg-author">{authorName}</span></div>
                <div className="wkp-msg-bubble" style={{ opacity: 0.6 }}>Thinking...</div>
              </div>
            )}
          </div>

          <form className="wkp-chat-input" onSubmit={handleChatSubmit}>
            <div className="wkp-chat-input-wrap">
              <input className="wkp-chat-input-field" placeholder={`Message ${firstName}...`} value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <div className="wkp-send-wrap">
                <LiquidMetal className="wkp-send-ring" speed={1} softness={0.1} repetition={2} shiftRed={0.3} shiftBlue={0.3} distortion={0.07} contour={0.4} scale={1.87} rotation={0} shape="diamond" angle={70} colorBack="#00000000" colorTint="#FFFFFF" style={{ backgroundColor: '#AAAAAC', borderRadius: '999px', height: '44px', width: '44px' }} />
                <button type="submit" className="wkp-chat-send">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="wkp-main">
        <div className="wkp-tabs">
          {WKP_TABS.map((t) => (
            <button key={t} className={`wkp-tab ${activeTab === t ? 'wkp-tab--active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>
        <div className="wkp-main-body">
          {activeTab === 'Dashboard' && <DashboardTab cfg={cfg} firstName={firstName} companyName={companyName} platforms={platforms} sessionId={sessionId} />}
          {activeTab === 'Overview' && <OverviewTab cfg={cfg} />}
          {activeTab === 'Live Activity' && <LiveActivityTab cfg={cfg} sessionId={sessionId} activeGuiTask={activeGuiTask} onRunGuiAgent={handleRunGuiAgent} />}
          {activeTab === 'Skills' && <SkillsTab cfg={cfg} sessionId={sessionId} workerId={workerId} onRunGuiAgent={handleRunGuiAgent} />}
          {activeTab === 'Workflows' && <WorkflowsTab cfg={cfg} sessionId={sessionId} workerId={workerId} workerName={firstName} defaultExpandedId={defaultExpandedWorkflow} onWorkflowSelect={onWorkflowSelect} channels={workerChannels} onChannelsChange={setWorkerChannels} onWorkerUpdate={onWorkerUpdate} />}
          {activeTab === 'Outputs' && <OutputsTab cfg={cfg} />}
          {activeTab === 'Integrations' && <IntegrationsTab sessionId={sessionId} workerId={workerId} workerPermissions={workerPermissions} onPermissionsChange={setWorkerPermissions} channels={workerChannels} onChannelsChange={setWorkerChannels} />}
          {activeTab === 'Human Team' && <HumanTeamTab cfg={cfg} />}
          {activeTab === 'Technical' && <TechnicalTab cfg={cfg} />}
          {activeTab === 'Business Impact' && <BusinessImpactTab cfg={cfg} onPutInProduction={handlePutInProduction} />}
          {activeTab === 'Canvas' && <CanvasTab sessionId={sessionId} workerId={workerId} />}
        </div>
      </div>
    </div>
  );
}
