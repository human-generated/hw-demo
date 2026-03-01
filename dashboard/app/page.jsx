'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState('start');
  const [chat, setChat] = useState([{ role: 'assistant', content: 'Welcome to H-Demo. Enter a company name to begin your AI back-office simulation.' }]);
  const [usage, setUsage] = useState({ tokens: 0, requests: 0, estimatedCostUsd: 0 });
  const [power, setPower] = useState({ totalWh: 0, runs: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
      const r = await fetch('/api/demo/session', { method: 'POST' });
      const d = await r.json();
      if (d.sessionId) setSessionId(d.sessionId);
    } catch {}
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

    try {
      const r = await fetch('/api/demo/build-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms: selected.map(p => ({ ...p, software: platformSoftware[p.id] || p.actual_software || '' })), realClient: realClientActive ? { name: clientName, email: clientEmail, phone: clientPhone } : null }),
      });
      const d = await r.json();
      if (d.platforms) {
        setDeployedPlatforms(d.platforms);
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

      // Show delegation plan if orchestrator decomposed the task
      if (d.plan && d.plan.length > 1) {
        const planText = d.plan.map(s => `${s.step}. ${s.task} → ${s.agent}`).join('\n');
        addChat('assistant', `Task decomposition:\n${planText}`, 'agent:plan');
      }

      // Show orchestrator's reply first
      if (d.message) addChat('assistant', d.message, 'agent:orchestrator');

      // Execute the decided action
      if (action.type === 'full_setup') {
        // Multi-step: research → build → propose workers (sequential delegation chain)
        const company = action.params?.company || msg;
        setLoading(false);
        addChat('assistant', 'Starting full setup — delegating to Research Agent...', 'agent:orchestrator');
        await handleResearch(company);
        // handleResearch sets phase to 'research'; build and propose triggered by subsequent orchestrator calls
        return;
      } else if (action.type === 'start_research') {
        const company = action.params?.company || msg;
        setLoading(false);
        handleResearch(company);
        return;
      } else if (action.type === 'build_platforms') {
        setLoading(false);
        handleBuildPlatforms();
        return;
      } else if (action.type === 'propose_workers') {
        setLoading(false);
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
    setSessionId(null);
    setPhase('start');
    setChat([{ role: 'assistant', content: 'New session started. Enter a company name to begin.' }]);
    setCompany(null);
    setPlatforms([]);
    setDeployedPlatforms([]);
    setWorkers([]);
    setBuildProgress({});
    setRealClientActive(false);
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
          {/* Phase indicator */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {PHASES.map((p, i) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: phase === p ? T.text : (PHASES.indexOf(phase) > i ? T.mint : T.faint),
                  transition: 'background 0.3s',
                }} />
                <span style={{ fontSize: '0.6rem', fontFamily: T.mono, color: phase === p ? T.text : T.muted, textTransform: 'uppercase' }}>{phaseLabel(p)}</span>
                {i < PHASES.length - 1 && <span style={{ color: T.faint, fontSize: '0.8rem' }}>›</span>}
              </div>
            ))}
          </div>
          <Btn ghost small onClick={newSession}>New Session</Btn>
        </div>
      </div>

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
                      <span style={{ color: T.orange }}>${(usage.estimatedCostUsd || 0).toFixed(4)}</span>
                    </>}
                    {power.totalWh > 0 && (
                      <span style={{ color: '#6CEFA0' }}>⚡ {(power.totalWh * 1000).toFixed(3)} mWh · {power.runs || 0} runs</span>
                    )}
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
