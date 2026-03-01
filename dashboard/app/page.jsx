'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ReactFlow, Background, Handle, Position, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:     '#F4F4F4',
  card:   '#FFFFFF',
  text:   '#0D0D0D',
  muted:  '#888888',
  faint:  'rgba(0,0,0,0.07)',
  border: '1px solid rgba(0,0,0,0.08)',
  shadow: '0 2px 12px rgba(0,0,0,0.06)',
  radius: '4px',
  mono:   "'JetBrains Mono', 'Fira Mono', monospace",
  ui:     "'Space Grotesk', 'Inter', sans-serif",
  mint:   '#6CEFA0',
  blue:   '#6CDDEF',
  purple: '#B06CEF',
  orange: '#EF9B6C',
  red:    '#EF4444',
  yellow: '#F5C842',
};

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ color, children, style = {} }) {
  return (
    <span style={{
      background: color || T.faint, color: T.text,
      borderRadius: T.radius, padding: '2px 8px',
      fontSize: '0.6rem', fontFamily: T.mono,
      fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: '0.06em', display: 'inline-block', ...style,
    }}>{children}</span>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
function Btn({ onClick, children, ghost, small, disabled, color, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: ghost ? T.card : (color || T.text),
        color: ghost ? T.muted : '#fff',
        border: ghost ? `1px solid rgba(0,0,0,0.1)` : 'none',
        borderRadius: T.radius,
        padding: small ? '0.3rem 0.75rem' : '0.5rem 1.2rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: T.mono, fontSize: small ? '0.62rem' : '0.7rem',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >{children}</button>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ value = 0, color = T.mint }) {
  return (
    <div style={{ background: T.faint, borderRadius: 99, height: 6, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ── Phase constants ───────────────────────────────────────────────────────────
const PHASES = ['start', 'research', 'building', 'platforms', 'workers'];

function phaseLabel(p) {
  if (p === 'start') return 'Start';
  if (p === 'research') return 'Research';
  if (p === 'building') return 'Building';
  if (p === 'platforms') return 'Platforms';
  if (p === 'workers') return 'Workers';
  return p;
}

const PLATFORM_ICONS = { crm: '👥', support: '🎫', analytics: '📊', erp: '📦', ecommerce: '🛒', hr: '🧑‍💼', messaging: '💬' };
const PLATFORM_COLORS = { crm: T.blue, support: T.orange, analytics: T.purple, erp: T.mint, ecommerce: T.yellow, hr: T.red, messaging: '#aaa' };

// Educated guesses per platform type — ordered by likelihood for large enterprises
const PLATFORM_SOFTWARE_OPTIONS = {
  crm:       ['Salesforce Sales Cloud', 'Microsoft Dynamics 365 CRM', 'HubSpot CRM', 'SAP CRM', 'Oracle Siebel CRM', 'Zoho CRM', 'SugarCRM'],
  erp:       ['SAP S/4HANA', 'Microsoft Dynamics 365 Finance', 'Oracle Fusion ERP', 'NetSuite', 'Odoo', 'Sage X3', 'Infor CloudSuite'],
  support:   ['Zendesk Suite', 'Freshdesk', 'ServiceNow CSM', 'Jira Service Management', 'Intercom', 'HubSpot Service Hub', 'Salesforce Service Cloud'],
  analytics: ['Power BI', 'Tableau', 'Looker (Google)', 'SAP Analytics Cloud', 'Qlik Sense', 'Metabase', 'Sisense'],
  ecommerce: ['Adobe Commerce (Magento)', 'SAP Commerce Cloud', 'Shopify Plus', 'BigCommerce', 'Salesforce Commerce Cloud', 'WooCommerce', 'Proprietary'],
  hr:        ['SAP SuccessFactors', 'Workday HCM', 'Oracle HCM Cloud', 'ADP Workforce Now', 'BambooHR', 'UKG Pro', 'Charisma HCM'],
  messaging: ['Microsoft Teams', 'Slack', 'Google Workspace', 'Zoom Team Chat', 'Webex'],
};

// ── SessionListPanel ──────────────────────────────────────────────────────────
function SessionListPanel({ currentId, onSelect, onDelete, onClose }) {
  const [sessions, setSessions] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function reload() {
    fetch('/api/demo/sessions').then(r => r.json()).then(setSessions).catch(() => setSessions([]));
  }
  useEffect(() => { reload(); }, []);

  const phaseColor = { start: T.muted, research: T.blue, building: T.orange, platforms: T.mint, workers: T.purple };

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    setDeleting(id);
    await fetch(`/api/demo/session/${id}`, { method: 'DELETE' });
    onDelete(id);
    reload();
    setDeleting(null);
  }

  return (
    <div style={{
      position: 'fixed', top: 52, right: 0, width: 340, bottom: 0,
      background: T.card, borderLeft: T.border, boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: '1rem', lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {sessions === null && (
          <div style={{ padding: '1rem', textAlign: 'center', color: T.muted, fontFamily: T.mono, fontSize: '0.7rem' }}>Loading…</div>
        )}
        {sessions !== null && sessions.length === 0 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: T.muted, fontFamily: T.mono, fontSize: '0.7rem' }}>No sessions yet</div>
        )}
        {(sessions || []).map(s => {
          const isCurrent = s.id === currentId;
          const ph = s.phase || 'start';
          const ago = s.updatedAt ? (() => {
            const ms = Date.now() - new Date(s.updatedAt).getTime();
            if (ms < 60000) return 'just now';
            if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`;
            if (ms < 86400000) return `${Math.floor(ms/3600000)}h ago`;
            return `${Math.floor(ms/86400000)}d ago`;
          })() : '';
          const whLabel = s.power && s.power.totalWh > 0
            ? (s.power.totalWh < 0.001 ? `${(s.power.totalWh*1e6).toFixed(0)}µWh` : s.power.totalWh < 1 ? `${(s.power.totalWh*1000).toFixed(2)}mWh` : `${s.power.totalWh.toFixed(3)}Wh`)
            : null;
          return (
            <div key={s.id} style={{
              padding: '0.75rem 1rem', borderRadius: T.radius, marginBottom: 4,
              background: isCurrent ? T.faint : 'transparent',
              border: isCurrent ? `1px solid rgba(0,0,0,0.1)` : '1px solid transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = T.faint; }}
            onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.72rem' }}>
                  {s.company || <span style={{ color: T.muted }}>Unnamed</span>}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: phaseColor[ph] || T.muted }}>{ph}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: T.muted, fontFamily: T.mono, fontSize: '0.62rem', flexWrap: 'wrap' }}>
                <span>{s.id.slice(0, 10)}…</span>
                <span>·</span>
                <span>{s.platforms}P {s.workers}W</span>
                {whLabel && <><span>·</span><span style={{ color: T.mint }}>{whLabel}</span></>}
                {ago && <><span>·</span><span>{ago}</span></>}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                {!isCurrent && (
                  <button onClick={() => { onSelect(s.id); onClose(); }} style={{
                    flex: 1, background: T.text, color: '#fff', border: 'none', borderRadius: T.radius,
                    padding: '0.25rem 0.5rem', fontFamily: T.mono, fontSize: '0.6rem',
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                  }}>Resume</button>
                )}
                {isCurrent && (
                  <div style={{ flex: 1, fontSize: '0.58rem', fontFamily: T.mono, color: T.mint, fontWeight: 700, display: 'flex', alignItems: 'center' }}>● CURRENT</div>
                )}
                <button
                  onClick={e => handleDelete(e, s.id)}
                  disabled={deleting === s.id}
                  style={{
                    background: 'none', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: T.radius,
                    padding: '0.25rem 0.6rem', fontFamily: T.mono, fontSize: '0.6rem',
                    color: T.red, cursor: 'pointer', opacity: deleting === s.id ? 0.5 : 1,
                  }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState('start');
  const [chat, setChat] = useState([{ role: 'assistant', content: 'Welcome to H-Demo. Enter a company name to begin your AI back-office simulation.' }]);
  const [usage, setUsage] = useState({ tokens: 0, requests: 0, estimatedCostUsd: 0 });
  const [power, setPower] = useState({ totalWh: 0, runs: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [agentTree, setAgentTree] = useState([]); // delegation tree nodes

  // Research
  const [company, setCompany] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [platformSoftware, setPlatformSoftware] = useState({}); // id → selected software string
  const [researchSummary, setResearchSummary] = useState('');
  const [researchFindings, setResearchFindings] = useState([]);
  const [researchCitations, setResearchCitations] = useState([]);
  const [rawResearch, setRawResearch] = useState('');

  // Building
  const [buildProgress, setBuildProgress] = useState({});

  // Platform canvas
  const [deployedPlatforms, setDeployedPlatforms] = useState([]);
  const [activePlatformChat, setActivePlatformChat] = useState(null);
  const [platformChatInput, setPlatformChatInput] = useState('');
  const [platformChatHistory, setPlatformChatHistory] = useState([]);
  const [platformChatLoading, setPlatformChatLoading] = useState(false);

  // Workers
  const [workers, setWorkers] = useState([]);
  const [activeWorkerTab, setActiveWorkerTab] = useState({});
  const [workerLogs, setWorkerLogs] = useState({});
  const [deployingWorker, setDeployingWorker] = useState(null);
  const [proposingWorkers, setProposingWorkers] = useState(false);

  // Real client data
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [realClientActive, setRealClientActive] = useState(false);


  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // Init session
  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      // Try to restore a previous session from localStorage
      const saved = typeof window !== 'undefined' ? localStorage.getItem('hw-demo-session') : null;
      if (saved) {
        const r = await fetch(`/api/demo/session/${saved}`);
        if (r.ok) {
          const d = await r.json();
          if (d && d.phase && d.phase !== 'start') {
            setSessionId(saved);
            restoreFromSession(d);
            return;
          }
        }
        localStorage.removeItem('hw-demo-session');
      }
      // Create a fresh session
      const r2 = await fetch('/api/demo/session', { method: 'POST' });
      const d2 = await r2.json();
      if (d2.sessionId) {
        setSessionId(d2.sessionId);
        if (typeof window !== 'undefined') localStorage.setItem('hw-demo-session', d2.sessionId);
      }
    } catch {}
  }

  function restoreFromSession(d) {
    const ph = d.phase || 'start';
    setPhase(ph);
    if (d.company) setCompany(d.company);
    if (d.usage) setUsage(d.usage);
    if (d.power) setPower(d.power);
    if (d.researchSummary) setResearchSummary(d.researchSummary);
    if (d.researchFindings) setResearchFindings(d.researchFindings);
    if (d.platforms && d.platforms.length > 0) {
      setPlatforms(d.platforms);
      const deployed = d.platforms.filter(p => p.status === 'deployed' || p.status === 'building');
      if (deployed.length > 0) setDeployedPlatforms(deployed);
    }
    if (d.workers && d.workers.length > 0) setWorkers(d.workers);
    const nP = (d.platforms || []).filter(p => p.status === 'deployed').length;
    const nW = (d.workers || []).length;
    // Reset chat to just the restore summary — don't replay old steps
    setChat([{
      role: 'assistant',
      content: `Session restored.${d.company ? ` Company: ${d.company.name}.` : ''}${nP ? ` ${nP} platform${nP > 1 ? 's' : ''} deployed.` : ''}${nW ? ` ${nW} worker${nW > 1 ? 's' : ''} configured.` : ''} Phase: ${ph}.`,
      tag: 'agent:info',
    }]);
  }

  // Poll session state
  useEffect(() => {
    if (!sessionId) return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/demo/session/${sessionId}`);
        const d = await r.json();
        if (d.platforms) {
          const updated = d.platforms.map(p => ({ ...p }));
          setDeployedPlatforms(prev => {
            const merged = [...prev];
            updated.forEach(up => {
              const idx = merged.findIndex(p => p.id === up.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...up };
              else merged.push(up);
            });
            return merged;
          });
        }
        if (d.phase && d.phase !== phase) setPhase(d.phase);
        if (d.usage) setUsage(d.usage);
        if (d.power) setPower(d.power);
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [sessionId]);

  function addChat(role, content, tag) {
    setChat(prev => [...prev, { role, content, tag, at: new Date().toISOString() }]);
  }

  async function handleResearch(co) {
    const name = (co || '').trim();
    if (!name) return;
    setLoading(true);
    setPhase('research');
    addChat('user', name);
    addChat('assistant', `Researching ${name}...`, 'agent:research');
    // Spawn research sub-agents
    setAgentTree(prev => {
      const ts = Date.now();
      const parentId = prev.find(n => n.role === 'research-agent')?.id || `ra-${ts}`;
      const parent = prev.find(n => n.role === 'research-agent') || { id: parentId, name: 'Research Agent', icon: '🔍', role: 'research-agent', parentId: prev[0]?.id || null, status: 'running', task: `Research ${name}` };
      const alreadyHasParent = prev.some(n => n.role === 'research-agent');
      const subs = [
        { id: `ra-web-${ts}`,      name: 'Web Search',       icon: '🌐', role: `ra-web-${ts}`,      parentId, status: 'running', task: 'Perplexity sonar search' },
        { id: `ra-profile-${ts}`,  name: 'Company Profiler', icon: '🏢', role: `ra-profile-${ts}`,  parentId, status: 'running', task: 'Industry, size, HQ' },
        { id: `ra-platform-${ts}`, name: 'Platform Detector',icon: '📡', role: `ra-platform-${ts}`, parentId, status: 'running', task: 'Detect back-office stack' },
        { id: `ra-merge-${ts}`,    name: 'Merge Agent',      icon: '🔀', role: `ra-merge-${ts}`,    parentId, status: 'pending', task: 'Combine + rank platforms' },
      ];
      return alreadyHasParent ? [...prev, ...subs] : [...prev, parent, ...subs];
    });
    try {
      const r = await fetch('/api/demo/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: name, sessionId }),
      });
      const d = await r.json();
      if (d.company) {
        setCompany(d.company);
        const plats = d.platforms || [];
        setPlatforms(plats);
        // Init software selection: use actual_software from research if specific, else first known option
        const sw = {};
        plats.forEach(p => {
          const opts = PLATFORM_SOFTWARE_OPTIONS[p.id] || [];
          const known = p.actual_software && p.actual_software !== 'To be determined' && p.actual_software !== 'Unknown' && !p.actual_software.startsWith('Unknown');
          sw[p.id] = known ? p.actual_software : (opts[0] || '');
        });
        setPlatformSoftware(sw);
        setResearchSummary(d.summary || '');
        setResearchFindings(d.key_findings || []);
        setResearchCitations(d.citations || []);
        setRawResearch(d.raw_research || '');
        const selected = (d.platforms || []).filter(p => p.selected);
        const knownSoftware = selected.filter(p => p.actual_software && p.actual_software !== 'To be determined').map(p => `${p.name} (${p.actual_software})`);
        setAgentTree(prev => prev.map(n => n.role.startsWith('ra-') || n.role === 'research-agent' ? { ...n, status: 'done' } : n));
        const msg = [
          `**${d.company.name}** — ${d.company.industry}, ${d.company.country || ''}, ${d.company.size || ''}`,
          d.summary,
          knownSoftware.length ? `Identified tools: ${knownSoftware.join(', ')}.` : '',
          `\nSelected ${selected.length} platforms to simulate. Confirm or adjust below, then click Build.`,
        ].filter(Boolean).join('\n');
        addChat('assistant', msg, 'agent:done');
      } else {
        addChat('assistant', d.error || 'Research failed. Try again.', 'agent:error');
        setPhase('start');
      }
    } catch (e) {
      addChat('assistant', 'Research error: ' + e.message, 'agent:error');
      setPhase('start');
    }
    setLoading(false);
  }

  async function handleBuildPlatforms() {
    const selected = platforms.filter(p => p.selected);
    if (!selected.length) return;
    setPhase('building');
    addChat('assistant', `Building ${selected.length} platform sandboxes with shared database...`, 'agent:build');
    const init = {};
    selected.forEach(p => { init[p.id] = { status: 'queued', progress: 0, name: p.name }; });
    setBuildProgress(init);
    // Spawn one builder sub-agent per platform
    setAgentTree(prev => {
      const ts = Date.now();
      const parentId = prev.find(n => n.role === 'build-agent')?.id || `ba-${ts}`;
      const parent = prev.find(n => n.role === 'build-agent') || { id: parentId, name: 'Build Agent', icon: '🏗️', role: 'build-agent', parentId: prev[0]?.id || null, status: 'running', task: `Build ${selected.length} sandboxes` };
      const alreadyHasParent = prev.some(n => n.role === 'build-agent');
      const subs = selected.map((p, i) => ({
        id: `ba-plat-${ts}-${i}`, name: `${p.name} Builder`, icon: '🔧',
        role: `ba-plat-${p.id}`, parentId, status: 'running', task: `Deploy ${platformSoftware[p.id] || p.name} sandbox`,
      }));
      return alreadyHasParent ? [...prev, ...subs] : [...prev, parent, ...subs];
    });

    try {
      const r = await fetch('/api/demo/build-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms: selected.map(p => ({ ...p, software: platformSoftware[p.id] || p.actual_software || '' })), realClient: realClientActive ? { name: clientName, email: clientEmail, phone: clientPhone } : null }),
      });
      const d = await r.json();
      if (d.platforms) {
        setDeployedPlatforms(d.platforms);
        setAgentTree(prev => prev.map(n => n.role.startsWith('ba-') || n.role === 'build-agent' ? { ...n, status: 'done' } : n));
        addChat('assistant', `All ${d.platforms.length} platforms deployed. You can preview and customize each one.`, 'agent:done');
        setPhase('platforms');
      }
    } catch (e) {
      addChat('assistant', 'Build error: ' + e.message, 'agent:error');
    }
  }

  async function handlePlatformChat() {
    if (!platformChatInput.trim() || !activePlatformChat) return;
    const msg = platformChatInput;
    setPlatformChatInput('');
    setPlatformChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setPlatformChatLoading(true);
    try {
      const r = await fetch(`/api/demo/platforms/${activePlatformChat.sandboxId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const d = await r.json();
      setPlatformChatHistory(prev => [...prev, { role: 'assistant', content: d.message || d.error || 'Done.' }]);
    } catch (e) {
      setPlatformChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
    }
    setPlatformChatLoading(false);
  }

  async function handleProposeWorkers() {
    setProposingWorkers(true);
    addChat('assistant', `Spawning ${deployedPlatforms.length} parallel Worker Proposal Agents — one per platform...`, 'agent:analyze');
    // Add sub-agents for each platform
    setAgentTree(prev => {
      const parent = prev.find(n => n.role === 'worker-proposal-agent') || { id: 'wpa-root-' + Date.now(), name: 'Worker Proposal Agent', icon: '🤖', role: 'worker-proposal-agent', parentId: null, status: 'running', task: 'Propose workers' };
      const already = prev.some(n => n.role === 'worker-proposal-agent');
      const subs = deployedPlatforms.map((p, i) => ({
        id: `wpa-sub-${Date.now()}-${i}`, name: `${p.name} Worker Agent`, icon: '⚙️',
        role: `worker-agent-${p.id}`, parentId: parent.id, status: 'running', task: `Design worker for ${p.name}`,
      }));
      return already ? [...prev, ...subs] : [...prev, parent, ...subs];
    });
    try {
      const r = await fetch('/api/demo/workers/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms: deployedPlatforms }),
      });
      const d = await r.json();
      if (d.workers) {
        setWorkers(d.workers);
        setPhase('workers');
        setAgentTree(prev => prev.map(n => n.role.startsWith('worker-agent-') ? { ...n, status: 'done' } : n.role === 'worker-proposal-agent' ? { ...n, status: 'done' } : n));
        const redelegated = d.workers.filter(w => w.redelegated).length;
        const summary = redelegated > 0
          ? `${d.workers.length} workers proposed (${redelegated} re-delegated via fallback). Click "View Worker →" to configure each.`
          : `${d.workers.length} workers proposed by parallel agents. Click "View Worker →" to configure each via chat.`;
        addChat('assistant', summary, 'agent:done');
      }
    } catch (e) {
      addChat('assistant', 'Proposal error: ' + e.message, 'agent:error');
    }
    setProposingWorkers(false);
  }

  async function handleDeployWorker(w) {
    setDeployingWorker(w.id);
    try {
      const r = await fetch('/api/demo/workers/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, worker: w, realClient: realClientActive ? { name: clientName, email: clientEmail, phone: clientPhone } : null }),
      });
      const d = await r.json();
      setWorkers(prev => prev.map(wk => wk.id === w.id ? { ...wk, status: d.status || 'deployed', pid: d.pid } : wk));
      addChat('assistant', `Worker "${w.name}" deployed. ${d.message || ''}`, 'agent:done');
    } catch (e) {
      addChat('assistant', 'Deploy error: ' + e.message, 'agent:error');
    }
    setDeployingWorker(null);
  }

  async function handleRunWorker(w) {
    try {
      const r = await fetch(`/api/demo/workers/${w.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const d = await r.json();
      addChat('assistant', `Worker "${w.name}" triggered. ${d.result || ''}`, 'agent:done');
      fetchWorkerLogs(w.id);
    } catch (e) {}
  }

  async function fetchWorkerLogs(wid) {
    try {
      const r = await fetch(`/api/demo/workers/${wid}/logs?sessionId=${sessionId}`);
      const d = await r.json();
      setWorkerLogs(prev => ({ ...prev, [wid]: d.logs || [] }));
    } catch {}
  }

  function handleChatInput(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleOrchestratorMessage();
    }
  }

  async function handleOrchestratorMessage() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    addChat('user', msg);
    setLoading(true);

    try {
      const r = await fetch('/api/demo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: msg }),
      });
      const d = await r.json();
      const action = d.action || { type: 'none', params: {} };

      // Update resource usage display
      if (d.usage) setUsage(d.usage);

      // Build agent delegation tree
      if (d.plan && d.plan.length > 0) {
        const orch = { id: 'orchestrator-' + Date.now(), name: 'Orchestrator', icon: '🧠', role: 'orchestrator', parentId: null, status: 'done', task: msg };
        const children = d.plan.map((s, i) => ({
          id: `agent-${Date.now()}-${i}`,
          name: s.agent || `Agent ${i+1}`,
          icon: s.agent?.includes('Research') ? '🔍' : s.agent?.includes('Build') ? '🏗️' : s.agent?.includes('Worker') ? '🤖' : '⚙️',
          role: (s.agent || '').toLowerCase().replace(/\s+/g, '-'),
          parentId: orch.id,
          status: 'pending',
          task: s.task,
          step: s.step,
        }));
        setAgentTree([orch, ...children]);
        const planText = d.plan.map(s => `${s.step}. ${s.task} → ${s.agent}`).join('\n');
        addChat('assistant', `Task decomposition:\n${planText}`, 'agent:plan');
      }

      // Show orchestrator's reply first
      if (d.message) addChat('assistant', d.message, 'agent:orchestrator');

      // Execute the decided action
      function markAgent(role, status, subAgents) {
        setAgentTree(prev => {
          let updated = prev.map(n => n.role === role ? { ...n, status } : n);
          if (subAgents) {
            const parent = updated.find(n => n.role === role);
            if (parent) {
              const subs = subAgents.map((sa, i) => ({
                id: `sub-${Date.now()}-${i}`, name: sa.name, icon: sa.icon || '🔧',
                role: sa.role, parentId: parent.id, status: sa.status || 'running', task: sa.task,
              }));
              updated = [...updated, ...subs];
            }
          }
          return updated;
        });
      }

      if (action.type === 'full_setup') {
        const company = action.params?.company || msg;
        setLoading(false);
        markAgent('orchestrator', 'delegating');
        addChat('assistant', 'Starting full setup — delegating to Research Agent...', 'agent:orchestrator');
        await handleResearch(company);
        return;
      } else if (action.type === 'start_research') {
        const company = action.params?.company || msg;
        setLoading(false);
        markAgent('research-agent', 'running');
        handleResearch(company);
        return;
      } else if (action.type === 'build_platforms') {
        setLoading(false);
        markAgent('build-agent', 'running');
        handleBuildPlatforms();
        return;
      } else if (action.type === 'propose_workers') {
        setLoading(false);
        markAgent('worker-proposal-agent', 'running');
        handleProposeWorkers();
        return;
      } else if (action.type === 'modify_platforms') {
        const { add = [], remove = [] } = action.params || {};
        setPlatforms(prev => {
          let updated = prev.map(p =>
            remove.map(r => r.toLowerCase()).some(r => p.name.toLowerCase().includes(r) || p.id.includes(r))
              ? { ...p, selected: false }
              : remove.length && add.map(a => a.toLowerCase()).some(a => p.name.toLowerCase().includes(a) || p.id.includes(a))
              ? { ...p, selected: true }
              : p
          );
          add.forEach(name => {
            const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            if (!updated.find(p => p.id === id || p.name.toLowerCase() === name.toLowerCase())) {
              updated = [...updated, { id, name, reason: 'Added by user', selected: true, custom: true }];
            }
          });
          return updated;
        });
      }
    } catch (e) {
      addChat('assistant', 'Error: ' + e.message, 'agent:error');
    }
    setLoading(false);
  }

  function setClientData() {
    if (clientName || clientEmail || clientPhone) {
      setRealClientActive(true);
      addChat('assistant', `Real client data set: ${clientName} (${clientEmail}). Workers will use this contact.`, 'agent:info');
    }
  }

  function newSession() {
    if (typeof window !== 'undefined') localStorage.removeItem('hw-demo-session');
    setSessionId(null);
    setPhase('start');
    setChat([{ role: 'assistant', content: 'New session started. Enter a company name to begin.' }]);
    setCompany(null);
    setPlatforms([]);
    setDeployedPlatforms([]);
    setWorkers([]);
    setBuildProgress({});
    setRealClientActive(false);
    setAgentTree([]);
    initSession();
  }

  return (
    <div style={{ fontFamily: T.ui, background: T.bg, color: T.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Nav */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: T.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>H-Demo</span>
          <span style={{ color: T.muted, fontSize: '0.7rem', fontFamily: T.mono }}>AI Back-Office Simulator</span>
          {sessionId && <Badge color={T.faint} style={{ color: T.muted }}>{sessionId.slice(0, 8)}</Badge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Phase indicator — clickable navigation */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {PHASES.filter(p => p !== 'start').map((p, i, arr) => {
              const phaseIdx = PHASES.indexOf(phase);
              const thisIdx = PHASES.indexOf(p);
              const isActive = phase === p;
              const isDone = phaseIdx > thisIdx;
              const canNav = isDone || isActive;
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <div
                    onClick={() => canNav && setPhase(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.5rem', borderRadius: T.radius,
                      background: isActive ? T.text : isDone ? 'rgba(108,239,160,0.15)' : 'transparent',
                      border: isActive ? 'none' : isDone ? `1px solid rgba(108,239,160,0.4)` : '1px solid transparent',
                      cursor: canNav ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? '#fff' : isDone ? T.mint : T.faint,
                    }} />
                    <span style={{ fontSize: '0.6rem', fontFamily: T.mono, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : isDone ? T.mint : T.muted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{phaseLabel(p)}</span>
                  </div>
                  {i < arr.length - 1 && <span style={{ color: T.faint, fontSize: '0.75rem' }}>›</span>}
                </div>
              );
            })}
          </div>
          <Btn ghost small onClick={() => setShowSessions(s => !s)}>Sessions</Btn>
          <Btn ghost small onClick={newSession}>New Session</Btn>
        </div>
      </div>
      {showSessions && (
        <SessionListPanel
          currentId={sessionId}
          onClose={() => setShowSessions(false)}
          onDelete={(id) => {
            if (id === sessionId) newSession();
          }}
          onSelect={async (id) => {
            if (id === sessionId) return;
            const r = await fetch(`/api/demo/session/${id}`);
            if (!r.ok) return;
            const d = await r.json();
            if (typeof window !== 'undefined') localStorage.setItem('hw-demo-session', id);
            setSessionId(id);
            setAgentTree([]);
            restoreFromSession(d);
          }}
        />
      )}

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANEL */}
        <div style={{ width: 380, display: 'flex', flexDirection: 'column', borderRight: T.border, background: T.card, flexShrink: 0 }}>
          {/* Platform agent chat overlay */}
          {activePlatformChat ? (
            <PlatformAgentPanel
              platform={activePlatformChat}
              history={platformChatHistory}
              input={platformChatInput}
              setInput={setPlatformChatInput}
              onSend={handlePlatformChat}
              loading={platformChatLoading}
              onBack={() => { setActivePlatformChat(null); setPlatformChatHistory([]); }}
            />
          ) : (
            <>
              {/* Chat history */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chat.map((m, i) => <ChatBubble key={i} msg={m} />)}
                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div style={{ borderTop: T.border, padding: '0.75rem 1rem' }}>
                {agentTree.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <AgentFlowHover treeNodes={agentTree} onClear={() => setAgentTree([])} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleChatInput}
                    placeholder={phase === 'start' ? 'Enter company name...' : 'Chat with orchestrator...'}
                    disabled={loading}
                    style={{
                      flex: 1, background: T.bg, border: T.border, borderRadius: T.radius,
                      padding: '0.5rem 0.75rem', fontFamily: T.mono, fontSize: '0.8rem',
                      color: T.text, outline: 'none',
                    }}
                  />
                  <Btn onClick={handleOrchestratorMessage} disabled={loading || !input.trim()} small>
                    {loading ? '...' : '→'}
                  </Btn>
                </div>

                {/* Resource usage display */}
                {(usage.tokens > 0 || power.totalWh > 0) && (
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.75rem', fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, opacity: 0.7, flexWrap: 'wrap' }}>
                    {usage.tokens > 0 && <>
                      <span>↑{usage.inputTokens || 0} ↓{usage.outputTokens || 0} tokens</span>
                      <span>{usage.requests || 0} agent calls</span>
                    </>}
                    {(power.totalWh > 0 || usage.estimatedCostUsd > 0) && (() => {
                      // Convert cost to Wh: $1 ≈ 0.0003 kWh of inference energy (rough estimate from TPU efficiency)
                      const inferWh = (usage.estimatedCostUsd || 0) * 0.3;
                      const totalWh = (power.totalWh || 0) + inferWh;
                      const label = totalWh < 0.001 ? `${(totalWh*1e6).toFixed(0)} µWh` : totalWh < 1 ? `${(totalWh*1000).toFixed(2)} mWh` : `${totalWh.toFixed(3)} Wh`;
                      return <span style={{ color: '#6CEFA0' }}>{label}{power.runs > 0 ? ` · ${power.runs} runs` : ''}</span>;
                    })()}
                  </div>
                )}

                {/* Real Client Data form */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.3rem 0' }}
                    onClick={() => setShowClientForm(!showClientForm)}
                  >
                    <span style={{ fontSize: '0.65rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Real Client Data {realClientActive && <span style={{ color: T.orange }}>● Active</span>}
                    </span>
                    <span style={{ color: T.muted, fontSize: '0.7rem' }}>{showClientForm ? '▲' : '▼'}</span>
                  </div>
                  {showClientForm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Name" style={miniInputStyle} />
                      <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" style={miniInputStyle} />
                      <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Phone" style={miniInputStyle} />
                      <Btn small onClick={setClientData}>Set as Real Client</Btn>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {phase === 'start' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ maxWidth: 480, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                  AI Back-Office Simulator
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                  Type a company name to begin
                </h1>
                <p style={{ color: T.muted, fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  The orchestrator will research the company, detect back-office platforms, build live sandboxes, and deploy AI workers — all through chat.
                </p>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                  {[
                    { icon: '🔍', label: 'Research', desc: 'AI discovers platforms' },
                    { icon: '🏗️', label: 'Build', desc: 'Live sandbox per platform' },
                    { icon: '🤖', label: 'Automate', desc: 'Workers with real triggers' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.2rem' }}>{s.label}</div>
                      <div style={{ color: T.muted, fontSize: '0.7rem' }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === 'research' && (
            <ResearchPanel
              company={company}
              platforms={platforms}
              setPlatforms={setPlatforms}
              platformSoftware={platformSoftware}
              setPlatformSoftware={setPlatformSoftware}
              summary={researchSummary}
              loading={loading}
              onBuild={handleBuildPlatforms}
              findings={researchFindings}
              citations={researchCitations}
              rawResearch={rawResearch}
            />
          )}

          {phase === 'building' && (
            <BuildingPanel progress={buildProgress} platforms={platforms.filter(p => p.selected)} />
          )}

          {(phase === 'platforms' || phase === 'workers') && deployedPlatforms.length > 0 && (
            <PlatformsCanvas
              platforms={deployedPlatforms}
              sessionId={sessionId}
              onChat={p => { setActivePlatformChat(p); setPlatformChatHistory([]); }}
              onProposeWorkers={handleProposeWorkers}
              proposing={proposingWorkers}
              showWorkers={phase === 'workers'}
              realClientActive={realClientActive}
            />
          )}

          {phase === 'workers' && workers.length > 0 && (
            <WorkersPanel
              workers={workers}
              sessionId={sessionId}
              onDeploy={handleDeployWorker}
              onRun={handleRunWorker}
              deployingWorker={deployingWorker}
              logs={workerLogs}
              fetchLogs={fetchWorkerLogs}
              activeTab={activeWorkerTab}
              setActiveTab={setActiveWorkerTab}
              realClientActive={realClientActive}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const miniInputStyle = {
  background: T.bg, border: T.border, borderRadius: T.radius,
  padding: '0.4rem 0.6rem', fontFamily: T.mono, fontSize: '0.75rem',
  color: T.text, outline: 'none', width: '100%',
};

// ── Agent Flow Graph (hover popup) ────────────────────────────────────────────
const STATUS_COLOR = { running: T.blue, done: T.mint, pending: T.muted, delegating: T.orange, error: T.red };

function AgentFlowNode({ data }) {
  const sc = STATUS_COLOR[data.status] || T.muted;
  return (
    <div style={{
      background: T.card, border: `1.5px solid ${sc}`, borderRadius: 6,
      padding: '5px 10px', minWidth: 110, maxWidth: 150,
      fontFamily: T.mono, fontSize: '0.62rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{data.icon}</span>
        <span style={{ fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc, flexShrink: 0,
          boxShadow: data.status === 'running' ? `0 0 4px ${sc}` : 'none' }} />
        <span style={{ color: sc, textTransform: 'uppercase', fontSize: '0.55rem' }}>{data.status}</span>
      </div>
      {data.task && <div style={{ color: T.muted, fontSize: '0.56rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.task}</div>}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
}

const AGENT_NODE_TYPES = { agentNode: AgentFlowNode };

function buildAgentFlow(treeNodes) {
  if (!treeNodes.length) return { nodes: [], edges: [] };
  const NODE_W = 150, NODE_H = 64, V_GAP = 70, H_GAP = 16;
  // BFS to assign depths
  const depth = {}, children = {};
  treeNodes.forEach(n => { children[n.id] = treeNodes.filter(c => c.parentId === n.id); });
  const roots = treeNodes.filter(n => !n.parentId);
  roots.forEach(n => { depth[n.id] = 0; });
  const queue = [...roots];
  while (queue.length) {
    const n = queue.shift();
    (children[n.id] || []).forEach(c => { depth[c.id] = (depth[n.id] || 0) + 1; queue.push(c); });
  }
  // Group by depth for horizontal spacing
  const byDepth = {};
  treeNodes.forEach(n => { const d = depth[n.id] || 0; (byDepth[d] = byDepth[d] || []).push(n); });
  const nodes = treeNodes.map(n => {
    const d = depth[n.id] || 0;
    const siblings = byDepth[d] || [n];
    const idx = siblings.indexOf(n);
    const total = siblings.length;
    const x = idx * (NODE_W + H_GAP) - (total * (NODE_W + H_GAP) - H_GAP) / 2 + 200;
    return { id: n.id, type: 'agentNode', position: { x, y: d * (NODE_H + V_GAP) }, data: { icon: n.icon, name: n.name, status: n.status, task: n.task } };
  });
  const edges = treeNodes.filter(n => n.parentId).map(n => ({
    id: `e-${n.parentId}-${n.id}`, source: n.parentId, target: n.id,
    style: { stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 8, height: 8, color: 'rgba(0,0,0,0.2)' },
  }));
  return { nodes, edges };
}

function AgentFlowHover({ treeNodes, onClear }) {
  const [show, setShow] = useState(false);
  const { nodes: rfNodes, edges: rfEdges } = buildAgentFlow(treeNodes);
  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  // Sync RF state when treeNodes changes
  useEffect(() => {
    const { nodes: n, edges: e } = buildAgentFlow(treeNodes);
    onNodesChange(n.map(nd => ({ type: 'reset', item: nd })));
    onEdgesChange(e.map(ed => ({ type: 'reset', item: ed })));
  }, [treeNodes]);

  const running = treeNodes.filter(n => n.status === 'running').length;
  const total = treeNodes.length;
  if (!total) return null;

  // Estimate popup height based on max depth
  const depths = treeNodes.map(n => {
    let d = 0, cur = n;
    while (cur.parentId) { cur = treeNodes.find(x => x.id === cur.parentId) || {}; d++; }
    return d;
  });
  const maxDepth = Math.max(...depths, 0);
  const popH = Math.min(420, (maxDepth + 1) * 134 + 40);
  const popW = Math.min(520, Math.max(...Object.values(
    treeNodes.reduce((acc, n) => { const d = (acc[n.id] || 0); return acc; }, {})
  ), 1) * 170 + 40, 520);

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          width: 480, height: popH,
          background: T.card, border: T.border, borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 200,
        }}>
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 6 }}>
            <button onClick={onClear} style={{ background: T.faint, border: T.border, borderRadius: 4, padding: '2px 8px', fontFamily: T.mono, fontSize: '0.58rem', cursor: 'pointer', color: T.muted }}>clear</button>
          </div>
          <ReactFlow
            nodes={nodes} edges={edges}
            nodeTypes={AGENT_NODE_TYPES}
            fitView fitViewOptions={{ padding: 0.3 }}
            nodesDraggable={false} nodesConnectable={false}
            elementsSelectable={false} zoomOnScroll={false}
            panOnDrag={false} preventScrolling={false}
            style={{ background: '#FAFAFA' }}
          >
            <Background gap={20} size={0.5} color="rgba(0,0,0,0.04)" />
          </ReactFlow>
        </div>
      )}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 99,
        background: running > 0 ? 'rgba(108,221,239,0.12)' : T.faint,
        border: `1px solid ${running > 0 ? 'rgba(108,221,239,0.4)' : 'rgba(0,0,0,0.08)'}`,
        cursor: 'default', userSelect: 'none',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: running > 0 ? T.blue : T.muted,
          boxShadow: running > 0 ? `0 0 5px ${T.blue}` : 'none', flexShrink: 0 }} />
        <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.text }}>
          {running > 0 ? `${running} agent${running > 1 ? 's' : ''} running` : `${total} agents`}
        </span>
      </div>
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '0.25rem' }}>
      {msg.tag && (
        <Badge color={
          msg.tag === 'agent:done' ? T.mint :
          msg.tag === 'agent:error' ? T.red :
          msg.tag === 'agent:build' ? T.blue :
          msg.tag === 'agent:analyze' ? T.purple :
          msg.tag === 'agent:orchestrator' ? T.orange :
          msg.tag === 'agent:plan' ? T.purple :
          T.faint
        } style={{ marginBottom: 2 }}>
          {msg.tag.replace('agent:', '')}
        </Badge>
      )}
      <div style={{
        maxWidth: '90%',
        background: isUser ? T.text : T.card,
        color: isUser ? '#fff' : T.text,
        borderRadius: T.radius,
        padding: '0.6rem 0.9rem',
        fontSize: '0.82rem',
        lineHeight: 1.5,
        boxShadow: T.shadow,
        border: isUser ? 'none' : T.border,
        fontFamily: msg.tag === 'agent:plan' ? T.mono : T.ui,
        whiteSpace: msg.tag === 'agent:plan' ? 'pre-wrap' : 'normal',
      }}>{msg.content}</div>
    </div>
  );
}

// ── Platform Agent Panel ──────────────────────────────────────────────────────
function PlatformAgentPanel({ platform, history, input, setInput, onSend, loading, onBack }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: T.border, display: 'flex', alignItems: 'center', gap: '0.75rem', background: T.faint }}>
        <Btn ghost small onClick={onBack}>← Back</Btn>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 700 }}>
            {PLATFORM_ICONS[platform.id] || '🔧'} {platform.name} Agent
          </div>
          <div style={{ fontSize: '0.62rem', color: T.muted }}>Ask to customize this platform</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {history.length === 0 && (
          <div style={{ color: T.muted, fontSize: '0.78rem', fontStyle: 'italic' }}>
            Ask me to modify this platform: "add a revenue chart", "change colors to dark", "add search bar"
          </div>
        )}
        {history.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {loading && <div style={{ color: T.muted, fontSize: '0.75rem', fontStyle: 'italic' }}>Building...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ borderTop: T.border, padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSend(); }}
          placeholder="Customize this platform..."
          style={{ ...miniInputStyle, flex: 1 }}
        />
        <Btn small onClick={onSend} disabled={loading || !input.trim()}>→</Btn>
      </div>
    </div>
  );
}


// ── Software Selector ─────────────────────────────────────────────────────────
function SoftwareSelector({ platformId, options, value, onChange }) {
  const isKnownOption = options.includes(value);
  const selectVal = (value && !isKnownOption) ? '__custom__' : (value || (options[0] || ''));
  const [customText, setCustomText] = useState(!isKnownOption && value ? value : '');

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: '0.4rem' }}>
      {options.length > 0 && (
        <select
          value={selectVal}
          onChange={e => {
            if (e.target.value === '__custom__') {
              onChange(customText || '__custom__');
            } else {
              onChange(e.target.value);
            }
          }}
          style={{ width: '100%', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.22rem 0.4rem', fontFamily: T.mono, fontSize: '0.63rem', color: T.text, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="__custom__">Custom...</option>
        </select>
      )}
      {selectVal === '__custom__' && (
        <input
          type="text"
          value={customText}
          autoFocus={options.length > 0}
          onChange={e => { setCustomText(e.target.value); onChange(e.target.value || '__custom__'); }}
          placeholder="e.g. Oracle EBS, Custom-built..."
          style={{ marginTop: options.length > 0 ? '0.3rem' : 0, width: '100%', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.22rem 0.4rem', fontFamily: T.mono, fontSize: '0.63rem', color: T.text, outline: 'none', boxSizing: 'border-box' }}
        />
      )}
    </div>
  );
}

// ── Research Panel ────────────────────────────────────────────────────────────
function ResearchPanel({ company, platforms, setPlatforms, platformSoftware, setPlatformSoftware, summary, loading, onBuild, findings, citations, rawResearch }) {
  const [addingPlatform, setAddingPlatform] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');

  function addCustomPlatform() {
    const name = newPlatformName.trim();
    if (!name) return;
    const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setPlatforms(prev => [...prev, { id, name, reason: 'Custom platform added by user', actual_software: name, selected: true, custom: true }]);
    setNewPlatformName('');
    setAddingPlatform(false);
  }
  if (loading || !company) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
        <div style={{ fontFamily: T.mono, fontSize: '0.8rem', color: T.muted }}>Researching company intelligence...</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: T.blue, animation: `pulse ${0.6 + i * 0.2}s ease-in-out infinite alternate` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    );
  }

  const selectedCount = platforms.filter(p => p.selected).length;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
      {/* Company card */}
      <div style={{ flex: '0 0 260px' }}>
        <SectionLabel>Company Intelligence</SectionLabel>
        <div style={{ background: T.card, borderRadius: T.radius, padding: '1.25rem', boxShadow: T.shadow, border: T.border }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{company.name}</div>
          <div style={{ color: T.muted, fontSize: '0.78rem', marginBottom: '1rem' }}>{company.domain}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Industry', value: company.industry },
              { label: 'Size', value: company.size },
              { label: 'Domain', value: company.domain },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: T.muted }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
          {company.description && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.74rem', color: T.muted, lineHeight: 1.5, borderTop: T.border, paddingTop: '0.75rem' }}>
              {company.description}
            </div>
          )}
          {findings && findings.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: T.border, paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Key Findings</div>
              {findings.map((f, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: T.text, lineHeight: 1.5, marginBottom: '0.3rem', display: 'flex', gap: '0.4rem' }}>
                  <span style={{ color: T.blue, flexShrink: 0 }}>›</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
          {citations && citations.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: T.border, paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Sources</div>
              {citations.slice(0, 4).map((c, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: T.muted, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={typeof c === 'string' ? c : c.url} target="_blank" rel="noreferrer" style={{ color: T.blue, textDecoration: 'none' }}>
                    {typeof c === 'string' ? c.replace(/^https?:\/\//, '').slice(0, 50) : (c.title || c.url || '').slice(0, 50)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform selection */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <SectionLabel>Detected Back-Office Platforms</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {platforms.map(p => (
            <div
              key={p.id}
              style={{
                background: T.card, borderRadius: T.radius, padding: '0.75rem 1rem',
                boxShadow: T.shadow, border: p.selected ? `2px solid ${PLATFORM_COLORS[p.id] || T.blue}` : T.border,
                cursor: 'pointer', transition: 'border 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
              onClick={() => setPlatforms(prev => prev.map(pl => pl.id === p.id ? { ...pl, selected: !pl.selected } : pl))}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${p.selected ? PLATFORM_COLORS[p.id] || T.blue : 'rgba(0,0,0,0.15)'}`,
                background: p.selected ? PLATFORM_COLORS[p.id] || T.blue : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {p.selected && <span style={{ color: '#fff', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: '1rem' }}>{PLATFORM_ICONS[p.id] || '🔧'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: T.muted }}>{p.reason}</div>
                <SoftwareSelector
                  platformId={p.id}
                  options={PLATFORM_SOFTWARE_OPTIONS[p.id] || []}
                  value={platformSoftware[p.id] || ''}
                  onChange={val => setPlatformSoftware(prev => ({ ...prev, [p.id]: val }))}
                />
              </div>
              <Badge color={p.selected ? PLATFORM_COLORS[p.id] || T.blue : T.faint}>
                {p.selected ? 'Selected' : 'Skip'}
              </Badge>
            </div>
          ))}
        </div>
        {/* Add custom platform */}
        <div style={{ marginTop: '0.5rem' }}>
          {addingPlatform ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                autoFocus
                value={newPlatformName}
                onChange={e => setNewPlatformName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomPlatform(); if (e.key === 'Escape') setAddingPlatform(false); }}
                placeholder="e.g. Warehouse Management, Billing, POS..."
                style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.45rem 0.7rem', color: T.text, fontFamily: T.mono, fontSize: '0.78rem', outline: 'none' }}
              />
              <button onClick={addCustomPlatform} style={{ ...S?.btn, background: T.blue, color: '#fff', border: 'none', borderRadius: T.radius, padding: '0.45rem 0.9rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.75rem' }}>Add</button>
              <button onClick={() => setAddingPlatform(false)} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '0.45rem 0.7rem', cursor: 'pointer', color: T.muted, fontFamily: T.mono, fontSize: '0.75rem' }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingPlatform(true)}
              style={{ width: '100%', background: 'transparent', border: `1px dashed ${T.muted}`, borderRadius: T.radius, padding: '0.5rem', color: T.muted, fontFamily: T.mono, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}>
              + Add custom platform
            </button>
          )}
        </div>

        {selectedCount > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <Btn onClick={onBuild} style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}>
              Build {selectedCount} Platform{selectedCount !== 1 ? 's' : ''} →
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Building Panel ────────────────────────────────────────────────────────────
function BuildingPanel({ progress, platforms }) {
  return (
    <div>
      <SectionLabel>Building Platform Sandboxes</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {platforms.map(p => {
          const prog = progress[p.id] || { status: 'queued', progress: 0 };
          return (
            <div key={p.id} style={{ background: T.card, borderRadius: T.radius, padding: '1rem 1.25rem', boxShadow: T.shadow, border: T.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{PLATFORM_ICONS[p.id] || '🔧'}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                </div>
                <Badge color={
                  prog.status === 'done' ? T.mint :
                  prog.status === 'building' ? T.blue :
                  prog.status === 'error' ? T.red : T.faint
                }>{prog.status}</Badge>
              </div>
              <ProgressBar value={prog.progress || (prog.status === 'done' ? 100 : prog.status === 'building' ? 60 : 15)} color={PLATFORM_COLORS[p.id] || T.blue} />
              {prog.message && <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: T.muted }}>{prog.message}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: T.muted, fontFamily: T.mono }}>
        Building shared SQLite database + Express sandboxes on worker-1...
      </div>
    </div>
  );
}

// ── Platforms Canvas ──────────────────────────────────────────────────────────
function PlatformsCanvas({ platforms, sessionId, onChat, onProposeWorkers, proposing, showWorkers, realClientActive }) {
  const [highlighted, setHighlighted] = useState(null);
  const [expandedFrame, setExpandedFrame] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <SectionLabel style={{ marginBottom: 0 }}>Platform Canvas</SectionLabel>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {realClientActive && <Badge color={T.orange}>⚡ Real Client Active</Badge>}
          {!showWorkers && (
            <Btn onClick={onProposeWorkers} disabled={proposing} small color={T.purple}>
              {proposing ? 'Analyzing...' : '→ Propose Workers'}
            </Btn>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
        {platforms.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            sessionId={sessionId}
            highlighted={highlighted === p.id}
            expanded={expandedFrame === p.id}
            onHighlight={() => setHighlighted(highlighted === p.id ? null : p.id)}
            onExpand={() => setExpandedFrame(expandedFrame === p.id ? null : p.id)}
            onChat={() => onChat(p)}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ platform, sessionId, highlighted, expanded, onHighlight, onExpand, onChat }) {
  const color = PLATFORM_COLORS[platform.id] || T.blue;
  const frameHeight = expanded ? 600 : 300;
  const proxyUrl = sessionId && platform.url
    ? `/api/demo/platform-proxy/${sessionId}/${platform.id}/`
    : null;

  return (
    <div style={{
      background: T.card, borderRadius: T.radius,
      border: highlighted ? `2px solid ${color}` : T.border,
      boxShadow: highlighted ? `0 0 0 4px ${color}22, ${T.shadow}` : T.shadow,
      overflow: 'hidden', transition: 'all 0.2s',
      gridColumn: expanded ? 'span 2' : 'span 1',
    }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: T.border }}>
        <span style={{ fontSize: '1rem' }}>{PLATFORM_ICONS[platform.id] || '🔧'}</span>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', flex: 1 }}>{platform.name}</span>
        <Badge color={
          platform.status === 'deployed' || platform.status === 'ready' ? T.mint :
          platform.status === 'building' || platform.status === 'deploying' ? T.blue :
          platform.status === 'error' ? T.red : T.faint
        }>{platform.status || 'ready'}</Badge>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <Btn ghost small onClick={onHighlight} style={{ padding: '0.2rem 0.5rem' }}>
            {highlighted ? '◉' : '○'}
          </Btn>
          <Btn ghost small onClick={onExpand} style={{ padding: '0.2rem 0.5rem' }}>
            {expanded ? '⊡' : '⊞'}
          </Btn>
          <Btn ghost small onClick={onChat}>Chat</Btn>
        </div>
      </div>

      {/* Iframe preview */}
      {platform.url ? (
        <div style={{ background: '#f8f8f8', position: 'relative', overflow: 'hidden', height: frameHeight }}>
          <iframe
            src={proxyUrl || platform.url}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={platform.name}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        <div style={{ height: frameHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.faint }}>
          <div style={{ textAlign: 'center', color: T.muted }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{PLATFORM_ICONS[platform.id] || '🔧'}</div>
            <div style={{ fontSize: '0.75rem', fontFamily: T.mono }}>
              {platform.status === 'building' ? 'Building...' : 'No preview available'}
            </div>
            {platform.status === 'building' && (
              <div style={{ marginTop: '0.5rem', width: 120 }}>
                <ProgressBar value={50} color={color} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {platform.url && (
        <div style={{ padding: '0.5rem 1rem', borderTop: T.border, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontFamily: T.mono, color: T.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {platform.url}
          </span>
          <a href={platform.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', fontFamily: T.mono, color: T.blue, textDecoration: 'none' }}>
            Open ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ── Workers Panel ─────────────────────────────────────────────────────────────
function WorkersPanel({ workers, sessionId, onDeploy, onRun, deployingWorker, logs, fetchLogs, activeTab, setActiveTab, realClientActive }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <SectionLabel style={{ marginBottom: 0 }}>AI Workers</SectionLabel>
        {realClientActive && <Badge color={T.orange}>⚡ Real Client Active</Badge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
        {workers.map(w => (
          <WorkerCard
            key={w.id}
            worker={w}
            sessionId={sessionId}
            onDeploy={() => onDeploy(w)}
            onRun={() => { onRun(w); fetchLogs(w.id); }}
            deploying={deployingWorker === w.id}
            realClientActive={realClientActive}
          />
        ))}
      </div>
    </div>
  );
}

const SKILL_ICONS = {
  'query-platform': '🔍', 'generate-report': '🤖', 'send-notification': '📤',
  'call-webhook': '🔗', 'run-script': '⚙️', 'transform-data': '🔄',
  'condition': '🔀', 'wait': '⏱️',
};
const TRIGGER_ICONS = { schedule: '⏰', webhook: '🔗', manual: '▶️', message: '💬', 'platform-event': '📡' };

function WorkerCard({ worker, sessionId, onDeploy, onRun, deploying, realClientActive }) {
  const trigger = worker.trigger || {};
  const steps = worker.steps || [];
  const triggerIcon = TRIGGER_ICONS[trigger.type] || '⚡';

  return (
    <div style={{ background: T.card, borderRadius: T.radius, boxShadow: T.shadow, border: T.border, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '0.85rem 1rem', borderBottom: T.border }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.87rem', marginBottom: '0.25rem' }}>{worker.name}</div>
            <div style={{ fontSize: '0.72rem', color: T.muted, lineHeight: 1.4 }}>{worker.description}</div>
          </div>
          <Badge color={
            worker.status === 'deployed' ? T.mint :
            worker.status === 'running' ? T.blue :
            worker.status === 'error' ? T.red : T.faint
          } style={{ flexShrink: 0 }}>{worker.status || 'proposed'}</Badge>
        </div>

        {/* Trigger pill */}
        <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem' }}>{triggerIcon}</span>
          <span style={{ fontSize: '0.65rem', fontFamily: T.mono, color: T.muted }}>
            {trigger.label || (typeof worker.trigger === 'string' ? worker.trigger : trigger.type || 'manual')}
          </span>
        </div>
      </div>

      {/* Steps mini-flow */}
      {steps.length > 0 && (
        <div style={{ padding: '0.6rem 1rem', borderBottom: T.border, display: 'flex', alignItems: 'center', gap: '0.3rem', overflowX: 'auto' }}>
          {steps.map((s, i) => (
            <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <div style={{ background: T.faint, borderRadius: T.radius, padding: '0.25rem 0.5rem', fontSize: '0.62rem', fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>{SKILL_ICONS[s.skill] || '●'}</span>
                <span>{s.name || s.skill}</span>
              </div>
              {i < steps.length - 1 && <span style={{ color: T.muted, fontSize: '0.7rem' }}>›</span>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <a
          href={`/worker/${encodeURIComponent(worker.id)}?session=${sessionId}`}
          style={{ flex: 1, display: 'block', textAlign: 'center', background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.6rem', fontSize: '0.65rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text, textDecoration: 'none', cursor: 'pointer' }}
        >
          View Worker →
        </a>
        {worker.status === 'deployed' ? (
          <Btn small onClick={onRun} color={T.blue}>▶</Btn>
        ) : (
          <Btn small onClick={onDeploy} disabled={deploying} color={T.mint} style={{ color: T.text }}>
            {deploying ? '...' : 'Deploy'}
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      color: T.muted, fontSize: '0.6rem', fontFamily: T.mono,
      textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem',
      ...style,
    }}>{children}</div>
  );
}
