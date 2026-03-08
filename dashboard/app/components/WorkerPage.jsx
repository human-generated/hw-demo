'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import { MeshGradient, LiquidMetal, FlutedGlass } from '@paper-design/shaders-react';
import { WordsStagger } from './WordsStagger';
import { DockIcons } from './DockIcons';
import { WORKER_CONFIG, WORKER_PHOTOS, DEFAULT_WORKER, WORKER_PERSONA_IDS, guessWorkerCode, getWorkerPhoto, buildConfigFromWorker } from './WorkerConfig';

const ANAM_API_KEY = 'YmZiZTc0OTEtNjg5ZS00M2NhLThlNTgtYTlkNTQ2MDMzZWYyOjY3cVJwUm9hek9OcmZLcmVWQ0VxdmJBSWFPVFRQSUNQZEdlQlpyTGNLSUk9';
const DEFAULT_PHOTO = 'https://workers.paper.design/file-assets/01KJJAHFMKK1JK0Y3F10Q3SX8C/01KJJV6SFRDH7VGM2XBE5PM5HP.png';

const WKP_TABS = ['Dashboard', 'Overview', 'Live Activity', 'Skills', 'Workflows', 'Outputs', 'Integrations', 'Human Team', 'Technical', 'Business Impact'];

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

function DashboardTab({ cfg, firstName }) {
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
          {d.tools.map(t => (
            <div key={t} className="wkp-tool-pill"><span>{t}</span></div>
          ))}
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={0.8} stagger={0.05} speed={0.35}>{firstName}'s office</WordsStagger>
        <div className="wkp-office-row">
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
        </div>
      </div>
      <div className="wkp-section">
        <WordsStagger className="wkp-section-label" delay={1.0} stagger={0.05} speed={0.35}>Recent Activity</WordsStagger>
        <div className="wkpt-card">
          <div className="wkpt-card-head" />
          <div className="wkpt-feed">
            {d.activity.map((a, i) => (
              <div key={i} className="wkpt-feed-item">
                <span className="wkpt-feed-time">{a.time} ago</span>
                <span className="wkpt-feed-dot" style={{ background: a.color }} />
                <span className="wkpt-feed-text">{a.text}</span>
              </div>
            ))}
          </div>
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

function LiveActivityTab({ cfg }) {
  const d = cfg.liveActivity;
  return (
    <div className="wkpt-page">
      <div className="wkpt-live-banner">
        <div className="wkpt-live-pulse" />
        <div className="wkpt-live-info">
          <span className="wkpt-live-task">{d.currentTask}</span>
          <span className="wkpt-live-meta">{d.currentMeta}</span>
        </div>
        <span className="wkpt-live-badge">LIVE</span>
      </div>
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

function SkillsTab({ cfg }) {
  const d = cfg.skills;
  const integrations = d.integrations || (cfg.integrations?.systems || []).map(s => ({ name: s.name, access: 'Read/Write', status: s.status }));
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-3">
        <Card title="Core Skills">
          <div className="wkpt-skills-list">{d.core.map(s => <SkillBar key={s.label} label={s.label} value={s.value} />)}</div>
        </Card>
        <Card title="Domain Knowledge">
          <div className="wkpt-skills-list">{d.domain.map(s => <SkillBar key={s.label} label={s.label} value={s.value} />)}</div>
        </Card>
        <Card title="Guardrails" badge="Enforced" badgeColor="#ef4444">
          <div className="wkpt-guardrails">
            {d.guardrails.map((g, i) => (
              <div key={i} className="wkpt-guardrail">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {integrations.length > 0 && (
        <Card title="Integration Access" sub={`${integrations.length} systems granted`} className="wkpt-card--full">
          <div className="wkpt-int-grid">
            {integrations.map((ig, i) => (
              <div key={i} className={`wkpt-int-item${ig.status === 'Standby' ? ' wkpt-int-item--standby' : ''}`}>
                <span className="wkpt-integration-icon"><IntegrationIcon name={ig.name} /></span>
                <div className="wkpt-int-info">
                  <span className="wkpt-int-name">{ig.name}</span>
                  <span className="wkpt-int-access">{ig.access}</span>
                </div>
                <span className={`wkpt-integration-status${ig.status === 'Connected' ? ' wkpt-integration-status--on' : ''}`}>{ig.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function WorkflowsTab({ cfg, sessionId, workerId, defaultExpandedId = null, onWorkflowSelect = null }) {
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
          body: JSON.stringify({ sessionId, mode, workflowId: wf.id }),
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

  return (
    <div className="wkpt-page">
      <Card title="Workflows" sub={`${wfList.length} automated workflows`} className="wkpt-card--full">
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
              </div>
            )}
          </div>
        ))}
      </Card>
      {escalation.length > 0 && (
        <Card title="Escalation Logic" className="wkpt-card--full">
          <div className="wkpt-kv-list">
            {escalation.map((e, i) => <KV key={i} k={e.trigger} v={e.target} />)}
          </div>
        </Card>
      )}
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

function IntegrationsTab({ cfg }) {
  const d = cfg.integrations;
  const connected = d.systems.filter(s => s.status === 'Connected').length;
  const standby = d.systems.filter(s => s.status === 'Standby').length;
  return (
    <div className="wkpt-page">
      <div className="wkpt-grid-2">
        <Card title="Connected Systems" sub={`${connected} active · ${standby} standby`}>
          <div className="wkpt-integrations">
            {d.systems.map((ig, i) => (
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
              {d.readAccess.map((p, i) => (
                <div key={i} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{p}</span></div>
              ))}
            </div>
            <div className="wkpt-perm-section">
              <span className="wkpt-perm-heading">Write / Action</span>
              {d.writeAccess.map((p, i) => (
                <div key={i} className="wkpt-perm-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 5l3 3-3 3" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{p}</span></div>
              ))}
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
        <Card title="Peer Workers" sub={`${peers.length} AI workers in network`}>
          <div className="wkpt-team-list">
            {peers.map((p, i) => (
              <div key={i} className="wkpt-team-item">
                <div className="wkpt-team-avatar wkpt-team-avatar--ai">AI</div>
                <div className="wkpt-team-info"><span className="wkpt-team-name">{p.name}</span><span className="wkpt-team-role">{p.role}</span></div>
                <div className="wkpt-team-right"><span className="wkpt-team-relation">{p.relation}</span><span className="wkpt-team-sat">{p.freq}</span></div>
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

/* ─── Main WorkerPage component ──────────────────────────────────────────────── */
export function WorkerPage({ worker: workerProp = null, anamClient = null, cameraStream = null, avatarStream = null, onBack, onGoHome, onGoWorkers, sessionId, companyName = 'Humans.AI', allWorkers = [], defaultExpandedWorkflow = null, onWorkflowSelect = null }) {
  // Support both hub workers ({ code, name, role }) and session workers ({ id, name, description, workflows, steps })
  const worker = workerProp || DEFAULT_WORKER;
  const workerCode = worker.code || guessWorkerCode(worker) || 'HRMANAGER';
  const workerId = worker.id || workerCode; // actual session worker id or predefined code
  const cfg = buildConfigFromWorker(worker, companyName, allWorkers);
  const photoUrl = getWorkerPhoto(worker, 0) || DEFAULT_PHOTO;
  const firstName = (worker.name || 'Worker').split(/[\n\s]/)[0];
  const authorName = firstName.toUpperCase();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(() =>
    cfg.intro.map((m, i) => ({ id: i + 1, author: m.isUser ? 'YOU' : authorName, text: m.text, time: `${(cfg.intro.length - i) * 2}m ago`, isUser: m.isUser }))
  );
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(!!cameraStream);
  const [callStartTime, setCallStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);

  const anamClientRef = useRef(anamClient);
  const cameraStreamRef = useRef(cameraStream);
  const cameraVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const msgSeqRef = useRef(cfg.intro.length + 1);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
      // Forward completed AI messages to orchestrator for context
      client.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
        if (!Array.isArray(messages) || messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role === 'user') return;
        const content = lastMsg.content || (Array.isArray(lastMsg.content) ? lastMsg.content.map(c => c.text || '').join('') : '');
        if (!content) return;
        fetch('/api/demo/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: sessionId || 'worker-session',
            workerId: workerCode,
            workerName: firstName,
            workerRole: worker.role,
            context: `[Avatar AI message from ${firstName}] ${cfg.job}`,
          }),
        }).catch(() => {});
      });
    }
    async function init() {
      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
      }
      if (anamClientRef.current) {
        attachSubtitleListener(anamClientRef.current);
        if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        const videoEl = document.getElementById('wkp-avatar-video');
        if (videoEl && avatarStream) { videoEl.srcObject = avatarStream; videoEl.muted = false; videoEl.play().catch(() => {}); }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!cancelled) { cameraStreamRef.current = stream; setCameraOn(true); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream; }
      } catch { /* camera denied */ }
      if (cancelled) return;
      try {
        const workerTitle = (worker.name || cfg.job || 'AI Worker').replace(/\n/g, ' ').trim();
        const workerDesc = (worker.description || worker.role || cfg.overview || '').slice(0, 300);
        const co = companyName && companyName !== 'Humans.AI' ? ` at ${companyName}` : '';
        const systemPrompt = `You are an AI worker named "${workerTitle}"${co}. ${workerDesc} When users ask what you do, describe your automated workflows and capabilities. Be professional and concise.`;
        const newClient = unsafe_createClientWithApiKey(ANAM_API_KEY, { personaId: cfg.personaId, systemPrompt });
        anamClientRef.current = newClient;
        newClient.addListener('VIDEO_PLAY_STARTED', () => {
          if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        });
        attachSubtitleListener(newClient);
        await newClient.streamToVideoElement('wkp-avatar-video');
      } catch (err) { console.error('Anam connection failed:', err); if (!cancelled) setIsConnecting(false); }
    }
    const timer = setTimeout(init, 400);
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

  const timeStr = `${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')}`;

  const handleToggleMute = useCallback(() => {
    const c = anamClientRef.current; if (!c) return;
    if (micMuted) { c.unmuteInputAudio(); setMicMuted(false); } else { c.muteInputAudio(); setMicMuted(true); }
  }, [micMuted]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) { cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; setCameraOn(false); }
    else { try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); cameraStreamRef.current = s; setCameraOn(true); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = s; } catch {} }
  }, [cameraOn]);

  const handleEndCall = useCallback(() => {
    anamClientRef.current?.stopStreaming(); anamClientRef.current = null;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null;
    setIsConnected(false); setCameraOn(false); setCallStartTime(null);
  }, []);

  const handleToggleAvatarMute = useCallback(() => {
    const v = document.getElementById('wkp-avatar-video'); if (!v) return;
    const next = !avatarMuted; v.muted = next; setAvatarMuted(next);
  }, [avatarMuted]);

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
    // Send to avatar voice
    if (isConnected && anamClientRef.current) anamClientRef.current.sendUserMessage(text);
    // Send to orchestrator with worker context
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
          context: `You are acting as ${firstName}, ${worker.role}. ${cfg.job}. Respond in character, concisely and professionally.`,
        }),
      });
      const data = await res.json();
      if (data.reply || data.message) {
        setMessages(prev => [...prev, { id: ++msgSeqRef.current, author: authorName, text: data.reply || data.message, time: 'Just now', isUser: false }]);
      }
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
          {onBack && <button className="wkp-menu-btn" onClick={onBack}>Back</button>}
          <div className="wkp-menu-avatar">S</div>
        </div>
      </nav>

      <div className="wkp-left">
        <div className="wkp-card">
          <div className="wkp-badge">
            <div className="wkp-badge-green-bg" />
            <div className="wkp-badge-photo-wrap">
              <div className="wkp-badge-photo" style={{
                backgroundImage: `radial-gradient(ellipse 61% 61% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${photoUrl})`,
                backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
              }} />
              <video id="wkp-avatar-video" autoPlay playsInline className="wkp-badge-video" style={{ display: isConnected ? 'block' : 'none' }} />
              {isConnected && <div className="wkp-badge-video-fade" />}
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
              <div className="wkp-call-info">
                <span className={`wkp-call-dot ${isConnected ? 'wkp-call-dot--active' : ''}`} />
                <span className="wkp-call-label">{isConnected ? 'In Call' : isConnecting ? 'Connecting...' : 'Idle'}</span>
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
          {activeTab === 'Dashboard' && <DashboardTab cfg={cfg} firstName={firstName} />}
          {activeTab === 'Overview' && <OverviewTab cfg={cfg} />}
          {activeTab === 'Live Activity' && <LiveActivityTab cfg={cfg} />}
          {activeTab === 'Skills' && <SkillsTab cfg={cfg} />}
          {activeTab === 'Workflows' && <WorkflowsTab cfg={cfg} sessionId={sessionId} workerId={workerId} defaultExpandedId={defaultExpandedWorkflow} onWorkflowSelect={onWorkflowSelect} />}
          {activeTab === 'Outputs' && <OutputsTab cfg={cfg} />}
          {activeTab === 'Integrations' && <IntegrationsTab cfg={cfg} />}
          {activeTab === 'Human Team' && <HumanTeamTab cfg={cfg} />}
          {activeTab === 'Technical' && <TechnicalTab cfg={cfg} />}
          {activeTab === 'Business Impact' && <BusinessImpactTab cfg={cfg} onPutInProduction={handlePutInProduction} />}
        </div>
      </div>
    </div>
  );
}
