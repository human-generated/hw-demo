'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import { MeshGradient, LiquidMetal, FlutedGlass } from '@paper-design/shaders-react';
import { WordsStagger } from './WordsStagger';
import { DockIcons } from './DockIcons';

const ANAM_API_KEY = 'NzcyNTEwZjQtY2YyZi00NWYzLWFiZjEtMDk1ZDEzNjkyOGJhOklwYTJFMGYxSHNjL2k2dW9SUi9JZlpDOW81TnBSVm9mZ3JiR2FVREpCRVU9';
const ANAM_PERSONA_ID = '6ccddf38-aed1-4bbb-9809-fc92986eb436';

function BarcodeSvg() {
  const bars = [
    { x: 0, w: 1.5 }, { x: 4, w: 3 }, { x: 9, w: 1 }, { x: 12, w: 2.5 },
    { x: 16, w: 1 }, { x: 19, w: 3 }, { x: 24, w: 1.5 }, { x: 27, w: 1 },
    { x: 30, w: 2.5 }, { x: 34, w: 1.5 }, { x: 38, w: 3 }, { x: 43, w: 1 },
    { x: 46, w: 2 }, { x: 50, w: 1.5 }, { x: 53, w: 3 }, { x: 58, w: 1 },
    { x: 61, w: 2.5 }, { x: 65, w: 1.5 }, { x: 68, w: 3 }, { x: 73, w: 1 },
    { x: 76, w: 2.5 },
  ];
  return (
    <svg width="69" height="21" viewBox="0 0 80 24" fill="none" style={{ opacity: 0.2, flexShrink: 0 }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="#000" />)}
    </svg>
  );
}

const TOOLS = [
  { icon: 'phone', label: 'Making calls' },
  { icon: 'message', label: 'Messaging' },
  { icon: 'search', label: 'Research' },
  { icon: 'code', label: 'Coding' },
  { icon: 'mic', label: 'Voice' },
  { icon: 'face', label: 'Face' },
];

const OUTPUTS = [
  { label: 'Q3 Report.pdf', color: '#C44D4D', icon: 'doc' },
  { label: 'Voice recording', color: '#5B8A72', icon: 'mic' },
  { label: 'Transcripts', color: '#6B7B8D', icon: 'transcript' },
  { label: 'Media notes', color: '#8B7355', icon: 'media' },
  { label: 'Email sent', color: '#5B72A0', icon: 'email' },
];

const WORKFLOWS = [
  {
    title: 'Research company financials',
    description: 'Search SEC filings → Extract Q3 data → Compile revenue, EBITDA, margin → Generate PDF summary',
    color: '#2DB563', bgColor: '#F2F8F4',
    tools: ['SEC API', 'Browser', 'PDF Gen'],
  },
  {
    title: 'Competitive landscape analysis',
    description: 'Identify competitors → Scrape pricing pages → Compare features → Draft competitive matrix',
    color: '#D4A853', bgColor: '#FFF8EC',
    tools: ['Browser', 'Scraper', 'Sheets'],
  },
  {
    title: 'Mobile app sandbox',
    description: 'Launch sandbox env → Install app → Run UI tests → Capture screenshots → Report findings',
    color: '#7B8FA8', bgColor: '#F0F3F6',
    tools: ['Composio', 'Sandbox', 'Camera'],
  },
];

const STEPS = [
  { label: 'Search', status: 'done' },
  { label: 'Extract', status: 'done' },
  { label: 'Compile', status: 'active' },
  { label: 'Report', status: 'pending' },
  { label: 'Send', status: 'pending' },
];

const WKP_TABS = ['Dashboard', 'Overview', 'Live Activity', 'Skills', 'Workflows', 'Outputs', 'Integrations', 'Human Team', 'Technical', 'Business Impact'];

function ToolIcon({ type }) {
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#1A1A1A', strokeWidth: 2 };
  switch (type) {
    case 'phone': return <svg {...props}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>;
    case 'message': return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case 'code': return <svg {...props}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case 'mic': return <svg {...props}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>;
    case 'face': return <svg {...props}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    default: return null;
  }
}

function OutputIcon({ type, color }) {
  const props = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5 };
  switch (type) {
    case 'doc': return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case 'mic': return <svg {...props}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
    case 'transcript': return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>;
    case 'media': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
    case 'email': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg>;
    default: return null;
  }
}

function StepIcon({ status, type }) {
  const color = status === 'done' || status === 'active' ? '#FFFFFF' : 'rgba(26,26,26,0.25)';
  const strokeColor = status === 'active' ? '#2DB563' : color;
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: status === 'active' ? strokeColor : color, strokeWidth: 2 };
  switch (type) {
    case 'Search': return <svg {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case 'Extract': return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case 'Compile': return <svg {...props}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case 'Report': return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case 'Send': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg>;
    default: return null;
  }
}

function TiltCard({ children, className }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const rafRef = useRef(0);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * 20;
      const rotateY = (x - 0.5) * 20;
      const scale = 1.04;
      setStyle({
        transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'transform 0.1s ease-out, box-shadow 0.3s ease',
        boxShadow: `${(x - 0.5) * -20}px ${(y - 0.5) * -20}px 40px rgba(0,0,0,0.12), 0 20px 60px rgba(0,0,0,0.1)`,
      });
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setStyle({
      transform: 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease',
      boxShadow: 'none',
    });
  }, []);

  return (
    <div ref={ref} className={className} style={style} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}

/* ─── WorkerPageTabs inlined ─── */
const sp = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

function IntegrationIcon({ name }) {
  const c = 'currentColor';
  switch (name) {
    case 'SAP Ariba': return <svg {...sp} stroke={c}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M3 9h18" /></svg>;
    case 'Microsoft 365': return <svg {...sp} stroke={c}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>;
    case 'Salesforce': return <svg {...sp} stroke={c}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
    case 'DocuSign': return <svg {...sp} stroke={c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 17l2-2 4 4" /></svg>;
    case 'Slack': return <svg {...sp} stroke={c}><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20 10h-1.5M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83 0-1.5 1.5-1.5zM4 14h1.5M10 9.5C10 8.67 10.67 8 11.5 8h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM10 4V5.5M14 14.5c0 .83-.67 1.5-1.5 1.5h-5C6.67 16 6 15.33 6 14.5S6.67 13 7.5 13h5c.83 0 1.5.67 1.5 1.5zM14 20v-1.5" /></svg>;
    case 'Jira': return <svg {...sp} stroke={c}><path d="M12 2L2 12l10 10 10-10L12 2z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'AWS S3': return <svg {...sp} stroke={c}><path d="M4 7v10l8 5 8-5V7l-8-5-8 5z" /><path d="M4 7l8 5 8-5M12 12v10" /></svg>;
    case 'Google Workspace': return <svg {...sp} stroke={c}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'Notion': return <svg {...sp} stroke={c}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h5M8 15h6" /></svg>;
    case 'Snowflake': return <svg {...sp} stroke={c}><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" /></svg>;
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

function SkillBar({ label, value }) {
  return (
    <div className="wkpt-skill">
      <div className="wkpt-skill-head">
        <span className="wkpt-skill-label">{label}</span>
        <span className="wkpt-skill-val">{value}%</span>
      </div>
      <div className="wkpt-skill-track">
        <div className="wkpt-skill-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div className="wkpt-kv">
      <span className="wkpt-kv-k">{k}</span>
      <span className={`wkpt-kv-v${mono ? ' wkpt-kv-v--mono' : ''}`}>{v}</span>
    </div>
  );
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

function OverviewTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-stats-row">
        <Stat value="1,247" label="Tasks Completed" sub="↑ 12% vs last month" accent="#1a1a1a" />
        <Stat value="99.7%" label="Uptime" sub="Last 30 days" accent="#34c759" />
        <Stat value="3.2%" label="Escalation Rate" sub="↓ 0.8% vs target" />
        <Stat value="6.4h" label="Daily Active" sub="Avg session time" />
      </div>
      <div className="wkpt-grid-2">
        <Card title="Identity & Deployment" badge="Production">
          <div className="wkpt-kv-list">
            <KV k="Worker ID" v="ARIA-7X-0042" mono />
            <KV k="Role" v="Government Services Specialist" />
            <KV k="Department" v="Public Sector Operations" />
            <KV k="Region" v="North America — East" />
            <KV k="Deployed" v="2025-11-14" mono />
            <KV k="Last Updated" v="2026-03-04 09:41 UTC" mono />
            <KV k="Version" v="v3.2.1-stable" mono />
            <KV k="Environment" v="Production — US-East-1" />
          </div>
        </Card>
        <Card title="Personality & Style">
          <div className="wkpt-kv-list">
            <KV k="Communication" v="Professional, warm, concise" />
            <KV k="Formality" v="Semi-formal with adaptive tone" />
            <KV k="Response Length" v="Medium — 2-4 paragraphs default" />
            <KV k="Proactivity" v="High — suggests next steps" />
            <KV k="Escalation Style" v="Transparent — explains reasoning" />
            <KV k="Languages" v="English, Spanish, French" />
            <KV k="Humor" v="Light — context-appropriate only" />
            <KV k="Conflict" v="De-escalation first, then escalate" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function LiveActivityTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-live-banner">
        <div className="wkpt-live-pulse" />
        <div className="wkpt-live-info">
          <span className="wkpt-live-task">Reviewing procurement RFP for Virginia DOT — Section 4.2 compliance check</span>
          <span className="wkpt-live-meta">Running for 00:14:32 · Co-worker: Marcus Chen (Sales)</span>
        </div>
        <span className="wkpt-live-badge">LIVE</span>
      </div>
      <div className="wkpt-grid-2">
        <Card title="Activity Feed" sub="Today">
          <div className="wkpt-feed">
            {[
              { time: '09:41', event: 'Started compliance review for VA-DOT-2026-RFP-0042', color: '#3b82f6' },
              { time: '09:38', event: 'Escalated pricing anomaly to James Park (Finance)', color: '#f59e0b' },
              { time: '09:22', event: 'Completed vendor risk assessment — Acme Corp rated B+', color: '#34c759' },
              { time: '09:15', event: 'Generated procurement summary report (4 pages)', color: '#1a1a1a' },
              { time: '08:58', event: 'Received new assignment from Elena Vasquez', color: '#8b5cf6' },
              { time: '08:45', event: 'Session started — Morning briefing ingested', color: 'rgba(0,0,0,0.15)' },
            ].map((e, i) => (
              <div key={i} className="wkpt-feed-item">
                <span className="wkpt-feed-time">{e.time}</span>
                <span className="wkpt-feed-dot" style={{ background: e.color }} />
                <span className="wkpt-feed-text">{e.event}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="wkpt-stack">
          <Card title="Session Stats" sub="Today">
            <div className="wkpt-kv-list">
              <KV k="Tasks Completed" v="7" />
              <KV k="Documents Processed" v="12" />
              <KV k="Emails Drafted" v="4" />
              <KV k="Escalations" v="1" />
              <KV k="Tokens Used" v="184,200" mono />
              <KV k="Avg Response" v="2.3s" mono />
            </div>
          </Card>
          <Card title="Scheduled">
            <div className="wkpt-feed">
              {[
                { time: '10:00', event: 'Daily standup brief for Gov team' },
                { time: '11:30', event: 'RFP deadline — final review VA-DOT' },
                { time: '14:00', event: 'Vendor call prep — Telecom RFI' },
              ].map((e, i) => (
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

function SkillsTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-3">
        <Card title="Core Skills">
          <div className="wkpt-skills-list">
            <SkillBar label="Document Analysis" value={96} />
            <SkillBar label="Process Automation" value={91} />
            <SkillBar label="Email & Communication" value={88} />
            <SkillBar label="Voice Interaction" value={82} />
            <SkillBar label="Code Generation" value={74} />
            <SkillBar label="Data Extraction" value={93} />
          </div>
        </Card>
        <Card title="Domain Knowledge">
          <div className="wkpt-skills-list">
            <SkillBar label="Government & Public Sector" value={97} />
            <SkillBar label="Procurement & RFP" value={94} />
            <SkillBar label="Telecom Regulations" value={86} />
            <SkillBar label="Legal & Compliance" value={83} />
            <SkillBar label="Finance & Budgeting" value={79} />
            <SkillBar label="Healthcare Policy" value={68} />
          </div>
        </Card>
        <Card title="Guardrails" badge="Enforced" badgeColor="#ef4444">
          <div className="wkpt-guardrails">
            {[
              'Cannot approve expenditures over $10,000',
              'Cannot sign or execute legal contracts',
              'Cannot access classified / ITAR documents',
              'Cannot modify production databases directly',
              'Cannot communicate externally without review',
              'Cannot override human escalation decisions',
              'Cannot share PII outside approved systems',
              'Cannot make hiring or termination decisions',
            ].map((g, i) => (
              <div key={i} className="wkpt-guardrail">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WorkflowsTab() {
  const steps = [
    { label: 'Receive RFP', status: 'done' },
    { label: 'Parse Requirements', status: 'done' },
    { label: 'Compliance Check', status: 'active' },
    { label: 'Risk Assessment', status: 'pending' },
    { label: 'Draft Response', status: 'pending' },
    { label: 'Human Review', status: 'pending' },
    { label: 'Submit', status: 'pending' },
  ];
  return (
    <div className="wkpt-page">
      <Card title="Active Workflow — RFP Response SOP" badge="Step 3 of 7" className="wkpt-card--full">
        <div className="wkpt-wf-steps">
          {steps.map((s, i) => (
            <div key={i} className={`wkpt-wf-step wkpt-wf-step--${s.status}`}>
              <div className="wkpt-wf-node">
                {s.status === 'done' && <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {s.status === 'active' && <div className="wkpt-wf-pulse" />}
              </div>
              {i < steps.length - 1 && <div className="wkpt-wf-line" />}
              <span className="wkpt-wf-label">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="wkpt-grid-2">
        <Card title="Active SOPs" sub="4 procedures">
          <div className="wkpt-sop-list">
            {[
              { name: 'RFP Response Pipeline', freq: 'Per request', last: 'In progress' },
              { name: 'Vendor Risk Assessment', freq: 'Weekly', last: 'Completed today' },
              { name: 'Compliance Audit Prep', freq: 'Monthly', last: 'Due Mar 15' },
              { name: 'Budget Reconciliation', freq: 'Bi-weekly', last: 'Next: Mar 10' },
            ].map((s, i) => (
              <div key={i} className="wkpt-sop">
                <div className="wkpt-sop-info">
                  <span className="wkpt-sop-name">{s.name}</span>
                  <span className="wkpt-sop-freq">{s.freq}</span>
                </div>
                <span className="wkpt-sop-last">{s.last}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Escalation Logic">
          <div className="wkpt-kv-list">
            <KV k="Budget > $10K" v="→ James Park (Finance)" />
            <KV k="Legal Risk Flag" v="→ Elena Vasquez (Legal)" />
            <KV k="Client-Facing" v="→ Marcus Chen (Sales)" />
            <KV k="Technical Blocker" v="→ Sophia Berg (Engineering)" />
            <KV k="Policy Unclear" v="→ Alexandra Seaman (HR)" />
            <KV k="Unresolved 30min+" v="→ Supervisor auto-notify" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function OutputsTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Recent Outputs" sub="Last 5">
          <div className="wkpt-output-list">
            {[
              { type: 'Document', name: 'VA-DOT Compliance Report', score: 98, time: '09:22' },
              { type: 'Email', name: 'Vendor follow-up — Acme Corp', score: 94, time: '09:01' },
              { type: 'Report', name: 'Weekly procurement summary', score: 96, time: 'Yesterday' },
              { type: 'Document', name: 'Risk matrix — Telecom RFI', score: 91, time: 'Yesterday' },
              { type: 'Email', name: 'Stakeholder update — Q1 review', score: 89, time: 'Mar 3' },
            ].map((o, i) => (
              <div key={i} className="wkpt-output-item">
                <span className="wkpt-output-icon"><OutputTypeIcon type={o.type} /></span>
                <div className="wkpt-output-info">
                  <span className="wkpt-output-name">{o.name}</span>
                  <span className="wkpt-output-time">{o.type} · {o.time}</span>
                </div>
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
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" strokeWidth="14" strokeDasharray="125.6 188.4" strokeDashoffset="0" strokeLinecap="round" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#34c759" strokeWidth="14" strokeDasharray="78.5 235.5" strokeDashoffset="-125.6" strokeLinecap="round" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="14" strokeDasharray="47.1 266.9" strokeDashoffset="-204.1" strokeLinecap="round" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#8e8e93" strokeWidth="14" strokeDasharray="63 251" strokeDashoffset="-251.2" strokeLinecap="round" />
              </svg>
              <div className="wkpt-donut-legend">
                <div className="wkpt-legend-item"><span className="wkpt-legend-dot" style={{ background: '#1a1a1a' }} />Documents <b>40%</b></div>
                <div className="wkpt-legend-item"><span className="wkpt-legend-dot" style={{ background: '#34c759' }} />Reports <b>25%</b></div>
                <div className="wkpt-legend-item"><span className="wkpt-legend-dot" style={{ background: '#f59e0b' }} />Emails <b>15%</b></div>
                <div className="wkpt-legend-item"><span className="wkpt-legend-dot" style={{ background: '#8e8e93' }} />Other <b>20%</b></div>
              </div>
            </div>
          </Card>
          <Card title="Quality Stats">
            <div className="wkpt-kv-list">
              <KV k="Avg Quality Score" v="94.2 / 100" />
              <KV k="Rated Outputs" v="1,089 of 1,247" />
              <KV k="Perfect Scores" v="312 (28.6%)" />
              <KV k="Rework Rate" v="2.1%" />
              <KV k="Avg Time to Output" v="4.2 min" mono />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: 'SAP Ariba', status: 'Connected' },
    { name: 'Microsoft 365', status: 'Connected' },
    { name: 'Salesforce', status: 'Connected' },
    { name: 'DocuSign', status: 'Standby' },
    { name: 'Slack', status: 'Connected' },
    { name: 'Jira', status: 'Connected' },
    { name: 'AWS S3', status: 'Connected' },
    { name: 'Google Workspace', status: 'Standby' },
    { name: 'Notion', status: 'Connected' },
    { name: 'Snowflake', status: 'Connected' },
  ];
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Connected Systems" sub="8 active · 2 standby">
          <div className="wkpt-integrations">
            {integrations.map((ig, i) => (
              <div key={i} className={`wkpt-integration${ig.status === 'Standby' ? ' wkpt-integration--standby' : ''}`}>
                <span className="wkpt-integration-icon"><IntegrationIcon name={ig.name} /></span>
                <span className="wkpt-integration-name">{ig.name}</span>
                <span className={`wkpt-integration-status${ig.status === 'Connected' ? ' wkpt-integration-status--on' : ''}`}>{ig.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Data Access Permissions">
          <div className="wkpt-perms">
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">Read Access</span>
              {['Procurement records', 'Vendor profiles', 'Budget reports', 'Policy documents', 'Email (assigned threads)', 'Calendar (team)'].map((p, i) => (
                <div key={i} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{p}</span></div>
              ))}
            </div>
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">Write / Action</span>
              {['Draft documents', 'Send emails (with approval)', 'Update CRM records', 'Create Jira tickets', 'Upload to S3 (scoped)'].map((p, i) => (
                <div key={i} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 5l3 3-3 3" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{p}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HumanTeamTab() {
  const team = [
    { name: 'Alexandra Seaman', role: 'Supervisor', relation: 'Direct Supervisor', satisfaction: 4.9 },
    { name: 'Marcus Chen', role: 'Sales Lead', relation: 'Co-worker', satisfaction: 4.7 },
    { name: 'Elena Vasquez', role: 'Legal Counsel', relation: 'Escalation Target', satisfaction: 4.8 },
    { name: 'James Park', role: 'Finance Analyst', relation: 'Co-worker', satisfaction: 4.5 },
    { name: 'Sophia Berg', role: 'Engineering Lead', relation: 'Override Authority', satisfaction: 4.6 },
  ];
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Team Members" sub="5 humans">
          <div className="wkpt-team-list">
            {team.map((t, i) => (
              <div key={i} className="wkpt-team-item">
                <div className="wkpt-team-avatar">{t.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="wkpt-team-info">
                  <span className="wkpt-team-name">{t.name}</span>
                  <span className="wkpt-team-role">{t.role}</span>
                </div>
                <div className="wkpt-team-right">
                  <span className="wkpt-team-relation">{t.relation}</span>
                  <span className="wkpt-team-sat">★ {t.satisfaction}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Collaboration Stats">
          <div className="wkpt-collab">
            <div className="wkpt-collab-bars">
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Autonomous</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill" style={{ width: '78%' }} /><span>78%</span></div></div>
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Escalated</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill wkpt-collab-fill--yellow" style={{ width: '18%' }} /><span>18%</span></div></div>
              <div className="wkpt-collab-row"><span className="wkpt-collab-label">Override</span><div className="wkpt-collab-track"><div className="wkpt-collab-fill wkpt-collab-fill--red" style={{ width: '4%' }} /><span>4%</span></div></div>
            </div>
            <div className="wkpt-kv-list" style={{ marginTop: 20 }}>
              <KV k="Team Satisfaction" v="4.7 / 5.0" />
              <KV k="Response Quality" v="94% approved first try" />
              <KV k="Avg Escalation Time" v="3.2 minutes" mono />
              <KV k="Weekly Interactions" v="142 average" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TechnicalTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-3">
        <Card title="Model Configuration">
          <div className="wkpt-kv-list">
            <KV k="Base Model" v="Claude Opus 4.6" />
            <KV k="Context Window" v="200K tokens" mono />
            <KV k="Memory" v="Persistent + Session" />
            <KV k="Modalities" v="Text, Voice, Vision" />
            <KV k="Access Level" v="L3 — Autonomous" />
            <KV k="Environment" v="Production" />
            <KV k="Data Residency" v="US-East (Virginia)" />
            <KV k="Encryption" v="AES-256 at rest, TLS 1.3" mono />
          </div>
        </Card>
        <Card title="SLA & Performance">
          <div className="wkpt-kv-list">
            <KV k="Uptime Target" v="99.5%" />
            <KV k="Uptime Actual" v="99.7%" />
            <KV k="Response p50" v="1.2s" mono />
            <KV k="Response p95" v="3.8s" mono />
            <KV k="Error Rate" v="0.03%" />
            <KV k="Token Cost / Day" v="$12.40" mono />
            <KV k="Token Cost / Task" v="$0.18" mono />
            <KV k="Monthly Budget" v="$380 / $500" />
          </div>
        </Card>
        <Card title="Version History">
          <div className="wkpt-versions">
            {[
              { ver: 'v3.2.1', date: 'Mar 4', notes: 'Improved RFP compliance scoring accuracy' },
              { ver: 'v3.2.0', date: 'Feb 28', notes: 'Added telecom domain knowledge module' },
              { ver: 'v3.1.4', date: 'Feb 20', notes: 'Fixed escalation timeout edge case' },
              { ver: 'v3.1.3', date: 'Feb 14', notes: 'Voice interaction latency optimization' },
              { ver: 'v3.1.0', date: 'Feb 1', notes: 'New guardrail: PII handling policy' },
              { ver: 'v3.0.0', date: 'Jan 15', notes: 'Major: Multi-modal support, new base model' },
            ].map((v, i) => (
              <div key={i} className="wkpt-version">
                <div className="wkpt-version-head">
                  <span className="wkpt-version-tag">{v.ver}</span>
                  <span className="wkpt-version-date">{v.date}</span>
                </div>
                <span className="wkpt-version-notes">{v.notes}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BusinessImpactTab() {
  return (
    <div className="wkpt-page">
      <div className="wkpt-stats-row wkpt-stats-row--3">
        <Stat value="2,340h" label="Hours Saved" sub="Since deployment (Nov 2025)" accent="#1a1a1a" />
        <Stat value="$186K" label="Cost Savings" sub="Labor cost equivalent" accent="#34c759" />
        <Stat value="14.2x" label="ROI" sub="Return on investment" accent="#1a1a1a" />
      </div>
      <div className="wkpt-grid-2">
        <Card title="Performance vs Targets">
          <div className="wkpt-perf-list">
            {[
              { metric: 'Task Throughput', actual: 92, target: 85 },
              { metric: 'Quality Score', actual: 94, target: 90 },
              { metric: 'Uptime', actual: 99.7, target: 99.5 },
              { metric: 'Escalation Rate', actual: 96.8, target: 95 },
              { metric: 'Client Satisfaction', actual: 91, target: 88 },
            ].map((p, i) => (
              <div key={i} className="wkpt-perf-row">
                <span className="wkpt-perf-metric">{p.metric}</span>
                <div className="wkpt-perf-bar-wrap">
                  <div className="wkpt-perf-target" style={{ left: `${p.target}%` }} />
                  <div className={`wkpt-perf-fill${p.actual >= p.target ? ' wkpt-perf-fill--pass' : ' wkpt-perf-fill--fail'}`} style={{ width: `${p.actual}%` }} />
                </div>
                <span className="wkpt-perf-val">{p.actual}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Client Deployments" sub="3 active">
          <div className="wkpt-deploy-list">
            {[
              { client: 'Virginia DOT', type: 'Procurement Ops', since: 'Nov 2025', status: 'Active' },
              { client: 'Maryland DGS', type: 'Compliance Review', since: 'Jan 2026', status: 'Active' },
              { client: 'Federal GSA', type: 'Vendor Assessment', since: 'Feb 2026', status: 'Pilot' },
            ].map((d, i) => (
              <div key={i} className="wkpt-deploy-item">
                <div className="wkpt-deploy-info">
                  <span className="wkpt-deploy-client">{d.client}</span>
                  <span className="wkpt-deploy-type">{d.type} · Since {d.since}</span>
                </div>
                <span className={`wkpt-deploy-status${d.status === 'Pilot' ? ' wkpt-deploy-status--pilot' : ''}`}>{d.status}</span>
              </div>
            ))}
          </div>
          <button className="wkpt-production-btn">
            Put it in production
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ─── Per-worker default data ─── */
const WORKER_DEFAULTS = {
  HRMANAGER: {
    intro: [
      { id: 1, author: 'ALEXANDRA', text: "I've completed the initial HR audit. Onboarding backlog is down 40% and compliance gaps are closed.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Great. Can you run a policy review for the engineering team?', time: '1m ago', isUser: true },
      { id: 3, author: 'ALEXANDRA', text: "On it. Pulling the latest policy docs and cross-referencing with last quarter's audit findings.", time: 'Just now', isUser: false },
    ],
    banner: 'Running HR policy review for Engineering team — compliance check and gap analysis',
    job: 'I manage human resources workflows, employee onboarding, and policy compliance at scale',
    office: 'hr-portal.humans.ai/onboarding',
    siteName: 'HR PORTAL',
    activity: [
      { time: '2m', text: 'Completed onboarding checklist for 3 new hires', color: '#3b82f6' },
      { time: '5m', text: 'Flagged policy gap in engineering leave policy', color: '#f59e0b' },
      { time: '9m', text: 'Sent compliance reminder to 12 team members', color: '#34c759' },
    ],
  },
  SALESREP0: {
    intro: [
      { id: 1, author: 'MARCUS', text: "Q3 pipeline is looking strong — I've qualified 14 new enterprise leads this week.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Focus on the APAC segment. Run outreach for the top 5 prospects.', time: '1m ago', isUser: true },
      { id: 3, author: 'MARCUS', text: "On it. Drafting personalized sequences and scheduling follow-up calls for all 5.", time: 'Just now', isUser: false },
    ],
    banner: 'Running APAC outreach sequences — prospect research and personalized email drafts',
    job: 'I drive enterprise sales pipeline, qualify leads, run outreach, and close deals efficiently',
    office: 'crm.humans.ai/pipeline',
    siteName: 'CRM',
    activity: [
      { time: '2m', text: 'Qualified 3 new APAC enterprise prospects', color: '#34c759' },
      { time: '6m', text: 'Drafted outreach sequence for Hanwha Group', color: '#3b82f6' },
      { time: '10m', text: 'Updated pipeline forecast — $2.4M this quarter', color: '#f59e0b' },
    ],
  },
  LEGALADV0: {
    intro: [
      { id: 1, author: 'ELENA', text: "Contract review for the Apex partnership is complete — 3 clauses flagged for negotiation.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'What are the main risks in the IP ownership clause?', time: '1m ago', isUser: true },
      { id: 3, author: 'ELENA', text: 'The clause grants broad IP transfer rights. I recommend carving out pre-existing IP and adding a 2-year sunset.', time: 'Just now', isUser: false },
    ],
    banner: 'Reviewing Apex partnership contract — IP ownership clause risk analysis',
    job: 'I review contracts, assess legal risks, ensure regulatory compliance, and draft legal documents',
    office: 'legal.humans.ai/contracts',
    siteName: 'LEGAL',
    activity: [
      { time: '2m', text: 'Flagged 3 high-risk clauses in Apex contract', color: '#ef4444' },
      { time: '7m', text: 'Completed GDPR compliance check for new data pipeline', color: '#34c759' },
      { time: '11m', text: 'Filed NDA for the Meridian partnership', color: '#3b82f6' },
    ],
  },
  FINANALYS: {
    intro: [
      { id: 1, author: 'JAMES', text: "Q3 close is done. EBITDA came in at $214M — 2% above forecast, driven by SaaS margins.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Model the impact of a 10% headcount reduction on Q4 cash flow.', time: '1m ago', isUser: true },
      { id: 3, author: 'JAMES', text: "Running the model now. Preliminary estimate shows $4.2M in Q4 savings with a 60-day payback.", time: 'Just now', isUser: false },
    ],
    banner: 'Modeling Q4 headcount reduction scenarios — cash flow and payback analysis',
    job: 'I analyze financial data, build models, forecast cash flow, and support strategic decisions',
    office: 'finance.humans.ai/reports',
    siteName: 'FINANCE',
    activity: [
      { time: '2m', text: 'Completed Q3 financial close — EBITDA $214M', color: '#34c759' },
      { time: '5m', text: 'Built Q4 headcount reduction model', color: '#3b82f6' },
      { time: '9m', text: 'Flagged variance in APAC operating costs', color: '#f59e0b' },
    ],
  },
  RESEARCHER: {
    intro: [
      { id: 1, author: 'AISHA', text: "Market analysis complete. The TAM for AI back-office is $47B, growing at 34% CAGR through 2028.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Pull the top 5 competitor funding rounds and their product roadmaps.', time: '1m ago', isUser: true },
      { id: 3, author: 'AISHA', text: "Pulling SEC filings, Crunchbase data, and product blogs now. ETA 3 minutes.", time: 'Just now', isUser: false },
    ],
    banner: 'Researching competitor funding and product roadmaps — $47B AI back-office TAM analysis',
    job: 'I conduct deep market research, competitive analysis, and strategic intelligence gathering',
    office: 'research.humans.ai/insights',
    siteName: 'RESEARCH',
    activity: [
      { time: '2m', text: 'Completed TAM analysis — $47B AI back-office market', color: '#34c759' },
      { time: '6m', text: 'Pulled 5 competitor funding rounds from Crunchbase', color: '#3b82f6' },
      { time: '10m', text: 'Synthesized 3 product roadmap leaks into brief', color: '#8b5cf6' },
    ],
  },
  ENGINEER0: {
    intro: [
      { id: 1, author: 'SOPHIA', text: "The API migration to v3 is 80% complete. All critical endpoints are live, 4 legacy routes remaining.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Run a performance audit on the remaining legacy routes and estimate migration effort.', time: '1m ago', isUser: true },
      { id: 3, author: 'SOPHIA', text: "On it. Running latency profiling and dependency analysis on all 4 routes.", time: 'Just now', isUser: false },
    ],
    banner: 'Auditing legacy API routes — latency profiling and v3 migration estimation',
    job: 'I build and maintain software systems, review code, manage infrastructure, and solve technical problems',
    office: 'eng.humans.ai/dashboard',
    siteName: 'ENGINEERING',
    activity: [
      { time: '2m', text: 'Completed API v3 migration for 12 endpoints', color: '#34c759' },
      { time: '5m', text: 'Identified performance bottleneck in auth route', color: '#ef4444' },
      { time: '8m', text: 'Deployed hotfix for rate limiting bug', color: '#3b82f6' },
    ],
  },
  MARKETING: {
    intro: [
      { id: 1, author: 'LIAM', text: "Campaign performance this week: CTR is up 18%, but conversion on the landing page dropped 6%.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: "Run an A/B test analysis on last month's email campaigns and suggest the best subject line format.", time: '1m ago', isUser: true },
      { id: 3, author: 'LIAM', text: "Analyzing 12 campaigns now. Personalized subject lines with numbers outperformed generic ones by 31%.", time: 'Just now', isUser: false },
    ],
    banner: 'Analyzing A/B email campaign performance — subject line optimization for Q1',
    job: 'I run marketing campaigns, analyze performance data, and optimize messaging and conversion funnels',
    office: 'marketing.humans.ai/campaigns',
    siteName: 'MARKETING',
    activity: [
      { time: '2m', text: 'Analyzed 12 email A/B tests — 31% uplift identified', color: '#34c759' },
      { time: '6m', text: 'Flagged 6% conversion drop on landing page', color: '#f59e0b' },
      { time: '10m', text: 'Scheduled 3 new campaigns for Q1 launch', color: '#3b82f6' },
    ],
  },
  DESIGNER0: {
    intro: [
      { id: 1, author: 'NINA', text: "The new dashboard redesign concepts are ready for review. I've prepared 3 direction options.", time: '2m ago', isUser: false },
      { id: 2, author: 'YOU', text: 'Focus on option 2 — the minimal one. Create high-fidelity specs for the main nav.', time: '1m ago', isUser: true },
      { id: 3, author: 'NINA', text: "Working on the nav specs now. Component library updates and interaction notes incoming.", time: 'Just now', isUser: false },
    ],
    banner: 'Creating high-fidelity specs for dashboard nav redesign — minimal direction',
    job: 'I design interfaces, create visual systems, and ensure product experiences are clear and beautiful',
    office: 'design.humans.ai/components',
    siteName: 'DESIGN',
    activity: [
      { time: '2m', text: 'Delivered 3 dashboard direction concepts', color: '#8b5cf6' },
      { time: '5m', text: 'Updated component library with new nav tokens', color: '#34c759' },
      { time: '9m', text: 'Annotated interaction specs for mobile nav', color: '#3b82f6' },
    ],
  },
};

const DEFAULT_WORKER = {
  name: 'Alexandra\nSeaman',
  role: 'HR at Humans.AI',
  code: 'HRMANAGER',
  status: 'Active',
  tasks: 24,
  rating: 4.9,
};

/* ─── Main WorkerPage component ─── */
export function WorkerPage({ worker: workerProp = null, anamClient = null, cameraStream = null, avatarStream = null, onBack, onGoHome, onGoWorkers, sessionId }) {
  const worker = workerProp || DEFAULT_WORKER;
  const workerCode = worker.code || 'HRMANAGER';
  const workerData = WORKER_DEFAULTS[workerCode] || WORKER_DEFAULTS.HRMANAGER;
  const firstName = worker.name.split('\n')[0];
  const authorName = firstName.toUpperCase();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(() =>
    workerData.intro.map(m => ({ ...m, author: m.isUser ? 'YOU' : authorName }))
  );
  const [isConnected, setIsConnected] = useState(!!anamClient);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(!!cameraStream);
  const [callStartTime, setCallStartTime] = useState(anamClient ? Date.now() : null);
  const [elapsed, setElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);

  const anamClientRef = useRef(anamClient);
  const cameraStreamRef = useRef(cameraStream);
  const cameraVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const msgSeqRef = useRef(4);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const client = anamClientRef.current;
      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
      }
      if (client) {
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
        const videoEl = document.getElementById('wkp-avatar-video');
        if (videoEl && avatarStream) {
          videoEl.srcObject = avatarStream;
          videoEl.play().catch(() => {});
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setCameraOn(true);
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      } catch { /* */ }
      try {
        const newClient = unsafe_createClientWithApiKey(ANAM_API_KEY, { personaId: ANAM_PERSONA_ID });
        anamClientRef.current = newClient;
        newClient.addListener('VIDEO_PLAY_STARTED', () => {
          if (!cancelled) { setIsConnected(true); setCallStartTime(Date.now()); }
        });
        newClient.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (evt) => {
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
        await newClient.streamToVideoElement('wkp-avatar-video');
      } catch (err) {
        console.error('Anam connection failed:', err);
      }
    }
    const timer = setTimeout(init, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

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

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const handleToggleMute = useCallback(() => {
    const client = anamClientRef.current;
    if (!client) return;
    if (micMuted) { client.unmuteInputAudio(); setMicMuted(false); }
    else { client.muteInputAudio(); setMicMuted(true); }
  }, [micMuted]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setCameraOn(true);
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      } catch { /* */ }
    }
  }, [cameraOn]);

  const handleEndCall = useCallback(() => {
    anamClientRef.current?.stopStreaming();
    anamClientRef.current = null;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setIsConnected(false);
    setCameraOn(false);
    setCallStartTime(null);
  }, []);

  const handleToggleAvatarMute = useCallback(() => {
    const videoEl = document.getElementById('wkp-avatar-video');
    if (!videoEl) return;
    const next = !avatarMuted;
    videoEl.muted = next;
    setAvatarMuted(next);
  }, [avatarMuted]);

  async function handleChatSubmit(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || workerLoading) return;
    setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: 'YOU', text, time: 'Just now', isUser: true }]);
    setChatInput('');
    if (isConnected && anamClientRef.current) anamClientRef.current.sendUserMessage(text);
    setWorkerLoading(true);
    try {
      const res = await fetch(`/api/demo/workers/worker-default/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId || 'worker-session' }),
      });
      const data = await res.json();
      if (data.reply || data.message) {
        setMessages(prev => [...prev, {
          id: ++msgSeqRef.current,
          author: authorName,
          text: data.reply || data.message,
          time: 'Just now',
          isUser: false,
        }]);
      }
    } catch (err) {
      console.error('Worker chat error:', err);
    } finally {
      setWorkerLoading(false);
    }
  }

  return (
    <div className="wkp">
      <MeshGradient
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        speed={0.19} scale={1.51} distortion={0.88} swirl={1}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      {/* Menu Bar */}
      <nav className="wkp-menu">
        <div className="wkp-menu-left">
          <span className="wkp-menu-logo">h</span>
          <div className="wkp-menu-sep" />
          <span className="wkp-menu-label">{firstName} · {worker.role.split(' at ')[0]}</span>
        </div>
        <div className="wkp-menu-center">
          <DockIcons active="call" onHome={onGoHome} onCall={() => {}} onWorkers={onGoWorkers} />
        </div>
        <div className="wkp-menu-right">
          {onBack && <button className="wkp-menu-btn" onClick={onBack}>Back</button>}
          <button className="wkp-menu-btn">About</button>
          <div className="wkp-menu-avatar">S</div>
        </div>
      </nav>

      {/* Left: Badge + Chat */}
      <div className="wkp-left">
        <div className="wkp-card">
          <div className="wkp-badge">
            <div className="wkp-badge-green-bg" />
            <div className="wkp-badge-photo-wrap">
              <div className="wkp-badge-photo" style={{
                backgroundImage: `radial-gradient(ellipse 61% 61% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png)`,
                backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
              }} />
              <video id="wkp-avatar-video" autoPlay playsInline className="wkp-badge-video" style={{ display: isConnected ? 'block' : 'none' }} />
              {isConnected && <div className="wkp-badge-video-fade" />}
              <button className={`wkp-avatar-mute ${avatarMuted ? 'wkp-avatar-mute--on' : ''} ${isConnected ? '' : 'wkp-avatar-mute--hidden'}`} onClick={handleToggleAvatarMute}>
                {avatarMuted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" /><line x1="3" y1="3" x2="21" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                )}
              </button>
              {subtitleText && <div className="wkp-badge-subtitles">{subtitleText}</div>}
            </div>
            <div className="wkp-badge-info">
              <div className="wkp-badge-name-row">
                <div className="wkp-badge-name-col">
                  <span className="wkp-badge-name">{worker.name.replace('\\n', '\n')}</span>
                  <span className="wkp-badge-role">{worker.role}</span>
                </div>
                {cameraOn && (
                  <div className="wkp-badge-camera-pip">
                    <video ref={attachCamera} autoPlay playsInline muted />
                  </div>
                )}
              </div>
            </div>
            <div className="wkp-call-controls">
              <div className="wkp-call-info">
                <span className={`wkp-call-dot ${isConnected ? 'wkp-call-dot--active' : ''}`} />
                <span className="wkp-call-label">{isConnected ? 'In Call' : 'Connecting...'}</span>
                <span className="wkp-call-time">{isConnected ? timeStr : ''}</span>
              </div>
              <div className="wkp-call-buttons">
                <button className={`wkp-call-btn wkp-call-btn--mic ${micMuted ? 'wkp-call-btn--mic-muted' : ''}`} onClick={handleToggleMute} disabled={!isConnected}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="7" rx="2" fill="#fff" /><path d="M4 8C4 8 4 11.5 8 11.5C12 11.5 12 8 12 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><line x1="8" y1="11.5" x2="8" y2="14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <button className="wkp-call-btn wkp-call-btn--phone" onClick={handleToggleCamera} disabled={!isConnected}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4.5C2 4.5 4 2 8 2C12 2 14 4.5 14 4.5L12.5 7L10.5 5.5V10.5L12.5 9L14 11.5C14 11.5 12 14 8 14C4 14 2 11.5 2 11.5L3.5 9L5.5 10.5V5.5L3.5 7L2 4.5Z" fill="#fff" /></svg>
                </button>
                <button className="wkp-call-btn wkp-call-btn--end" onClick={handleEndCall} disabled={!isConnected}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
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
                <div className="wkp-msg-meta">
                  <span className="wkp-msg-author">{msg.author}</span>
                  <span className="wkp-msg-time">{msg.time}</span>
                </div>
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

      {/* Main: Tabs + Content */}
      <div className="wkp-main">
        <div className="wkp-tabs">
          {WKP_TABS.map((t) => (
            <button key={t} className={`wkp-tab ${activeTab === t ? 'wkp-tab--active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>
        <div className="wkp-main-body">
          {activeTab === 'Dashboard' ? (
            <div className="wkp-center">
              <div className="wkp-status-banner">
                <div className="wkp-status-dot-live" />
                <span className="wkp-status-text">{workerData.banner}</span>
                <span className="wkp-status-time">14:32</span>
              </div>

              <div className="wkp-metrics-row">
                <TiltCard className="wkp-metric-card wkp-metric-card--job">
                  <WordsStagger className="wkp-metric-label" delay={0.3} stagger={0.05} speed={0.35}>Job</WordsStagger>
                  <WordsStagger className="wkp-metric-desc" delay={0.5} stagger={0.04} speed={0.4}>{workerData.job}</WordsStagger>
                </TiltCard>
                <div className="wkp-metric-card">
                  <WordsStagger className="wkp-metric-label" delay={0.4} stagger={0.05} speed={0.35}>ROI</WordsStagger>
                  <WordsStagger className="wkp-metric-big" delay={0.6} stagger={0.08} speed={0.5}>34%</WordsStagger>
                </div>
                <div className="wkp-metric-card">
                  <WordsStagger className="wkp-metric-label" delay={0.5} stagger={0.05} speed={0.35}>h / day</WordsStagger>
                  <WordsStagger className="wkp-metric-big" delay={0.7} stagger={0.08} speed={0.5}>2.4</WordsStagger>
                </div>
              </div>

              <div className="wkp-section">
                <WordsStagger className="wkp-section-label" delay={0.6} stagger={0.05} speed={0.35}>Tools</WordsStagger>
                <div className="wkp-tools-wrap">
                  {TOOLS.map(t => (
                    <div key={t.label} className="wkp-tool-pill">
                      <ToolIcon type={t.icon} />
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wkp-section">
                <WordsStagger className="wkp-section-label" delay={0.8} stagger={0.05} speed={0.35}>{firstName}'s office</WordsStagger>
                <div className="wkp-office-row">
                  <div className="wkp-browser">
                    <div className="wkp-browser-toolbar">
                      <div className="wkp-browser-dots">
                        <span className="wkp-dot wkp-dot--red" />
                        <span className="wkp-dot wkp-dot--yellow" />
                        <span className="wkp-dot wkp-dot--green" />
                      </div>
                      <div className="wkp-browser-nav">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <div className="wkp-browser-url">{workerData.office}</div>
                    </div>
                    <div className="wkp-browser-page">
                      <div className="wkp-browser-nav-row">
                        <span className="wkp-browser-site">{workerData.siteName}</span>
                        <div className="wkp-browser-links"><span>Products</span><span>Investors</span><span>About</span></div>
                      </div>
                      <div className="wkp-browser-content">
                        <span className="wkp-browser-title">Q3 2025 Results</span>
                        <span className="wkp-browser-sub">Revenue up 23% YoY to $847M, driven by enterprise expansion.</span>
                      </div>
                      <div className="wkp-browser-metrics">
                        <div className="wkp-browser-metric wkp-browser-metric--hl"><span className="wkp-browser-metric-label">REVENUE</span><span className="wkp-browser-metric-value">$847M</span></div>
                        <div className="wkp-browser-metric"><span className="wkp-browser-metric-label">EBITDA</span><span className="wkp-browser-metric-value">$214M</span></div>
                        <div className="wkp-browser-metric"><span className="wkp-browser-metric-label">MARGIN</span><span className="wkp-browser-metric-value wkp-green">25.3%</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="wkp-phone">
                    <div className="wkp-phone-notch" />
                    <div className="wkp-phone-screen">
                      <div className="wkp-phone-status"><span className="wkp-phone-time">9:41</span></div>
                      <div className="wkp-phone-stock-name">Meridian</div>
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
                </div>
              </div>

              <div className="wkp-section">
                <WordsStagger className="wkp-section-label" delay={1.0} stagger={0.05} speed={0.35}>Outputs</WordsStagger>
                <div className="wkp-outputs-row">
                  {OUTPUTS.map(o => (
                    <div key={o.label} className="wkp-output">
                      <div className="wkp-output-icon-wrap">
                        <OutputIcon type={o.icon} color={o.color} />
                      </div>
                      <span className="wkp-output-label">{o.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wkp-section">
                <WordsStagger className="wkp-section-label" delay={1.2} stagger={0.05} speed={0.35}>Recent activity</WordsStagger>
                <div className="wkp-activity-list">
                  {workerData.activity.map((a, i) => (
                    <div key={i} className="wkp-activity-item">
                      <span className="wkp-activity-dot" style={{ background: a.color }} />
                      <span className="wkp-activity-text">{a.text}</span>
                      <span className="wkp-activity-time">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="wkp-tab-content" key={activeTab}>
              {activeTab === 'Overview' && <OverviewTab />}
              {activeTab === 'Live Activity' && <LiveActivityTab />}
              {activeTab === 'Skills' && <SkillsTab />}
              {activeTab === 'Workflows' && <WorkflowsTab />}
              {activeTab === 'Outputs' && <OutputsTab />}
              {activeTab === 'Integrations' && <IntegrationsTab />}
              {activeTab === 'Human Team' && <HumanTeamTab />}
              {activeTab === 'Technical' && <TechnicalTab />}
              {activeTab === 'Business Impact' && <BusinessImpactTab />}
            </div>
          )}

          {/* Right: Flow Panel */}
          <div className="wkp-right">
            <div className="wkp-flow-panel">
              <div className="wkp-flow-header">
                <WordsStagger className="wkp-section-label" delay={0.4} stagger={0.05} speed={0.35}>Flow</WordsStagger>
                <span className="wkp-flow-count">3 workflows</span>
              </div>
              {WORKFLOWS.map((wf, i) => (
                <div key={i} className="wkp-workflow">
                  <div className="wkp-workflow-title-row">
                    <span className="wkp-workflow-dot" style={{ background: wf.color }} />
                    <span className="wkp-workflow-title">{wf.title}</span>
                  </div>
                  <span className="wkp-workflow-desc">{wf.description}</span>
                  <div className="wkp-workflow-tools">
                    {wf.tools.map(t => (
                      <span key={t} className="wkp-workflow-tag" style={{ background: wf.bgColor, color: wf.color }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="wkp-diagram">
                <span className="wkp-diagram-label">Active workflow</span>
                <div className="wkp-diagram-steps">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="wkp-diagram-step-group">
                      <div className={`wkp-diagram-node wkp-diagram-node--${step.status}`}>
                        <StepIcon status={step.status} type={step.label} />
                      </div>
                      {i < STEPS.length - 1 && <div className={`wkp-diagram-line wkp-diagram-line--${step.status}`} />}
                      <span className={`wkp-diagram-step-label wkp-diagram-step-label--${step.status}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div className="wkp-run-btn">
                <LiquidMetal
                  className="wkp-run-shader"
                  speed={1} softness={0.1} repetition={2} shiftRed={0.3} shiftBlue={0.3}
                  distortion={0.07} contour={0.4} scale={10} rotation={0} shape="diamond" angle={70}
                  colorBack="#00000000" colorTint="#FFFFFF"
                  style={{ backgroundColor: '#AAAAAC', borderRadius: '18px', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                />
                <div className="wkp-run-inner">
                  <span className="wkp-run-text">RUN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
