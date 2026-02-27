'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const T = {
  bg: '#F4F4F4', card: '#FFFFFF', text: '#0D0D0D', muted: '#888888',
  faint: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.08)',
  shadow: '0 2px 12px rgba(0,0,0,0.06)', radius: '4px',
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
  ui: "'Space Grotesk', 'Inter', sans-serif",
  mint: '#6CEFA0', blue: '#6CDDEF', purple: '#B06CEF',
  orange: '#EF9B6C', red: '#EF4444', yellow: '#F5C842',
};

const AVAILABLE_SKILLS = [
  { id: 'query-platform', name: 'Query Platform', icon: '🔍', color: T.blue, description: 'Query a deployed back-office platform for data' },
  { id: 'generate-report', name: 'AI Report', icon: '🤖', color: T.purple, description: 'Generate AI summary or analysis from data' },
  { id: 'send-notification', name: 'Send Notification', icon: '📤', color: T.mint, description: 'Send via Telegram, email, or webhook' },
  { id: 'call-webhook', name: 'Call Webhook', icon: '🔗', color: T.orange, description: 'Call any external HTTP endpoint' },
  { id: 'run-script', name: 'Run Script', icon: '⚙️', color: T.muted, description: 'Execute custom bash/Python script' },
  { id: 'transform-data', name: 'Transform Data', icon: '🔄', color: T.yellow, description: 'Filter, map, or aggregate data' },
  { id: 'condition', name: 'Condition', icon: '🔀', color: T.purple, description: 'Branch flow based on data condition' },
  { id: 'wait', name: 'Wait', icon: '⏱️', color: T.muted, description: 'Add a timed delay between steps' },
];

const TRIGGER_TYPES = [
  { id: 'schedule', name: 'Schedule', icon: '⏰', description: 'Run on a cron schedule' },
  { id: 'webhook', name: 'Webhook', icon: '🔗', description: 'Triggered by HTTP POST' },
  { id: 'manual', name: 'Manual', icon: '▶️', description: 'Run manually on demand' },
  { id: 'message', name: 'Message', icon: '💬', description: 'Triggered by Telegram message' },
  { id: 'platform-event', name: 'Platform Event', icon: '📡', description: 'Triggered by platform data change' },
];

function Badge({ color, children, style = {} }) {
  return (
    <span style={{
      background: color || T.faint, color: T.text, borderRadius: T.radius,
      padding: '2px 8px', fontSize: '0.6rem', fontFamily: T.mono,
      fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em',
      display: 'inline-block', ...style,
    }}>{children}</span>
  );
}

function Btn({ onClick, children, ghost, small, disabled, color, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: ghost ? T.card : (color || T.text), color: ghost ? T.muted : '#fff',
      border: ghost ? `1px solid rgba(0,0,0,0.1)` : 'none', borderRadius: T.radius,
      padding: small ? '0.3rem 0.75rem' : '0.5rem 1.2rem',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      fontFamily: T.mono, fontSize: small ? '0.62rem' : '0.7rem',
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', ...style,
    }}>{children}</button>
  );
}

// ── Trigger Card ──────────────────────────────────────────────────────────────
function TriggerCard({ trigger, onChange }) {
  const t = trigger || { type: 'manual', label: 'Manual', config: {} };
  const selected = TRIGGER_TYPES.find(x => x.id === t.type) || TRIGGER_TYPES[2];

  return (
    <div style={{ background: T.card, borderRadius: T.radius, boxShadow: T.shadow, border: T.border, padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Trigger</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {TRIGGER_TYPES.map(tt => (
          <button
            key={tt.id}
            onClick={() => onChange({ ...t, type: tt.id, label: tt.name + (t.config?.cron ? ' · ' + t.config.cron : '') })}
            style={{
              background: t.type === tt.id ? T.text : T.faint,
              color: t.type === tt.id ? '#fff' : T.text,
              border: 'none', borderRadius: T.radius, padding: '0.35rem 0.75rem',
              cursor: 'pointer', fontFamily: T.mono, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <span>{tt.icon}</span>{tt.name}
          </button>
        ))}
      </div>

      {t.type === 'schedule' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: T.mono, color: T.muted }}>cron:</span>
          <input
            value={t.config?.cron || '0 9 * * 1-5'}
            onChange={e => onChange({ ...t, config: { ...t.config, cron: e.target.value }, label: 'Schedule · ' + e.target.value })}
            style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.3rem 0.6rem', fontFamily: T.mono, fontSize: '0.75rem', color: T.text, outline: 'none' }}
          />
          <span style={{ fontSize: '0.65rem', color: T.muted, fontFamily: T.mono }}>{describeCron(t.config?.cron)}</span>
        </div>
      )}
      {t.type === 'webhook' && (
        <div style={{ fontSize: '0.72rem', fontFamily: T.mono, background: T.faint, padding: '0.5rem 0.75rem', borderRadius: T.radius, color: T.muted }}>
          POST /demo/workers/{'{id}'}/webhook — will be triggered by external HTTP calls
        </div>
      )}
      {t.type === 'message' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: T.mono, color: T.muted }}>pattern:</span>
          <input
            value={t.config?.pattern || ''}
            onChange={e => onChange({ ...t, config: { ...t.config, pattern: e.target.value }, label: 'Message · ' + e.target.value })}
            placeholder="e.g. /report or keyword"
            style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.3rem 0.6rem', fontFamily: T.mono, fontSize: '0.75rem', color: T.text, outline: 'none' }}
          />
        </div>
      )}
      {t.type === 'platform-event' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: T.mono, color: T.muted }}>condition:</span>
          <input
            value={t.config?.condition || ''}
            onChange={e => onChange({ ...t, config: { ...t.config, condition: e.target.value }, label: 'Event · ' + e.target.value })}
            placeholder="e.g. transaction.amount > 500"
            style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.3rem 0.6rem', fontFamily: T.mono, fontSize: '0.75rem', color: T.text, outline: 'none' }}
          />
        </div>
      )}
      <div style={{ marginTop: '0.6rem', fontSize: '0.65rem', fontFamily: T.mono, color: T.muted }}>
        {selected.icon} {t.label || selected.description}
      </div>
    </div>
  );
}

function describeCron(cron) {
  if (!cron) return '';
  if (cron === '0 9 * * 1-5') return 'Weekdays 9 AM';
  if (cron === '0 * * * *') return 'Every hour';
  if (cron === '*/30 * * * *') return 'Every 30 min';
  if (cron === '0 0 * * *') return 'Daily midnight';
  if (cron === '0 8 * * *') return 'Daily 8 AM';
  return '';
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, index, total, onRemove, onMoveUp, onMoveDown }) {
  const skill = AVAILABLE_SKILLS.find(s => s.id === step.skill) || { icon: '●', color: T.muted, name: step.skill };
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: T.card, border: T.border, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem' }}>
        {/* Step number */}
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontFamily: T.mono, color: T.muted, flexShrink: 0 }}>
          {index + 1}
        </div>
        {/* Skill icon */}
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{skill.icon}</span>
        {/* Step info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{step.name || skill.name}</div>
          {step.description && <div style={{ fontSize: '0.68rem', color: T.muted }}>{step.description}</div>}
        </div>
        {/* Skill badge */}
        <Badge color={skill.color + '28'} style={{ color: skill.color, flexShrink: 0 }}>{step.skill}</Badge>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', color: T.muted }}>
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => onMoveUp(index)} disabled={index === 0} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', color: T.muted, opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={() => onMoveDown(index)} disabled={index === total - 1} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', color: T.muted, opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button onClick={() => onRemove(index)} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', color: T.red }}>✕</button>
        </div>
      </div>
      {/* Expanded params */}
      {expanded && step.params && Object.keys(step.params).length > 0 && (
        <div style={{ padding: '0.5rem 0.85rem 0.65rem', borderTop: T.border, background: T.faint }}>
          {Object.entries(step.params).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.68rem', fontFamily: T.mono }}>
              <span style={{ color: T.muted, flexShrink: 0 }}>{k}:</span>
              <span style={{ color: T.text, wordBreak: 'break-all' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skills Palette ────────────────────────────────────────────────────────────
function SkillsPalette({ onAdd }) {
  return (
    <div style={{ background: T.card, borderRadius: T.radius, boxShadow: T.shadow, border: T.border, padding: '1rem' }}>
      <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Available Skills</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {AVAILABLE_SKILLS.map(s => (
          <button
            key={s.id}
            onClick={() => onAdd(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: T.faint, border: T.border, borderRadius: T.radius,
              padding: '0.45rem 0.65rem', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseOver={e => e.currentTarget.style.background = s.color + '18'}
            onMouseOut={e => e.currentTarget.style.background = T.faint}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: '0.6rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>
            </div>
            <span style={{ color: T.muted, fontSize: '0.8rem', flexShrink: 0 }}>+</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Logs Panel ────────────────────────────────────────────────────────────────
function LogsPanel({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: T.radius, border: T.border, boxShadow: T.shadow, padding: '1.5rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>
        No runs yet. Deploy and trigger the worker to see logs here.
      </div>
    );
  }
  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: T.border, boxShadow: T.shadow, overflow: 'hidden' }}>
      <div style={{ padding: '0.65rem 1rem', borderBottom: T.border, fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Run History</div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', fontFamily: T.mono, padding: '0.45rem 1rem', borderBottom: i < logs.length - 1 ? T.border : 'none', alignItems: 'center' }}>
            <span style={{ color: T.muted, flexShrink: 0 }}>{new Date(log.at || log.timestamp || Date.now()).toLocaleTimeString()}</span>
            <span style={{ color: log.success !== false ? T.mint : T.red, flexShrink: 0 }}>{log.success !== false ? '✓' : '✗'}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.text }}>{log.message || log.result || 'Completed'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Worker Page ──────────────────────────────────────────────────────────
export default function WorkerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workerId = decodeURIComponent(params.id);
  const sessionId = searchParams.get('session');

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('flow');

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Local flow state (trigger + steps)
  const [trigger, setTrigger] = useState(null);
  const [steps, setSteps] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (worker) {
      setTrigger(worker.trigger || { type: 'manual', label: 'Manual', config: {} });
      setSteps(worker.steps || []);
      setDirty(false);
    }
  }, [worker?.id]);

  // Fetch worker
  useEffect(() => {
    if (!workerId || !sessionId) { setLoading(false); return; }
    fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/flow?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => { if (d.worker) setWorker(d.worker); setLoading(false); })
      .catch(() => setLoading(false));
    fetchLogs();
  }, [workerId, sessionId]);

  async function fetchLogs() {
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/logs?sessionId=${sessionId}`);
      const d = await r.json();
      setLogs(d.logs || []);
    } catch {}
  }

  function updateTrigger(t) { setTrigger(t); setDirty(true); }

  function addStep(skill) {
    const newStep = {
      id: 's' + Date.now(),
      skill: skill.id,
      name: skill.name,
      description: skill.description,
      params: {},
    };
    setSteps(prev => [...prev, newStep]);
    setDirty(true);
  }

  function removeStep(index) {
    setSteps(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function moveStep(index, direction) {
    setSteps(prev => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
    setDirty(true);
  }

  async function saveFlow() {
    setSaving(true);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/flow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, flow: { trigger, steps } }),
      });
      const d = await r.json();
      if (d.worker) { setWorker(d.worker); setDirty(false); }
    } catch {}
    setSaving(false);
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const r = await fetch('/api/demo/workers/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, worker: { ...worker, trigger, steps } }),
      });
      const d = await r.json();
      setWorker(prev => ({ ...prev, status: d.status || 'deployed', pid: d.pid }));
    } catch {}
    setDeploying(false);
  }

  async function handleRun() {
    setRunning(true);
    try {
      await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setTimeout(fetchLogs, 1500);
    } catch {}
    setRunning(false);
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: msg }),
      });
      const d = await r.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: d.message || 'Done.' }]);
      if (d.worker) {
        setWorker(d.worker);
        setTrigger(d.worker.trigger || trigger);
        setSteps(d.worker.steps || steps);
        setDirty(false);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
    }
    setChatLoading(false);
  }

  if (loading) {
    return (
      <div style={{ fontFamily: T.ui, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: '0.85rem', fontFamily: T.mono }}>
        Loading worker...
      </div>
    );
  }

  if (!worker && !loading) {
    return (
      <div style={{ fontFamily: T.ui, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '0.85rem', color: T.muted, fontFamily: T.mono }}>Worker not found. Make sure session is active.</div>
        <a href="/" style={{ color: T.blue, fontSize: '0.8rem', fontFamily: T.mono }}>← Back to H-Demo</a>
      </div>
    );
  }

  const statusColor = worker?.status === 'deployed' ? T.mint : worker?.status === 'running' ? T.blue : worker?.status === 'error' ? T.red : T.faint;

  return (
    <div style={{ fontFamily: T.ui, background: T.bg, color: T.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: T.shadow, flexShrink: 0 }}>
        <a href={sessionId ? `/?session=${sessionId}` : '/'} style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ← H-Demo
        </a>
        <span style={{ color: T.faint }}>|</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.88rem' }}>{worker?.name}</span>
        <Badge color={statusColor}>{worker?.status || 'proposed'}</Badge>
        {dirty && <Badge color={T.yellow} style={{ color: '#000' }}>Unsaved</Badge>}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {dirty && <Btn small onClick={saveFlow} disabled={saving}>{saving ? 'Saving...' : 'Save Flow'}</Btn>}
          {worker?.status === 'deployed' ? (
            <Btn small color={T.blue} onClick={handleRun} disabled={running}>{running ? 'Running...' : '▶ Run'}</Btn>
          ) : (
            <Btn small color={T.mint} style={{ color: T.text }} onClick={handleDeploy} disabled={deploying}>{deploying ? 'Deploying...' : 'Deploy'}</Btn>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.5rem', display: 'flex', gap: '0' }}>
        {['flow', 'logs'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'logs') fetchLogs(); }} style={{
            background: 'none', border: 'none', padding: '0.6rem 1rem', cursor: 'pointer',
            fontSize: '0.65rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: activeTab === tab ? T.text : T.muted,
            borderBottom: activeTab === tab ? `2px solid ${T.text}` : '2px solid transparent',
            marginBottom: -1,
          }}>{tab}</button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'flow' && (
          <>
            {/* Flow editor — center */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Worker description */}
              <div style={{ background: T.card, borderRadius: T.radius, border: T.border, boxShadow: T.shadow, padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{worker?.name}</div>
                <div style={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.5 }}>{worker?.description}</div>
              </div>

              {/* Trigger */}
              {trigger && <TriggerCard trigger={trigger} onChange={updateTrigger} />}

              {/* Steps */}
              <div>
                <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
                  Flow Steps ({steps.length})
                </div>
                {steps.length === 0 && (
                  <div style={{ background: T.card, borderRadius: T.radius, border: `1px dashed rgba(0,0,0,0.15)`, padding: '1.5rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>
                    No steps yet. Add skills from the palette or ask in chat.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {steps.map((step, i) => (
                    <StepCard
                      key={step.id || i}
                      step={step}
                      index={i}
                      total={steps.length}
                      onRemove={removeStep}
                      onMoveUp={idx => moveStep(idx, -1)}
                      onMoveDown={idx => moveStep(idx, 1)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: skills + chat */}
            <div style={{ width: 340, borderLeft: T.border, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Skills palette */}
              <div style={{ padding: '1rem', borderBottom: T.border, overflowY: 'auto', flex: '0 0 auto', maxHeight: '40%' }}>
                <SkillsPalette onAdd={addStep} />
              </div>

              {/* Chat */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '0.6rem 1rem', borderBottom: T.border, fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Worker Chat · Modify via natural language
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {chatHistory.length === 0 && (
                    <div style={{ color: T.muted, fontSize: '0.72rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                      Try: "change trigger to daily at 8am" · "add a step to send a Telegram report" · "make it run every hour" · "add a condition to only run if value &gt; 100"
                    </div>
                  )}
                  {chatHistory.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '88%', background: m.role === 'user' ? T.text : T.faint,
                        color: m.role === 'user' ? '#fff' : T.text,
                        borderRadius: T.radius, padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem', lineHeight: 1.5,
                      }}>{m.content}</div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ color: T.muted, fontSize: '0.72rem', fontStyle: 'italic' }}>Updating flow...</div>}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ borderTop: T.border, padding: '0.6rem 0.75rem', display: 'flex', gap: '0.4rem' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Change trigger, add step, use any skill..."
                    disabled={chatLoading}
                    style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.4rem 0.6rem', fontFamily: T.mono, fontSize: '0.72rem', color: T.text, outline: 'none' }}
                  />
                  <Btn small onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>→</Btn>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <LogsPanel logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
}
