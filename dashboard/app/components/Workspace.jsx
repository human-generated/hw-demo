'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import { MeshGradient, LiquidMetal, FlutedGlass } from '@paper-design/shaders-react';
import { WordsStagger } from './WordsStagger';
import { DockIcons } from './DockIcons';
import { PlatformPreviewCard } from './WorkerPage';
import { getWorkerPhoto, getWorkerCode } from './WorkerConfig';

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

// Hub phase constants
const P = {
  RESEARCH: 'research',
  TILES_READY: 'tiles-ready',
  PLATFORMS_PROPOSED: 'platforms-proposed',
  PLATFORMS_BUILDING: 'platforms-building',
  PLATFORMS_BUILT: 'platforms-built',
  WORKFLOW_CHECK: 'workflow-check',
  WORKERS_PROPOSED: 'workers-proposed',
  WORKERS_DEPLOYING: 'workers-deploying',
  WORKERS_BUILT: 'workers-built',
};

function Spinner({ size = 28, msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1.25rem 1.5rem' }}>
      <div style={{ width: size, height: size, border: `2.5px solid rgba(52,199,89,0.2)`, borderTopColor: '#34c759', borderRadius: '50%', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
      {msg && <span style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>{msg}</span>}
    </div>
  );
}

function SectionHead({ label, badge, sub }) {
  return (
    <div style={{ padding: '1rem 1.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      {badge && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#34c759', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge}</span>}
      {sub && <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.3)', marginLeft: 'auto' }}>{sub}</span>}
    </div>
  );
}

const SKILL_META = {
  'query-platform':    { label: 'Query',     bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  'condition':         { label: 'If',        bg: 'rgba(245,158,11,0.12)',  color: '#b45309' },
  'transform-data':    { label: 'Transform', bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  'send-notification': { label: 'Notify',    bg: 'rgba(34,197,94,0.12)',   color: '#15803d' },
  'generate-report':   { label: 'AI Report', bg: 'rgba(99,102,241,0.12)', color: '#4338ca' },
  'call-webhook':      { label: 'Webhook',   bg: 'rgba(20,184,166,0.12)', color: '#0f766e' },
  'run-script':        { label: 'Script',    bg: 'rgba(249,115,22,0.12)', color: '#c2410c' },
  'wait':              { label: 'Wait',      bg: 'rgba(107,114,128,0.1)', color: '#4b5563' },
};
const TRIGGER_META = {
  'schedule':       { icon: '⏱', label: 'Scheduled' },
  'webhook':        { icon: '⚡', label: 'Webhook' },
  'message':        { icon: '💬', label: 'Message' },
  'platform-event': { icon: '📡', label: 'Event' },
  'manual':         { icon: '▶', label: 'Manual' },
};

function SkillPill({ skill, name }) {
  const m = SKILL_META[skill] || { label: skill, bg: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.5)' };
  return (
    <span title={name} style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: m.bg, color: m.color, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
      {m.label}
    </span>
  );
}

function WorkerProposalCard({ worker, selected, onToggle }) {
  const photo = getWorkerPhoto(worker, 0);
  const wfs = worker.workflows || [];
  const steps = worker.steps || [];

  return (
    <div style={{
      background: selected ? 'rgba(52,199,89,0.05)' : 'rgba(255,255,255,0.65)',
      border: `1px solid ${selected ? 'rgba(52,199,89,0.28)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 13, overflow: 'hidden', transition: 'all 0.15s',
    }}>
      {/* Header */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.9rem', cursor: 'pointer' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, border: '1px solid rgba(0,0,0,0.07)', background: '#f0f0f0', backgroundImage: photo ? `url(${photo})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a' }}>{worker.name}</div>
          <div style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.role || worker.description}</div>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? '#34c759' : 'rgba(0,0,0,0.15)'}`, background: selected ? '#34c759' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>

      {/* Workflows + pipeline */}
      {(wfs.length > 0 || steps.length > 0) && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '0.5rem 0.9rem 0.75rem' }}>
          {/* Workflow rows */}
          {wfs.map((wf, i) => {
            const trig = TRIGGER_META[wf.trigger] || { icon: '▶', label: wf.trigger || 'Manual' };
            // Distribute steps across workflows proportionally
            const chunk = Math.max(1, Math.ceil(steps.length / Math.max(1, wfs.length)));
            const wfSteps = steps.slice(i * chunk, (i + 1) * chunk);
            const sharedSteps = wfSteps.length > 0 ? wfSteps : steps;
            return (
              <div key={i} style={{ marginBottom: i < wfs.length - 1 ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem' }}>{trig.icon}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#1a1a1a', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</span>
                  <span style={{ fontSize: '0.58rem', color: 'rgba(0,0,0,0.35)', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{trig.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', paddingLeft: 18 }}>
                  {sharedSteps.map((s, j) => (
                    <React.Fragment key={j}>
                      <SkillPill skill={s.skill} name={s.name} />
                      {j < sharedSteps.length - 1 && <span style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.18)', userSelect: 'none' }}>›</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Fallback: no workflows, just show step pipeline */}
          {wfs.length === 0 && steps.length > 0 && (
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(0,0,0,0.35)', marginBottom: 4 }}>Pipeline</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                {steps.map((s, j) => (
                  <React.Fragment key={j}>
                    <SkillPill skill={s.skill} name={s.name} />
                    {j < steps.length - 1 && <span style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.18)' }}>›</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BuiltWorkerCard({ worker, onOpen }) {
  const photo = getWorkerPhoto(worker, 0);
  const statusColor = worker.status === 'deployed' || worker.status === 'running' ? '#34c759' : '#ff9500';
  return (
    <div onClick={() => onOpen?.(worker)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
      background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 12, cursor: 'pointer', transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f4f5f7', backgroundImage: photo ? `url(${photo})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,0.07)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>{(worker.workflows || []).length} workflow{(worker.workflows || []).length !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: '0.68rem', fontWeight: 500, color: statusColor, textTransform: 'capitalize' }}>{worker.status || 'Active'}</span>
      </div>
    </div>
  );
}

export function Workspace({
  companyName = '',
  company = null,
  researchSummary = '',
  researchFindings = [],
  anamClient = null,
  cameraStream = null,
  avatarStream = null,
  onOpenWorkerProfile,
  onGoHome,
  onGoCall,
  onGoHub,
  onGoWorkers,
  onGoPlatforms,
  onGoAbout,
  sessionId,
  onBackToDashboard,
  onWorkersBuilt,
  onCompanyName,
}) {
  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, author: 'ALEXANDRA', text: companyName ? `Starting research on ${companyName}…` : `What company are we presenting to today?`, time: 'Just now', isUser: false },
  ]);
  const [orchestratorLoading, setOrchestratorLoading] = useState(false);

  // ── Anam/call state ────────────────────────────────────────────────────────
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(!!cameraStream);
  const [callStartTime, setCallStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [avatarMuted, setAvatarMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  // ── Briefing / knowledge panel ─────────────────────────────────────────────
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingSources, setBriefingSources] = useState([{ type: 'text', value: '' }]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptGenerating, setPromptGenerating] = useState(false);
  const customPromptRef = useRef(''); // ref so Anam closure always reads latest value

  // ── Demo Fix chat ──────────────────────────────────────────────────────────
  const [fixOpen, setFixOpen] = useState(false);
  const [fixInput, setFixInput] = useState('');
  const [fixMessages, setFixMessages] = useState([]);
  const [fixRunning, setFixRunning] = useState(false);
  const fixBottomRef = useRef(null);

  // ── Hub flow state ─────────────────────────────────────────────────────────
  const [hubPhase, setHubPhase] = useState(P.RESEARCH);
  const [tilesData, setTilesData] = useState(null);
  const [tilesLoading, setTilesLoading] = useState(false);
  const [proposedPlatforms, setProposedPlatforms] = useState([]);
  const [builtPlatforms, setBuiltPlatforms] = useState([]);
  const [platformFeedback, setPlatformFeedback] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [proposedWorkers, setProposedWorkers] = useState([]);
  const [builtWorkers, setBuiltWorkers] = useState([]);
  const [workerFeedback, setWorkerFeedback] = useState('');
  const [buildingMsg, setBuildingMsg] = useState('');
  const [editingWorkflow, setEditingWorkflow] = useState(null); // { wf, worker }
  const [wfEditText, setWfEditText] = useState('');
  const [expandedTiles, setExpandedTiles] = useState({});
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotMsg, setAutopilotMsg] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [wfCheckProgress, setWfCheckProgress] = useState([]); // [{name, status}]
  const [contextApiData, setContextApiData] = useState(null); // { title, description, apiUrl, context }
  const [deployStatus, setDeployStatus] = useState(null); // { status, standaloneUrl, platforms }
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [vercelTokenInput, setVercelTokenInput] = useState('');

  const anamClientRef = useRef(anamClient);
  const cameraStreamRef = useRef(cameraStream);
  const cameraVideoRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  const msgSeqRef = useRef(2);
  const chatEndRef = useRef(null);
  const researchTriggered = useRef(false);
  const rightPanelRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Anam connection ────────────────────────────────────────────────────────
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
        attachSubtitleListener(anamClientRef.current);
        if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        const videoEl = document.getElementById('ws-avatar-video');
        if (videoEl && avatarStream) {
          videoEl.srcObject = avatarStream;
          videoEl.muted = false;
          videoEl.play().catch(() => {});
        } else if (videoEl) {
          try { await anamClientRef.current.streamToVideoElement('ws-avatar-video'); } catch {}
        }
        return;
      }
      if (cancelled) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!cancelled) { cameraStreamRef.current = stream; setCameraOn(true); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream; }
      } catch {}
      if (cancelled) return;
      try {
        // Use session system prompt directly in personaConfig — overrides Anam dashboard persona
        const personaConfig = {
          personaId: ANAM_PERSONA_ID,
          ...(customPromptRef.current ? { systemPrompt: customPromptRef.current } : {}),
        };
        const newClient = unsafe_createClientWithApiKey(ANAM_API_KEY, personaConfig);
        anamClientRef.current = newClient;
        newClient.addListener('VIDEO_PLAY_STARTED', () => {
          if (!cancelled) { setIsConnecting(false); setIsConnected(true); setCallStartTime(Date.now()); }
        });
        attachSubtitleListener(newClient);
        await newClient.streamToVideoElement('ws-avatar-video');
      } catch (err) { console.error('Anam connection failed:', err); if (!cancelled) setIsConnecting(false); }
    }
    // Delay long enough for session data + systemPrompt to load before creating Anam client
    const timer = setTimeout(init, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!isConnected || !callStartTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - callStartTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isConnected, callStartTime]);

  // ── Session init — restore existing state, then trigger research if needed ──
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function init() {
      try {
        const [tilesRes, sessionRes] = await Promise.all([
          fetch(`/api/demo/research/${sessionId}/tiles`),
          fetch(`/api/demo/session/${sessionId}`),
        ]);
        const tilesD = await tilesRes.json();
        const sessionD = await sessionRes.json();
        if (cancelled) return;

        if (sessionD.telegramInviteLink) setTelegramLink(sessionD.telegramInviteLink);
        // Load standalone deploy status
        if (sessionD.deployStandalone) setDeployStatus(sessionD.deployStandalone);

        // Restore saved system prompt immediately (before Anam call fires VIDEO_PLAY_STARTED)
        const savedPrompt = sessionD.settings?.systemPrompt;
        if (savedPrompt) {
          setCustomPrompt(savedPrompt);
          customPromptRef.current = savedPrompt;
        }

        // Load context API (enriches prompt with live data)
        if (sessionD.contextApiUrl && !contextApiData) {
          loadContextApi(sessionD.contextApiUrl, sessionD.contextApiSummary);
        } else if (!savedPrompt && (sessionD.researchSummary || sessionD.contextApiSummary)) {
          // No saved prompt but session has research — auto-generate
          autoGeneratePrompt();
        }

        const hasTiles = !tilesD.error && (tilesD.tiles?.length > 0);
        const deployed = (sessionD.platforms || []).filter(p => p.status === 'deployed');
        const proposed = (sessionD.platforms || []);

        if (hasTiles) setTilesData(tilesD);

        if (deployed.length > 0) {
          setBuiltPlatforms(deployed);
          const workers = sessionD.workers || [];
          const deployedWorkers = workers.filter(w => w.status !== 'proposed');
          const proposedOnly = workers.filter(w => w.status === 'proposed');
          if (deployedWorkers.length > 0) { setBuiltWorkers(deployedWorkers); setHubPhase(P.WORKERS_BUILT); }
          else if (proposedOnly.length > 0) {
            setProposedWorkers(proposedOnly.map(w => ({ ...w, _selected: true })));
            // If server is still in workflow-check phase, show that UI
            if (sessionD.phase === 'workflow-check') {
              setWfCheckProgress(proposedOnly.map(w => ({ name: w.name, status: 'checking' })));
              setHubPhase(P.WORKFLOW_CHECK);
            } else {
              setHubPhase(P.WORKERS_PROPOSED);
            }
          }
          else setHubPhase(P.PLATFORMS_BUILT);
          researchTriggered.current = true;
          return;
        }

        if (proposed.length > 0 && hasTiles) {
          setProposedPlatforms(proposed.map(p => ({ ...p, _selected: p.selected !== false })));
          setHubPhase(P.PLATFORMS_PROPOSED);
          researchTriggered.current = true;
          return;
        }

        // No existing data — run research if company name already known
        if (companyName && !researchTriggered.current) {
          researchTriggered.current = true;
          startResearch(companyName);
        }
      } catch {
        if (companyName && !researchTriggered.current) {
          researchTriggered.current = true;
          startResearch(companyName);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [sessionId]);

  async function startResearch(name) {
    const co = (name || companyName || '').trim();
    if (!co) return;
    setTilesLoading(true);
    addMsg('ALEXANDRA', `Researching ${co} — running deep web analysis, SEC filings, LinkedIn, news sources…`);
    try {
      const r = await fetch('/api/demo/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: co, sessionId, deep: true }),
      });
      const d = await r.json();
      if (d.company) {
        const plats = d.platforms || [];
        setProposedPlatforms(plats.map(p => ({ ...p, _selected: p.selected !== false })));
        addMsg('ALEXANDRA', [
          `Research complete on **${d.company.name}**.`,
          d.summary || '',
          plats.length ? `Detected ${plats.length} platforms in their stack.` : '',
        ].filter(Boolean).join(' '));
      }
      // Fetch tiles after research completes
      try {
        const tr = await fetch(`/api/demo/research/${sessionId}/tiles`);
        const td = await tr.json();
        if (!td.error && td.tiles?.length > 0) setTilesData(td);
      } catch {}
      setHubPhase(P.PLATFORMS_PROPOSED);
      setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
    } catch (e) {
      addMsg('ALEXANDRA', 'Research encountered an error. Please try again.');
      console.error('Research error:', e);
    }
    setTilesLoading(false);
  }

  async function fetchSessionPlatforms() {
    try {
      const r = await fetch(`/api/demo/session/${sessionId}`);
      const d = await r.json();
      const deployed = (d.platforms || []).filter(p => p.status === 'deployed');
      if (deployed.length > 0) {
        setBuiltPlatforms(deployed);
        const workers = d.workers || [];
        if (workers.length > 0) {
          setBuiltWorkers(workers);
          setHubPhase(P.WORKERS_BUILT);
        } else {
          setHubPhase(P.PLATFORMS_BUILT);
          proposeWorkers();
        }
      } else {
        const proposed = (d.platforms || []);
        setProposedPlatforms(proposed.map(p => ({ ...p, _selected: p.selected !== false })));
        setHubPhase(P.PLATFORMS_PROPOSED);
      }
    } catch {}
  }

  async function handleBuildPlatforms() {
    const selected = proposedPlatforms.filter(p => p._selected !== false);
    if (!selected.length) return;
    setHubPhase(P.PLATFORMS_BUILDING);
    setBuildingMsg('Discovering platform APIs…');
    const t1 = setTimeout(() => setBuildingMsg('Cloning synthetic environment…'), 2000);
    const t2 = setTimeout(() => setBuildingMsg('Spinning up platform sandboxes…'), 4500);
    try {
      await fetch('/api/demo/build-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms: selected, feedback: platformFeedback }),
      });
      clearTimeout(t1); clearTimeout(t2);
      const sr = await fetch(`/api/demo/session/${sessionId}`);
      const sd = await sr.json();
      const deployed = (sd.platforms || []).filter(p => p.status === 'deployed');
      setBuiltPlatforms(deployed.length > 0 ? deployed : selected.map(p => ({ ...p, status: 'deployed' })));
      setHubPhase(P.PLATFORMS_BUILT);
      addMsg('ALEXANDRA', `Platforms are live. ${deployed.length || selected.length} environments ready. Proposing AI workers for your team now…`);
      setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
      proposeWorkers();
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2);
      console.error('Build error:', e);
      addMsg('ALEXANDRA', 'Platform build encountered an error. Please try again.');
      setHubPhase(P.PLATFORMS_PROPOSED);
    }
  }

  async function proposeWorkers() {
    try {
      const r = await fetch('/api/demo/workers/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback: workerFeedback }),
      });
      const d = await r.json();
      const workers = (d.workers || []).map(w => ({ ...w, _selected: true }));
      setProposedWorkers(workers);
      // Show workflow-check phase while server validates all workflows
      setHubPhase(P.WORKFLOW_CHECK);
      setWfCheckProgress(workers.map(w => ({ name: w.name, status: 'pending' })));
      setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
      // Poll session until server transitions phase to 'workers'
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const sr = await fetch(`/api/demo/session/${sessionId}`);
          const sd = await sr.json();
          // Update per-worker check status from refreshed worker list
          if (sd.workers?.length > 0) {
            setWfCheckProgress(sd.workers.map(w => ({
              name: w.name,
              status: sd.phase === 'workers' || sd.phase === 'workers-proposed' ? 'done' : 'checking',
            })));
          }
          if (sd.phase === 'workers' || attempts > 60) {
            clearInterval(poll);
            const finalWorkers = (sd.workers || workers).map(w => ({ ...w, _selected: true }));
            setProposedWorkers(finalWorkers);
            setHubPhase(P.WORKERS_PROPOSED);
            setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
          }
        } catch { if (attempts > 60) clearInterval(poll); }
      }, 3000);
    } catch (e) {
      console.error('Propose workers error:', e);
    }
  }

  async function handleDeployWorkers() {
    const selected = proposedWorkers.filter(w => w._selected !== false);
    if (!selected.length) return;
    setHubPhase(P.WORKERS_DEPLOYING);
    setBuildingMsg('Deploying AI workers…');
    try {
      await Promise.allSettled(selected.map(w =>
        fetch('/api/demo/workers/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, worker: w }),
        })
      ));
      const sr = await fetch(`/api/demo/session/${sessionId}`);
      const sd = await sr.json();
      const workers = sd.workers?.length > 0 ? sd.workers : selected.map(w => ({ ...w, status: 'deployed' }));
      setBuiltWorkers(workers);
      setHubPhase(P.WORKERS_BUILT);
      addMsg('ALEXANDRA', `${workers.length} AI workers are now deployed and active. You can scroll down to see them, or open any worker for details.`);
      onWorkersBuilt?.(workers);
      setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
    } catch (e) {
      console.error('Deploy workers error:', e);
      setHubPhase(P.WORKERS_PROPOSED);
    }
  }

  async function runAutopilot() {
    if (autopilot) return;
    const co = (companyName || '').trim();
    if (!co) { addMsg('ALEXANDRA', 'Please specify a company name first to start autopilot.'); return; }
    setAutopilot(true);
    researchTriggered.current = true;
    try {
      setAutopilotMsg('Researching…');
      addMsg('ALEXANDRA', `⚡ Autopilot activated for **${co}** — running full pipeline: research → platforms → workers…`);
      setTilesLoading(true);
      const resR = await fetch('/api/demo/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: co, sessionId, deep: true }),
      });
      const resD = await resR.json();
      setTilesLoading(false);
      const platforms = (resD.platforms || []).slice(0, 10).map(p => ({ ...p, _selected: true }));
      setProposedPlatforms(platforms);
      try {
        const tr = await fetch(`/api/demo/research/${sessionId}/tiles`);
        const td = await tr.json();
        if (!td.error && td.tiles?.length > 0) setTilesData(td);
      } catch {}

      setAutopilotMsg('Building platforms…');
      addMsg('ALEXANDRA', `Research complete. Building ${platforms.length} platform${platforms.length !== 1 ? 's' : ''}…`);
      setHubPhase(P.PLATFORMS_BUILDING);
      setBuildingMsg('Spinning up platform environments…');
      const buildR = await fetch('/api/demo/build-platforms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, platforms, feedback: '' }),
      });
      const buildD = await buildR.json();
      if (buildD.error) addMsg('ALEXANDRA', `⚠ Platform build warning: ${buildD.error} — continuing with proposed platforms.`);
      const sr = await fetch(`/api/demo/session/${sessionId}`);
      const sd = await sr.json();
      const deployed = (sd.platforms || []).filter(p => p.status === 'deployed');
      const builtPlatformsLocal = deployed.length > 0 ? deployed : platforms.map(p => ({ ...p, status: 'deployed' }));
      setBuiltPlatforms(builtPlatformsLocal);
      setHubPhase(P.PLATFORMS_BUILT);

      setAutopilotMsg('Proposing workers…');
      addMsg('ALEXANDRA', `${builtPlatformsLocal.length} platforms live. Generating AI worker proposals…`);
      const wrR = await fetch('/api/demo/workers/propose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback: '' }),
      });
      const wrD = await wrR.json();
      const workers = (wrD.workers || []).slice(0, 20).map(w => ({ ...w, _selected: true }));
      if (!workers.length) throw new Error('Worker proposal returned 0 workers — check server logs');
      setProposedWorkers(workers);

      setAutopilotMsg('Deploying workers…');
      addMsg('ALEXANDRA', `Deploying ${workers.length} AI worker${workers.length !== 1 ? 's' : ''}…`);
      setHubPhase(P.WORKERS_DEPLOYING);
      setBuildingMsg('Deploying AI workers…');
      await Promise.allSettled(workers.map(w =>
        fetch('/api/demo/workers/deploy', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, worker: w }),
        })
      ));
      const finalSr = await fetch(`/api/demo/session/${sessionId}`);
      const finalSd = await finalSr.json();
      const finalWorkers = finalSd.workers?.length > 0 ? finalSd.workers : workers.map(w => ({ ...w, status: 'deployed' }));
      setBuiltWorkers(finalWorkers);
      setHubPhase(P.WORKERS_BUILT);
      addMsg('ALEXANDRA', `✅ Autopilot complete! ${finalWorkers.length} AI workers deployed and ready.`);
      onWorkersBuilt?.(finalWorkers);
      setTimeout(() => rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' }), 300);
    } catch (e) {
      addMsg('ALEXANDRA', `Autopilot encountered an error: ${e.message}`);
      console.error('Autopilot error:', e);
    }
    setAutopilot(false);
    setAutopilotMsg('');
  }

  async function handleSaveWorkflow() {
    if (!editingWorkflow) return;
    const { wf, worker } = editingWorkflow;
    // Update the workflow in proposedWorkers
    setProposedWorkers(prev => prev.map(w => {
      if (w.id !== worker.id) return w;
      const updatedWfs = (w.workflows || []).map(x => x.name === wf.name || x.id === wf.id ? { ...x, name: wfEditText || x.name } : x);
      return { ...w, workflows: updatedWfs };
    }));
    // Persist via API
    try {
      await fetch(`/api/demo/workers/${worker.id}/flow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, workflowId: wf.id, changes: { name: wfEditText } }),
      });
    } catch {}
    setEditingWorkflow(null);
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/###\s+(.+)/g, '<strong style="display:block;font-size:0.82rem;margin-top:8px;margin-bottom:2px;color:#1a1a1a">$1</strong>')
      .replace(/##\s+(.+)/g, '<strong style="display:block;margin-top:6px;margin-bottom:2px">$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)/gm, '<span style="display:block;padding-left:12px">· $1</span>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }

  function addMsg(author, text) {
    setMessages(prev => [...prev, { id: ++msgSeqRef.current, author, text, time: 'Just now', isUser: author === 'YOU' }]);
  }

  const attachCamera = useCallback(el => {
    cameraVideoRef.current = el;
    if (el && cameraStreamRef.current) el.srcObject = cameraStreamRef.current;
  }, []);

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
      } catch {}
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

  async function handleGeneratePrompt() {
    const filled = briefingSources.filter(s => s.value.trim());
    if (!filled.length) return;
    setPromptGenerating(true);
    try {
      const r = await fetch(`/api/demo/session/${sessionId}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: filled }),
      });
      const d = await r.json();
      if (d.prompt) { setCustomPrompt(d.prompt); customPromptRef.current = d.prompt; }
    } catch {}
    setPromptGenerating(false);
  }

  async function handleFixChat() {
    const msg = fixInput.trim();
    if (!msg || fixRunning) return;
    setFixInput('');
    setFixRunning(true);
    const userMsg = { role: 'user', text: msg };
    const assistantMsg = { role: 'assistant', text: '' };
    setFixMessages(prev => [...prev, userMsg, assistantMsg]);
    try {
      const r = await fetch('/api/demo/fix-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: msg }),
      });
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.text) setFixMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { ...next[next.length - 1], text: next[next.length - 1].text + d.text };
              return next;
            });
            if (d.done) break;
          } catch {}
        }
      }
    } catch (e) {
      setFixMessages(prev => { const next = [...prev]; next[next.length - 1] = { ...next[next.length - 1], text: `Error: ${e.message}` }; return next; });
    }
    setFixRunning(false);
    setTimeout(() => fixBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleInterrupt() {
    // Mute + unmute rapidly to signal interruption to Anam
    const client = anamClientRef.current;
    if (!client) return;
    client.muteOutputAudio?.();
    setTimeout(() => client.unmuteOutputAudio?.(), 200);
    window.speechSynthesis?.cancel();
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || orchestratorLoading) return;
    addMsg('YOU', text);
    setChatInput('');

    // If no company name yet, treat first message as the company name
    if (!companyName && !researchTriggered.current) {
      addMsg('ALEXANDRA', `Got it — researching **${text}** now. This will take a moment…`);
      if (isConnected && anamClientRef.current) anamClientRef.current.sendUserMessage(`Research ${text} for me.`);
      researchTriggered.current = true;
      startResearch(text);
      // Propagate company name up if callback available
      onCompanyName?.(text);
      return;
    }

    if (isConnected && anamClientRef.current) {
      anamClientRef.current.sendUserMessage(text);
    }
    setOrchestratorLoading(true);
    try {
      // Prepend context API summary on first message if available
      const contextPrefix = contextApiData && !messages.some(m => m.author === 'YOU') ? `[Context: ${contextApiData.summaryHint || contextApiData.description || ''}]\n\n` : '';
      const res = await fetch('/api/demo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextPrefix + text, sessionId: sessionId || 'workspace-session' }),
      });
      const data = await res.json();
      if (data.reply || data.message) {
        addMsg('ALEXANDRA', data.reply || data.message);
      }
    } catch {}
    setOrchestratorLoading(false);
  }

  function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    const readers = files.map(f => new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res({ name: f.name, url: fr.result, type: f.type });
      fr.readAsDataURL(f);
    }));
    Promise.all(readers).then(imgs => setUploadedFiles(prev => [...prev, ...imgs]));
  }

  async function autoGeneratePrompt() {
    if (!sessionId) return;
    try {
      const r = await fetch(`/api/demo/session/${sessionId}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: [] }), // server uses session data as fallback
      });
      const d = await r.json();
      if (d.prompt) {
        setCustomPrompt(d.prompt);
        customPromptRef.current = d.prompt;
        if (anamClientRef.current) {
          setTimeout(() => anamClientRef.current?.sendUserMessage(`Context for this session: ${d.prompt}`), 300);
        }
      }
    } catch {}
  }

  async function loadContextApi(apiUrl, summaryHint) {
    try {
      // All fetches go through the server proxy to avoid CORS
      const r = await fetch(`/api/demo/context-fetch?url=${encodeURIComponent(apiUrl)}`);
      const d = await r.json();
      if (d.error) return;

      setContextApiData({ ...d, apiUrl, summaryHint });

      // Now re-generate prompt enriched with live API sample data
      // The server's generate-prompt endpoint uses contextApiSummary from the session;
      // we additionally inject the live sample into the sources
      const { sampleData, title } = d;
      const liveSample = sampleData
        ? `Live sample (4h summer visit 2025): total ${sampleData.total_kg?.toFixed(2)} kg CO2. Operational ${sampleData.operational_kg?.toFixed(2)} kg, overhead ${sampleData.overhead_kg?.toFixed(2)} kg, non-metered ${sampleData.non_metered_kg?.toFixed(2)} kg. Energy mix: ${Object.entries(sampleData.metered_by_source || {}).map(([k, v]) => `${k} ${v.total_kg?.toFixed(3)} kg`).join(', ')}.`
        : '';

      // Save enriched prompt in the UI (for display/editing) but don't re-inject into Anam —
      // the systemPrompt is already set on the Anam client at session start.
      // Only send live API data as a supplementary fact message if Anam is already connected.
      if (sessionId && liveSample) {
        const rp = await fetch(`/api/demo/session/${sessionId}/generate-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources: [{ type: 'text', value: liveSample }] }),
        });
        const dp = await rp.json();
        if (dp.prompt) {
          setCustomPrompt(dp.prompt);
          customPromptRef.current = dp.prompt;
        }
        // Inject ONLY the live data snapshot as a brief factual message (not the full persona)
        if (anamClientRef.current && liveSample) {
          setTimeout(() => anamClientRef.current?.sendUserMessage(`Live API data for this session: ${liveSample}`), 500);
        }
      }
    } catch {}
  }

  async function handleDeployStandalone(vercelToken) {
    setDeployStatus({ status: 'deploying' });
    setShowDeployModal(false);
    try {
      const r = await fetch('/api/demo/deploy-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, vercelToken: vercelToken || undefined }),
      });
      const d = await r.json();
      if (d.needsToken) { setShowDeployModal(true); setDeployStatus(null); return; }
      if (!d.ok) { setDeployStatus({ status: 'error', error: d.message || 'Deploy failed' }); return; }
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const sr = await fetch(`/api/demo/deploy-standalone?sessionId=${sessionId}`);
          const sd = await sr.json();
          if (sd.status === 'done' || sd.status === 'error') {
            clearInterval(poll);
            setDeployStatus(sd);
          }
        } catch {}
      }, 4000);
    } catch (e) {
      setDeployStatus({ status: 'error', error: e.message });
    }
  }

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
  const phaseAfter = (...phases) => phases.some(ph => [P.PLATFORMS_BUILT, P.WORKFLOW_CHECK, P.WORKERS_PROPOSED, P.WORKERS_DEPLOYING, P.WORKERS_BUILT].includes(hubPhase) || hubPhase === ph);

  return (
    <div className="ws">
      <MeshGradient
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        speed={0.19} scale={1.51} distortion={0.88} swirl={1}
        colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']}
      />

      <nav className="ws-menu">
        <div className="ws-menu-left">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: '#1a1a1a', borderRadius: 6, flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.04em', lineHeight: 1 }}>h</span>
          </div>
          <div className="ws-menu-sep" />
          <span className="ws-menu-label">Humans.AI</span>
          {tilesData?.companyName && <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginLeft: 6 }}>· {tilesData.companyName}</span>}
        </div>
        <div className="ws-menu-center">
          <DockIcons active="hub" onHome={onGoHome} onHub={onGoHub || onGoCall} onWorkers={onGoWorkers} onPlatforms={onGoPlatforms} onAbout={onGoAbout} />
        </div>
        <div className="ws-menu-right">
          {telegramLink && (
            <a href={telegramLink} target="_blank" rel="noreferrer" title="Open Telegram group" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.25)', borderRadius: 7, textDecoration: 'none', color: '#0088cc', fontSize: '0.68rem', fontWeight: 600 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.481c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.39 14.033l-2.963-.924c-.642-.204-.657-.642.136-.951l11.57-4.461c.537-.194 1.006.131.429.551z"/></svg>
              Group
            </a>
          )}
          {(hubPhase === P.RESEARCH || hubPhase === P.PLATFORMS_PROPOSED) && companyName && (
            <button onClick={runAutopilot} disabled={autopilot} title={autopilotMsg || 'Run full autopilot pipeline'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: autopilot ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 7, color: autopilot ? 'rgba(0,0,0,0.4)' : '#fff', fontSize: '0.68rem', fontWeight: 700, cursor: autopilot ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {autopilot ? `⚡ ${autopilotMsg}` : '⚡ Autopilot'}
            </button>
          )}
          {contextApiData && (
            <span title={`Context: ${contextApiData.title}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', borderRadius: 7, fontSize: '0.65rem', fontWeight: 600, color: '#2e7d32' }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="4.5"/></svg>
              Context loaded
            </span>
          )}
          {/* Deploy Standalone button */}
          {sessionId && (
            <button
              onClick={() => deployStatus?.status === 'done' ? window.open(deployStatus.standaloneUrl, '_blank') : setShowDeployModal(true)}
              title={deployStatus?.status === 'done' ? deployStatus.standaloneUrl : 'Deploy as standalone Vercel app'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: deployStatus?.status === 'done' ? 'rgba(52,199,89,0.12)' : deployStatus?.status === 'deploying' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${deployStatus?.status === 'done' ? 'rgba(52,199,89,0.3)' : 'rgba(0,0,0,0.12)'}`, borderRadius: 7, fontSize: '0.65rem', fontWeight: 600, color: deployStatus?.status === 'done' ? '#2e7d32' : 'rgba(0,0,0,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {deployStatus?.status === 'deploying' ? (
                <span style={{ width: 8, height: 8, border: '1.5px solid rgba(0,0,0,0.2)', borderTopColor: '#555', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              ) : deployStatus?.status === 'done' ? (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="4.5"/></svg>
              ) : (
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M8 1v10M4 7l4-6 4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="11" width="12" height="4" rx="1" fill="currentColor" opacity="0.3"/></svg>
              )}
              {deployStatus?.status === 'done' ? 'Deployed ↗' : deployStatus?.status === 'deploying' ? 'Deploying…' : 'Deploy'}
            </button>
          )}
          {sessionId && (
            <span onClick={() => navigator.clipboard?.writeText(sessionId).catch(() => {})} title="Click to copy session ID" style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', userSelect: 'all', letterSpacing: '0.04em' }}>{sessionId.slice(0, 16)}</span>
          )}
          <label className="wkp-nav-toggle">
            <input type="checkbox" checked={videoEnabled} onChange={e => setVideoEnabled(e.target.checked)} />
            <span className="wkp-nav-toggle-track"><span className="wkp-nav-toggle-thumb" /></span>
            <span className="wkp-nav-toggle-label">Video</span>
          </label>
          {onBackToDashboard && (
            <button onClick={onBackToDashboard} title="Back to Dashboard" className="ws-menu-btn" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className="ws-menu-avatar">S</div>
        </div>
      </nav>

      {/* Left: Alexandra badge + chat */}
      <div className="ws-left">
        <div className="ws-card">
          <div className="ws-badge">
            <div className="ws-badge-green-bg" />
            <div className="ws-badge-photo-wrap">
              <div className="ws-badge-photo" style={{
                backgroundImage: `radial-gradient(ellipse 61% 61% at 50% 39%, rgba(242,248,244,0) 0%, rgba(242,248,244,0) 30%, rgba(242,248,244,0) 65%, rgba(242,248,244,1) 100%), url(${PHOTO_URL})`,
                backgroundSize: 'auto, cover', backgroundPosition: '0% 0%, center', filter: 'contrast(1.06)',
              }} />
              <video id="ws-avatar-video" autoPlay playsInline className="ws-badge-video" style={{ display: isConnected && videoEnabled ? 'block' : 'none' }} />
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
                {/* Interrupt button */}
                <button className="ws-call-btn" onClick={handleInterrupt} disabled={!isConnected} title="Interrupt agent" style={{ background: 'rgba(255,149,0,0.9)' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="#fff" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="#fff" /></svg>
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
                <div className="ws-msg-bubble" style={{ opacity: 0.5 }}>Thinking…</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="ws-chat-input" onSubmit={handleChatSubmit}>
            <div className="ws-chat-input-wrap">
              <input className="ws-chat-input-field" placeholder="Message the orchestrator…" value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <div className="ws-send-wrap">
                <LiquidMetal className="ws-send-ring" speed={1} softness={0.1} repetition={2} shiftRed={0.3} shiftBlue={0.3} distortion={0.07} contour={0.4} scale={1.87} rotation={0} shape="diamond" angle={70} colorBack="#00000000" colorTint="#FFFFFF" style={{ backgroundColor: '#AAAAAC', borderRadius: '999px', height: '44px', width: '44px' }} />
                <button type="submit" className="ws-chat-send" aria-label="Send">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── System Prompt panel — always visible, per-demo ── */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: customPrompt ? '#1a1a1a' : 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              {customPrompt ? '✦ AI Persona' : 'AI Persona'}
            </span>
            <button
              onClick={() => autoGeneratePrompt()}
              disabled={promptGenerating}
              title="Re-generate from session research + API data"
              style={{ fontSize: '0.65rem', padding: '3px 8px', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {promptGenerating ? <span style={{ width: 8, height: 8, border: '1.5px solid rgba(0,0,0,0.2)', borderTopColor: '#555', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : '↺'}
              {promptGenerating ? 'Generating…' : 'Re-generate'}
            </button>
            <button onClick={() => setBriefingOpen(v => !v)} title="Add custom sources"
              style={{ fontSize: '0.65rem', padding: '3px 8px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.4)' }}>
              + Sources
            </button>
          </div>
          <textarea
            value={customPrompt}
            onChange={e => { setCustomPrompt(e.target.value); customPromptRef.current = e.target.value; }}
            placeholder="Describe this demo's AI persona… (auto-generated from research + APIs)"
            rows={4}
            style={{ width: '100%', fontSize: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.85)', outline: 'none', lineHeight: 1.5, color: customPrompt ? '#1a1a1a' : 'rgba(0,0,0,0.3)', boxSizing: 'border-box' }}
          />
          {briefingOpen && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.35)', fontFamily: 'inherit' }}>Add extra context (text, URL, or Google Drive) to improve the prompt:</div>
              {briefingSources.map((src, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <select value={src.type} onChange={e => setBriefingSources(prev => prev.map((s, j) => j === i ? { ...s, type: e.target.value } : s))}
                    style={{ fontSize: '0.68rem', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, padding: '4px 6px', background: 'rgba(255,255,255,0.8)', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="text">Text</option>
                    <option value="url">URL</option>
                    <option value="drive">Drive</option>
                  </select>
                  {src.type === 'text' ? (
                    <textarea value={src.value} onChange={e => setBriefingSources(prev => prev.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
                      placeholder="Paste notes, agenda, context…" rows={2}
                      style={{ flex: 1, fontSize: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 8px', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.8)', outline: 'none' }} />
                  ) : (
                    <input value={src.value} onChange={e => setBriefingSources(prev => prev.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
                      placeholder={src.type === 'drive' ? 'Google Drive share URL…' : 'https://…'}
                      style={{ flex: 1, fontSize: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 8px', fontFamily: 'inherit', background: 'rgba(255,255,255,0.8)', outline: 'none' }} />
                  )}
                  {briefingSources.length > 1 && (
                    <button onClick={() => setBriefingSources(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: '14px', padding: '4px', flexShrink: 0 }}>✕</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setBriefingSources(prev => [...prev, { type: 'text', value: '' }])}
                  style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(0,0,0,0.5)' }}>
                  + Source
                </button>
                <button onClick={handleGeneratePrompt} disabled={promptGenerating || !briefingSources.some(s => s.value.trim())}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '5px 10px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: promptGenerating ? 0.6 : 1 }}>
                  {promptGenerating ? 'Generating…' : '✦ Generate from Sources'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Demo Fix chat ── */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 12px' }}>
          <button onClick={() => setFixOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: fixRunning ? '#f59e0b' : 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
              {fixRunning && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1s infinite' }} />}
              🔧 Demo Fix
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: fixOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.3 }}>
              <path d="M2 4l4 4 4-4" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {fixOpen && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Message history */}
              {fixMessages.length > 0 && (
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                  {fixMessages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
                        {m.role === 'user' ? 'You' : '⚙ Claude Code'}
                      </div>
                      <div style={{
                        fontSize: '0.72rem', lineHeight: 1.55, padding: '6px 10px', borderRadius: 8, maxWidth: '90%',
                        background: m.role === 'user' ? '#1a1a1a' : 'rgba(0,0,0,0.04)',
                        color: m.role === 'user' ? '#fff' : '#1a1a1a',
                        fontFamily: m.role === 'assistant' ? 'monospace' : 'inherit',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        border: m.role === 'assistant' ? '1px solid rgba(0,0,0,0.08)' : 'none',
                      }}>
                        {m.text || (m.role === 'assistant' && fixRunning ? <span style={{ opacity: 0.4 }}>Running…</span> : '')}
                      </div>
                    </div>
                  ))}
                  <div ref={fixBottomRef} />
                </div>
              )}
              {/* Input row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <textarea
                  value={fixInput} onChange={e => setFixInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFixChat(); } }}
                  placeholder="Fix a worker, patch session data, reset phase…"
                  rows={2} disabled={fixRunning}
                  style={{ flex: 1, fontSize: '0.73rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 8px', fontFamily: 'inherit', resize: 'none', background: 'rgba(255,255,255,0.85)', outline: 'none', opacity: fixRunning ? 0.6 : 1 }}
                />
                <button onClick={handleFixChat} disabled={fixRunning || !fixInput.trim()}
                  style={{ padding: '0 12px', background: fixRunning ? 'rgba(0,0,0,0.08)' : '#f59e0b', color: fixRunning ? 'rgba(0,0,0,0.3)' : '#fff', border: 'none', borderRadius: 8, cursor: fixRunning ? 'default' : 'pointer', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                  {fixRunning ? '…' : '↑'}
                </button>
              </div>
              {fixMessages.length > 0 && (
                <button onClick={() => setFixMessages([])} style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Clear history</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Hub content — scrollable */}
      <div className="ws-right" ref={rightPanelRef} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── Research section ── */}
        <div className="ws-research-header">
          <div className="ws-research-title-row">
            <WordsStagger className="ws-research-prefix" delay={0.3} stagger={0.06} speed={0.4}>Company Research</WordsStagger>
            <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: 20 }}>|</span>
            <WordsStagger className="ws-research-company" delay={0.5} stagger={0.08} speed={0.5}>{tilesData?.companyName || companyName}</WordsStagger>
            {!tilesLoading && tilesData && (
              <div className="ws-live-badge"><span className="ws-live-dot" /><span className="ws-live-text">Live Data</span></div>
            )}
            {tilesLoading && <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>researching…</span>}
          </div>
          {tilesData?.lastUpdated && <div className="ws-updated">Updated {new Date(tilesData.lastUpdated).toLocaleDateString()}</div>}
        </div>

        {tilesLoading && <Spinner msg={`Researching ${companyName}…`} />}

        {tilesData && (
          <>
            <div className="ws-metrics">
              {[
                { label: 'Annual Revenue', value: tilesData?.fixed?.revenue ?? '--' },
                { label: 'Employees', value: tilesData?.fixed?.employees ?? '--' },
                { label: tilesData?.fixed?.marketCapLabel || 'Market Cap', value: tilesData?.fixed?.marketCap ?? '--' },
                { label: 'Sector', value: tilesData?.fixed?.sector ?? '--' },
              ].map((m, i) => (
                <div key={m.label} className="ws-metric">
                  <WordsStagger className="ws-metric-label" delay={0.6 + i * 0.1} stagger={0.05} speed={0.35}>{m.label}</WordsStagger>
                  <WordsStagger className="ws-metric-value" delay={0.8 + i * 0.1} stagger={0.08} speed={0.4}>{m.value}</WordsStagger>
                </div>
              ))}
            </div>
            {/* Refresh button when data looks like fallback */}
            {(tilesData?.fixed?.revenue === '--' && tilesData?.fixed?.employees === '--') && !tilesLoading && (
              <div style={{ padding: '0 1.5rem 0.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { researchTriggered.current = false; startResearch(tilesData.companyName || companyName); }}
                  style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↻ Refresh Research
                </button>
              </div>
            )}
            {tilesData.tiles?.length > 0 && (
              <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {tilesData.tiles.map(tile => {
                  const isLong = tile.value?.length > 200;
                  const isExpanded = expandedTiles[tile.id];
                  const isKeyFinding = tile.label === 'Key Finding' || tile.label === 'Tech Landscape';
                  const displayValue = isKeyFinding && isLong && !isExpanded
                    ? tile.value.slice(0, 220) + '…'
                    : tile.value;
                  return (
                    <div key={tile.id} style={{ flex: tile.wide ? '1 1 100%' : '1 1 160px', minWidth: tile.wide ? '100%' : 140, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '0.85rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', marginBottom: 6 }}>{tile.label}</div>
                      {isKeyFinding ? (
                        <>
                          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayValue) }} style={{ fontSize: '0.78rem', fontWeight: 400, color: '#1a1a1a', lineHeight: 1.5 }} />
                          {isLong && (
                            <button onClick={() => setExpandedTiles(p => ({ ...p, [tile.id]: !isExpanded }))}
                              style={{ marginTop: 6, fontSize: '0.68rem', color: 'rgba(52,199,89,0.9)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                              {isExpanded ? '↑ Show less' : '↓ Read more'}
                            </button>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: tile.wide ? '0.78rem' : '0.88rem', fontWeight: tile.wide ? 400 : 600, color: '#1a1a1a', lineHeight: 1.45 }}>{tile.value}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Platform proposals ── */}
        {hubPhase === P.PLATFORMS_PROPOSED && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 4 }}>
            <SectionHead label="Detected Platforms" badge={`${proposedPlatforms.filter(p => p._selected !== false).length} selected`} />
            <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {proposedPlatforms.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.35)', padding: '1rem 0' }}>No platforms detected. You can add feedback and build anyway.</div>
              )}
              {proposedPlatforms.map((p, i) => (
                <label key={p.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.625rem 0.875rem', borderRadius: 10, background: p._selected !== false ? 'rgba(52,199,89,0.06)' : 'rgba(255,255,255,0.5)', border: `1px solid ${p._selected !== false ? 'rgba(52,199,89,0.2)' : 'rgba(0,0,0,0.07)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={p._selected !== false} onChange={() => setProposedPlatforms(prev => prev.map((x, j) => j === i ? { ...x, _selected: !x._selected } : x))} style={{ marginTop: 2, accentColor: '#34c759' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a' }}>{p.actual_software || p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{p.reason || p.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Upload + feedback */}
            <div style={{ padding: '0.875rem 1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Suggestions or screenshots</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={f.url} alt={f.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#ff3b30', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ))}
                <label style={{ width: 56, height: 56, borderRadius: 8, border: '1.5px dashed rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.3rem', color: 'rgba(0,0,0,0.25)' }}>
                  +<input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
              </div>
              <textarea
                value={platformFeedback} onChange={e => setPlatformFeedback(e.target.value)}
                placeholder="Any notes about their tech stack or setup…"
                rows={2} style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ padding: '0 1.5rem 1.25rem' }}>
              <button onClick={handleBuildPlatforms} style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg,#34c759,#30a74f)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Build {proposedPlatforms.filter(p => p._selected !== false).length} platform{proposedPlatforms.filter(p => p._selected !== false).length !== 1 ? 's' : ''} →
              </button>
            </div>
          </div>
        )}

        {/* ── Building platforms ── */}
        {hubPhase === P.PLATFORMS_BUILDING && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '1.5rem' }}>
            <Spinner msg={buildingMsg} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {proposedPlatforms.filter(p => p._selected !== false).map(p => (
                <div key={p.id} style={{ padding: '4px 10px', background: 'rgba(52,199,89,0.1)', borderRadius: 8, fontSize: '0.7rem', color: '#1a1a1a', border: '1px solid rgba(52,199,89,0.2)' }}>{p.actual_software || p.name}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── Built platforms ── */}
        {[P.PLATFORMS_BUILT, P.WORKFLOW_CHECK, P.WORKERS_PROPOSED, P.WORKERS_DEPLOYING, P.WORKERS_BUILT].includes(hubPhase) && builtPlatforms.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <SectionHead label="Live Platforms" badge="Deployed" />
            {builtPlatforms.length === 1 ? (
              // Single platform — show large
              <div style={{ padding: '0 1.5rem 1rem', height: 520 }}>
                <PlatformPreviewCard platform={builtPlatforms[0]} sessionId={sessionId} companyName={companyName} />
              </div>
            ) : (
              <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: 12, overflowX: 'auto' }}>
                {builtPlatforms.map(p => (
                  <div key={p.id || p.name} style={{ flex: '0 0 280px', height: 280, display: 'flex', flexDirection: 'column' }}>
                    <PlatformPreviewCard platform={p} sessionId={sessionId} companyName={companyName} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Propose workers CTA ── */}
        {hubPhase === P.PLATFORMS_BUILT && (
          <div style={{ padding: '0 1.5rem 1.25rem' }}>
            <button onClick={proposeWorkers} style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Propose AI Workers →
            </button>
          </div>
        )}

        {/* ── Workflow check phase ── */}
        {hubPhase === P.WORKFLOW_CHECK && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '1.25rem 1.5rem' }}>
            <SectionHead label="Workflow Check" badge="Validating" sub="soft-running all workflows…" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0.5rem 0 0' }}>
              {wfCheckProgress.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                  {w.status === 'done'
                    ? <span style={{ color: '#34c759', fontSize: 13 }}>✓</span>
                    : <span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#8b5cf6', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '0.78rem', fontFamily: 'DM Sans', color: 'rgba(0,0,0,0.6)', flex: 1 }}>{w.name}</span>
                  <span style={{ fontSize: '0.65rem', color: w.status === 'done' ? '#34c759' : 'rgba(0,0,0,0.3)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{w.status === 'done' ? 'passed' : 'checking…'}</span>
                </div>
              ))}
              {wfCheckProgress.length === 0 && <Spinner msg="Generating worker proposals…" />}
            </div>
          </div>
        )}

        {/* ── Worker proposals ── */}
        {hubPhase === P.WORKERS_PROPOSED && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <SectionHead label="AI Workers Proposal" badge={`${proposedWorkers.filter(w => w._selected !== false).length} selected`} />
            <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proposedWorkers.length === 0 && <Spinner msg="Generating worker proposals…" />}
              {proposedWorkers.map((w, i) => (
                <WorkerProposalCard
                  key={w.id || i} worker={w}
                  selected={w._selected !== false}
                  onToggle={() => setProposedWorkers(prev => prev.map((x, j) => j === i ? { ...x, _selected: x._selected === false ? true : false } : x))}
                />
              ))}
            </div>

            {/* Worker feedback */}
            <div style={{ padding: '0.875rem 1.5rem 0' }}>
              <textarea
                value={workerFeedback} onChange={e => setWorkerFeedback(e.target.value)}
                placeholder="Changes to workers, add new ones, or delete…"
                rows={2} style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ padding: '0.75rem 1.5rem 1.25rem' }}>
              <button onClick={handleDeployWorkers} disabled={proposedWorkers.filter(w => w._selected !== false).length === 0} style={{ width: '100%', padding: '0.8rem', background: proposedWorkers.filter(w => w._selected !== false).length === 0 ? 'rgba(0,0,0,0.08)' : 'linear-gradient(135deg,#34c759,#30a74f)', color: proposedWorkers.filter(w => w._selected !== false).length === 0 ? 'rgba(0,0,0,0.35)' : '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: proposedWorkers.filter(w => w._selected !== false).length === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                Deploy {proposedWorkers.filter(w => w._selected !== false).length} AI worker{proposedWorkers.filter(w => w._selected !== false).length !== 1 ? 's' : ''} →
              </button>
            </div>
          </div>
        )}

        {/* ── Deploying workers ── */}
        {hubPhase === P.WORKERS_DEPLOYING && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '1.5rem' }}>
            <Spinner msg={buildingMsg} />
          </div>
        )}

        {/* ── Built workers ── */}
        {hubPhase === P.WORKERS_BUILT && builtWorkers.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <SectionHead label="AI Workers" badge="Live" sub={`${builtWorkers.length} deployed`} />
            <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {builtWorkers.map((w, i) => (
                <BuiltWorkerCard key={w.id || i} worker={w} onOpen={onGoWorkers} />
              ))}
              <button onClick={onGoWorkers} style={{ marginTop: 8, padding: '0.75rem', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#1a1a1a', fontFamily: 'inherit' }}>
                Open Workers Hub →
              </button>
            </div>
          </div>
        )}

        {/* Empty state / company name prompt */}
        {hubPhase === P.RESEARCH && !tilesLoading && !tilesData && (
          <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2rem', opacity: 0.15 }}>🏢</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(0,0,0,0.35)', textAlign: 'center', lineHeight: 1.5 }}>
              {companyName ? `Preparing to research ${companyName}…` : 'Type the company name in the chat to begin research'}
            </div>
            {!companyName && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                Alexandra will run a deep analysis and come back with insights, platforms, and worker recommendations.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Deploy Standalone Modal ── */}
      {showDeployModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowDeployModal(false)}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Deploy Standalone</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.5)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Deploys a self-contained Vercel app for this demo — each platform gets its own Vercel URL (no sandbox ports).
          </div>
          {deployStatus?.status === 'error' && (
            <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
              {deployStatus.error}
            </div>
          )}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)', display: 'block', marginBottom: 4 }}>Vercel Token</label>
            <input
              value={vercelTokenInput} onChange={e => setVercelTokenInput(e.target.value)}
              placeholder="paste your Vercel API token…"
              type="password"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, fontSize: '0.8rem', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>
              vercel.com → Settings → Tokens. Token is saved for future deploys.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowDeployModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}>Cancel</button>
            <button
              onClick={() => handleDeployStandalone(vercelTokenInput)}
              disabled={!vercelTokenInput.trim()}
              style={{ padding: '0.5rem 1.25rem', background: vercelTokenInput.trim() ? '#1d1d1f' : 'rgba(0,0,0,0.08)', color: vercelTokenInput.trim() ? '#fff' : 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 8, cursor: vercelTokenInput.trim() ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              Deploy →
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Context API banner ── */}
    {contextApiData && (
      <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: 10, padding: '5px 14px', fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)', maxWidth: 480, textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ color: '#2e7d32', fontWeight: 600 }}>Context loaded:</span> {contextApiData.title}
      </div>
    )}
    </div>
  );
}
