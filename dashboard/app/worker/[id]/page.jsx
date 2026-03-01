'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  Handle, Position, BaseEdge, getStraightPath, getBezierPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const T = {
  bg: '#F4F4F4', card: '#FFFFFF', text: '#0D0D0D', muted: '#888888',
  faint: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)',
  shadow: '0 2px 12px rgba(0,0,0,0.06)', radius: '6px',
  mono: "'JetBrains Mono','Fira Mono',monospace",
  ui: "'Space Grotesk','Inter',sans-serif",
  mint: '#6CEFA0', blue: '#6CDDEF', purple: '#B06CEF',
  orange: '#EF9B6C', red: '#EF4444', yellow: '#F5C842',
};

const SKILLS = [
  { id: 'query-platform',   name: 'Query Platform',     icon: '🔍', color: T.blue   },
  { id: 'generate-report',  name: 'AI Report',           icon: '🤖', color: T.purple },
  { id: 'send-notification',name: 'Send Notification',   icon: '📤', color: T.mint   },
  { id: 'call-webhook',     name: 'Call Webhook',        icon: '🔗', color: T.orange },
  { id: 'run-script',       name: 'Run Script',          icon: '⚙️', color: T.muted  },
  { id: 'transform-data',   name: 'Transform Data',      icon: '🔄', color: T.yellow },
  { id: 'condition',        name: 'Condition',           icon: '🔀', color: T.purple },
  { id: 'wait',             name: 'Wait',                icon: '⏱️', color: T.muted  },
];

const TRIGGERS = [
  { id: 'schedule',       name: 'Schedule',       icon: '⏰', color: T.blue,   desc: 'Run on a cron schedule' },
  { id: 'webhook',        name: 'Webhook',        icon: '🔗', color: T.mint,   desc: 'HTTP POST to generated URL' },
  { id: 'db-change',      name: 'DB Change',      icon: '🗄️', color: T.purple, desc: 'Trigger on database table insert / update / delete' },
  { id: 'db-condition',   name: 'DB Condition',   icon: '🔎', color: T.orange, desc: 'Poll until a database row matches a condition' },
  { id: 'message',        name: 'Telegram Msg',   icon: '💬', color: T.blue,   desc: 'Triggered by Telegram message matching a pattern' },
  { id: 'platform-event', name: 'Platform Event', icon: '📡', color: T.yellow, desc: 'Triggered when platform data changes' },
  { id: 'manual',         name: 'Manual',         icon: '▶️', color: T.muted,  desc: 'Run manually on demand' },
];

function skillOf(id)   { return SKILLS.find(s => s.id === id)   || { icon: '●', color: T.muted,  name: id }; }
function triggerOf(id) { return TRIGGERS.find(t => t.id === id) || TRIGGERS[6]; }

// ─── Mini helpers ─────────────────────────────────────────────────────────────
function Badge({ color, children, style = {} }) {
  return <span style={{ background: color || T.faint, borderRadius: 4, padding: '2px 7px', fontSize: '0.57rem', fontFamily: T.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', ...style }}>{children}</span>;
}
function Btn({ onClick, children, ghost, small, disabled, color, style = {} }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: ghost ? T.card : (color || T.text), color: ghost ? T.muted : '#fff', border: ghost ? '1px solid rgba(0,0,0,0.1)' : 'none', borderRadius: T.radius, padding: small ? '0.28rem 0.65rem' : '0.48rem 1.1rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: T.mono, fontSize: small ? '0.6rem' : '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', ...style }}>{children}</button>;
}
function Input({ value, onChange, placeholder, style = {} }) {
  return <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.32rem 0.55rem', fontFamily: T.mono, fontSize: '0.71rem', color: T.text, outline: 'none', ...style }} />;
}
function Label({ children }) {
  return <div style={{ fontSize: '0.57rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.28rem' }}>{children}</div>;
}
function Field({ label, children }) {
  return <div style={{ marginBottom: '0.7rem' }}><Label>{label}</Label>{children}</div>;
}

// ─── ReactFlow custom nodes ───────────────────────────────────────────────────
function TriggerNode({ data }) {
  const td = triggerOf(data.trigger?.type);
  const t  = data.trigger || { type: 'manual', label: 'Manual', config: {} };
  const sel = data.selected;
  return (
    <div
      onClick={data.onSelect}
      style={{
        width: 220, padding: '0.55rem 0.8rem', borderRadius: 10,
        background: sel ? td.color + '1A' : '#fff',
        border: `2px solid ${sel ? td.color : 'rgba(0,0,0,0.10)'}`,
        boxShadow: sel ? `0 0 0 4px ${td.color}28` : '0 2px 8px rgba(0,0,0,0.07)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.55rem',
        transition: 'all 0.12s',
      }}
    >
      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{td.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.55rem', fontFamily: T.mono, color: td.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trigger</div>
        <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label || td.name}</div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: td.color, width: 8, height: 8 }} />
    </div>
  );
}

function StepNode({ data }) {
  const sk  = skillOf(data.step?.skill);
  const s   = data.step || {};
  const sel = data.selected;
  const isCond = s.skill === 'condition';
  return (
    <div
      onClick={data.onSelect}
      style={{
        width: 220, padding: '0.5rem 0.75rem', borderRadius: isCond ? 6 : 8,
        background: sel ? sk.color + '14' : '#fff',
        border: `2px solid ${sel ? sk.color : 'rgba(0,0,0,0.08)'}`,
        boxShadow: sel ? `0 0 0 4px ${sk.color}22` : '0 1px 5px rgba(0,0,0,0.05)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
        transition: 'all 0.12s',
        transform: isCond ? 'rotate(45deg)' : 'none',
      }}
    >
      {isCond && <div style={{ transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{sk.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.77rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || sk.name}</div>
        </div>
      </div>}
      {!isCond && <>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: sel ? sk.color : T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontFamily: T.mono, color: sel ? '#fff' : T.muted, flexShrink: 0 }}>{data.index + 1}</div>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{sk.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.79rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || sk.name}</div>
          {s.description && <div style={{ fontSize: '0.61rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
        </div>
        <Badge color={sk.color + '22'} style={{ color: sk.color, flexShrink: 0 }}>{s.skill}</Badge>
      </>}
      <Handle type="target" position={Position.Top}    style={{ background: sk.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: sk.color, width: 8, height: 8 }} />
    </div>
  );
}

function EndNode() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '2.5px solid rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
      <Handle type="target" position={Position.Top} style={{ background: 'rgba(0,0,0,0.2)', width: 8, height: 8 }} />
    </div>
  );
}

const NODE_TYPES = { trigger: TriggerNode, step: StepNode, end: EndNode };

// Build ReactFlow nodes + edges from trigger + steps
function buildFlow(trigger, steps, selectedId, onSelect) {
  const X = 0, GAP = 110;
  const nodes = [];
  const edges = [];

  nodes.push({
    id: '__trigger__',
    type: 'trigger',
    position: { x: X, y: 0 },
    data: { trigger, selected: selectedId === '__trigger__', onSelect: () => onSelect('__trigger__') },
    draggable: false,
  });

  steps.forEach((s, i) => {
    const y = (i + 1) * GAP;
    nodes.push({
      id: s.id,
      type: 'step',
      position: { x: X, y },
      data: { step: s, index: i, selected: selectedId === s.id, onSelect: () => onSelect(s.id) },
      draggable: false,
    });
    const prevId = i === 0 ? '__trigger__' : steps[i - 1].id;
    const isCond = steps[i - 1]?.skill === 'condition';
    edges.push({
      id: `e${prevId}-${s.id}`,
      source: prevId,
      target: s.id,
      animated: isCond,
      style: { stroke: isCond ? T.purple : 'rgba(0,0,0,0.2)', strokeWidth: 1.5 },
      type: 'smoothstep',
    });
  });

  const lastId = steps.length > 0 ? steps[steps.length - 1].id : '__trigger__';
  nodes.push({
    id: '__end__',
    type: 'end',
    position: { x: X + 92, y: (steps.length + 1) * GAP },
    data: {},
    draggable: false,
  });
  edges.push({ id: `e${lastId}-end`, source: lastId, target: '__end__', style: { stroke: 'rgba(0,0,0,0.18)', strokeWidth: 1.5 }, type: 'smoothstep' });

  return { nodes, edges };
}

// ─── Trigger Config ───────────────────────────────────────────────────────────
function TriggerConfigPanel({ trigger, onChange }) {
  const t = trigger || { type: 'manual', label: 'Manual', config: {} };
  const upd = (patch) => onChange({ ...t, ...patch, config: { ...(t.config || {}), ...patch.config } });
  const updCfg = (cfg)  => upd({ config: { ...(t.config || {}), ...cfg } });

  return (
    <div>
      <Field label="Trigger type">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {TRIGGERS.map(tt => (
            <button key={tt.id} onClick={() => upd({ type: tt.id, label: tt.name, config: {} })} style={{ background: t.type === tt.id ? tt.color + '22' : T.faint, border: `1.5px solid ${t.type === tt.id ? tt.color : 'transparent'}`, borderRadius: T.radius, padding: '0.22rem 0.5rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: t.type === tt.id ? tt.color : T.muted, fontWeight: t.type === tt.id ? 700 : 400 }}>
              {tt.icon} {tt.name}
            </button>
          ))}
        </div>
      </Field>

      {t.type === 'schedule' && <>
        <Field label="Cron expression">
          <Input value={t.config?.cron || '0 9 * * 1-5'} onChange={v => upd({ label: 'Schedule · ' + v, config: { cron: v } })} placeholder="0 9 * * 1-5" />
        </Field>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.7rem' }}>
          {[['0 9 * * 1-5','Weekdays 9am'],['0 * * * *','Every hour'],['*/30 * * * *','Every 30 min'],['0 0 * * *','Daily midnight']].map(([c,l]) => (
            <button key={c} onClick={() => upd({ label: 'Schedule · ' + c, config: { cron: c } })} style={{ background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.18rem 0.45rem', cursor: 'pointer', fontSize: '0.58rem', fontFamily: T.mono, color: T.muted }}>{l}</button>
          ))}
        </div>
      </>}

      {t.type === 'webhook' && <>
        <Field label="Generated webhook URL">
          <div style={{ background: T.faint, borderRadius: T.radius, padding: '0.32rem 0.55rem', fontSize: '0.65rem', fontFamily: T.mono, color: T.muted }}>POST /demo/workers/&#123;id&#125;/webhook</div>
        </Field>
        <Field label="Secret (optional)"><Input value={t.config?.secret || ''} onChange={v => updCfg({ secret: v })} placeholder="webhook-secret-xxx" /></Field>
      </>}

      {t.type === 'db-change' && <>
        <Field label="Table name">
          <Input value={t.config?.table || ''} onChange={v => { updCfg({ table: v }); upd({ label: `DB · ${v} change` }); }} placeholder="contacts, orders, invoices…" />
        </Field>
        <Field label="Event">
          <div style={{ display: 'flex', gap: '0.28rem' }}>
            {['insert','update','delete','any'].map(ev => (
              <button key={ev} onClick={() => updCfg({ event: ev })} style={{ background: (t.config?.event || 'any') === ev ? T.purple + '22' : T.faint, border: `1.5px solid ${(t.config?.event || 'any') === ev ? T.purple : 'transparent'}`, borderRadius: T.radius, padding: '0.22rem 0.45rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: (t.config?.event || 'any') === ev ? T.purple : T.muted }}>
                {ev}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Row filter (optional)"><Input value={t.config?.condition || ''} onChange={v => updCfg({ condition: v })} placeholder="amount > 1000" /></Field>
        <Field label="Poll interval (s)"><Input value={String(t.config?.pollIntervalSec || 30)} onChange={v => updCfg({ pollIntervalSec: parseInt(v) || 30 })} /></Field>
      </>}

      {t.type === 'db-condition' && <>
        <Field label="Table name">
          <Input value={t.config?.table || ''} onChange={v => { updCfg({ table: v }); upd({ label: `DB Condition · ${v}` }); }} placeholder="invoices" />
        </Field>
        <Field label="SQL condition">
          <textarea value={t.config?.condition || ''} onChange={e => updCfg({ condition: e.target.value })} placeholder="status = 'overdue' AND amount > 500" rows={3} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.32rem 0.55rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none', resize: 'vertical' }} />
        </Field>
        <Field label="Poll interval (s)"><Input value={String(t.config?.pollIntervalSec || 60)} onChange={v => updCfg({ pollIntervalSec: parseInt(v) || 60 })} /></Field>
      </>}

      {t.type === 'message' && (
        <Field label="Telegram pattern">
          <Input value={t.config?.pattern || ''} onChange={v => { updCfg({ pattern: v }); upd({ label: `Message · ${v}` }); }} placeholder="/report or keyword" />
        </Field>
      )}
      {t.type === 'platform-event' && (
        <Field label="Condition">
          <Input value={t.config?.condition || ''} onChange={v => { updCfg({ condition: v }); upd({ label: `Event · ${v}` }); }} placeholder="transaction.amount > 500" />
        </Field>
      )}
      {t.type === 'manual' && (
        <div style={{ fontSize: '0.7rem', fontFamily: T.mono, color: T.muted, background: T.faint, padding: '0.45rem 0.65rem', borderRadius: T.radius }}>
          No configuration — trigger manually from the dashboard.
        </div>
      )}
    </div>
  );
}

// ─── Step Config Panel ────────────────────────────────────────────────────────
function StepConfigPanel({ step, stepIdx, stepsLen, onParamChange, onRemove, onMoveUp, onMoveDown }) {
  const sk = skillOf(step.skill);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.7rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{sk.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{step.name || sk.name}</div>
          {step.description && <div style={{ fontSize: '0.64rem', color: T.muted }}>{step.description}</div>}
        </div>
        <Badge color={sk.color + '22'} style={{ color: sk.color }}>{step.skill}</Badge>
      </div>
      <div style={{ display: 'flex', gap: '0.28rem', marginBottom: '0.7rem' }}>
        <button onClick={() => onMoveUp(stepIdx)} disabled={stepIdx === 0} style={{ background: 'none', border: T.border, borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.6rem', color: T.muted, opacity: stepIdx === 0 ? 0.3 : 1 }}>↑ Up</button>
        <button onClick={() => onMoveDown(stepIdx)} disabled={stepIdx === stepsLen - 1} style={{ background: 'none', border: T.border, borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.6rem', color: T.muted, opacity: stepIdx === stepsLen - 1 ? 0.3 : 1 }}>↓ Down</button>
        <button onClick={() => onRemove(stepIdx)} style={{ background: 'none', border: `1px solid ${T.red}40`, borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.6rem', color: T.red }}>✕ Remove</button>
      </div>
      {Object.keys(step.params || {}).length === 0 && (
        <div style={{ fontSize: '0.7rem', fontFamily: T.mono, color: T.muted, fontStyle: 'italic' }}>No params. Ask in chat to configure.</div>
      )}
      {Object.entries(step.params || {}).map(([k, v]) => (
        <Field key={k} label={k}>
          {typeof v === 'string' && v.length > 55
            ? <textarea value={v} onChange={e => onParamChange(k, e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.32rem 0.55rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none', resize: 'vertical' }} />
            : <Input value={typeof v === 'object' ? JSON.stringify(v) : String(v)} onChange={val => { let p = val; try { p = JSON.parse(val); } catch {} onParamChange(k, p); }} />
          }
        </Field>
      ))}
    </div>
  );
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────
function NodeDetailPanel({ selectedId, trigger, steps, onTriggerChange, onStepChange, onRemove, onMoveUp, onMoveDown }) {
  if (!selectedId) return (
    <div style={{ padding: '1rem', textAlign: 'center', color: T.muted, fontSize: '0.7rem', fontFamily: T.mono, fontStyle: 'italic' }}>
      Click a node to configure it
    </div>
  );
  if (selectedId === '__trigger__') return (
    <div style={{ padding: '0.85rem 1rem' }}>
      <Label>Trigger Config</Label>
      <TriggerConfigPanel trigger={trigger} onChange={onTriggerChange} />
    </div>
  );
  const idx = steps.findIndex(s => s.id === selectedId);
  if (idx < 0) return null;
  return (
    <div style={{ padding: '0.85rem 1rem' }}>
      <Label>Step {idx + 1} Config</Label>
      <StepConfigPanel
        step={steps[idx]}
        stepIdx={idx}
        stepsLen={steps.length}
        onParamChange={(k, v) => onStepChange(idx, { ...steps[idx], params: { ...steps[idx].params, [k]: v } })}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

// ─── Skills Palette ───────────────────────────────────────────────────────────
function SkillsPalette({ onAdd }) {
  return (
    <div style={{ padding: '0.65rem 1rem' }}>
      <Label>Add Step</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem' }}>
        {SKILLS.map(s => (
          <button key={s.id} onClick={() => onAdd(s)} style={{ background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.2rem 0.45rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: '0.22rem', color: T.muted }} onMouseOver={e => e.currentTarget.style.background = s.color + '18'} onMouseOut={e => e.currentTarget.style.background = T.faint}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Logs Panel ───────────────────────────────────────────────────────────────
function LogsPanel({ logs }) {
  if (!logs || logs.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>No runs yet.</div>
  );
  const totalWh = logs.reduce((s, l) => s + (l.powerWh || 0), 0);
  const measured = logs.filter(l => l.powerWh !== undefined).length;
  return (
    <div style={{ padding: '1.5rem' }}>
      {measured > 0 && (
        <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.55rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1.2rem', fontSize: '0.67rem', fontFamily: T.mono }}>
          <span style={{ color: T.orange }}>⚡ {(totalWh * 1000).toFixed(4)} mWh total</span>
          <span style={{ color: T.muted }}>avg {(totalWh * 1000 / measured).toFixed(4)} mWh/run</span>
        </div>
      )}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.65rem', fontSize: '0.69rem', fontFamily: T.mono, padding: '0.38rem 1rem', borderBottom: i < logs.length - 1 ? T.border : 'none', alignItems: 'center' }}>
            <span style={{ color: T.muted, flexShrink: 0, fontSize: '0.6rem' }}>{new Date(log.at || Date.now()).toLocaleTimeString()}</span>
            <span style={{ color: log.success !== false ? T.mint : T.red, flexShrink: 0 }}>{log.success !== false ? '✓' : '✗'}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message || 'Completed'}</span>
            {log.powerWh !== undefined && <span style={{ color: T.orange, flexShrink: 0, fontSize: '0.58rem' }}>⚡{(log.powerWh * 1000).toFixed(4)}mWh {log.wallSec ? `${log.wallSec.toFixed(1)}s` : ''}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workerId  = decodeURIComponent(params.id);
  const sessionId = searchParams.get('session');

  const [worker, setWorker]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [running, setRunning]     = useState(false);
  const [logs, setLogs]           = useState([]);
  const [activeTab, setActiveTab] = useState('flow');

  const [trigger, setTrigger]         = useState(null);
  const [steps,   setSteps]           = useState([]);
  const [dirty,   setDirty]           = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // ReactFlow node/edge state (kept in sync with trigger+steps)
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Sync ReactFlow graph whenever trigger/steps/selectedNodeId changes
  useEffect(() => {
    if (!trigger) return;
    const { nodes, edges } = buildFlow(trigger, steps, selectedNodeId, id => setSelectedNodeId(prev => prev === id ? null : id));
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [trigger, steps, selectedNodeId]);

  useEffect(() => {
    if (worker) {
      setTrigger(worker.trigger || { type: 'manual', label: 'Manual', config: {} });
      setSteps(worker.steps || []);
      setDirty(false);
      setSelectedNodeId(null);
    }
  }, [worker?.id]);

  useEffect(() => {
    if (!workerId || !sessionId) { setLoading(false); return; }
    fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/flow?sessionId=${sessionId}`)
      .then(r => r.json()).then(d => { if (d.worker) setWorker(d.worker); setLoading(false); })
      .catch(() => setLoading(false));
    fetchLogs();
  }, [workerId, sessionId]);

  async function fetchLogs() {
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/logs?sessionId=${sessionId}`);
      setLogs((await r.json()).logs || []);
    } catch {}
  }

  function updateTrigger(t) { setTrigger(t); setDirty(true); }
  function addStep(skill) {
    setSteps(prev => [...prev, { id: 's' + Date.now(), skill: skill.id, name: skill.name, description: skill.description || '', params: {} }]);
    setDirty(true);
  }
  function removeStep(idx) { setSteps(prev => prev.filter((_, i) => i !== idx)); setSelectedNodeId(null); setDirty(true); }
  function moveStep(idx, dir) {
    setSteps(prev => {
      const a = [...prev]; const t2 = idx + dir;
      if (t2 < 0 || t2 >= a.length) return a;
      [a[idx], a[t2]] = [a[t2], a[idx]]; return a;
    });
    setDirty(true);
  }
  function updateStep(idx, updated) { setSteps(prev => prev.map((s, i) => i === idx ? updated : s)); setDirty(true); }

  async function saveFlow() {
    setSaving(true);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/flow`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, flow: { trigger, steps } }) });
      const d = await r.json();
      if (d.worker) { setWorker(d.worker); setDirty(false); }
    } catch {} finally { setSaving(false); }
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const r = await fetch('/api/demo/workers/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, worker: { ...worker, trigger, steps } }) });
      const d = await r.json();
      setWorker(prev => ({ ...prev, status: d.status || 'deployed' }));
    } catch {} finally { setDeploying(false); }
  }

  async function handleRun() {
    setRunning(true);
    try {
      await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      setTimeout(fetchLogs, 2000);
    } catch {} finally { setRunning(false); }
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message: msg }) });
      const d = await r.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: d.message || 'Done.' }]);
      if (d.worker) { setWorker(d.worker); setTrigger(d.worker.trigger || trigger); setSteps(d.worker.steps || steps); setDirty(false); }
    } catch (e) { setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]); }
    setChatLoading(false);
  }

  if (loading) return <div style={{ fontFamily: T.mono, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>Loading worker...</div>;
  if (!worker) return (
    <div style={{ fontFamily: T.ui, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.85rem', color: T.muted, fontFamily: T.mono }}>Worker not found.</div>
      <a href={sessionId ? `/?session=${sessionId}` : '/'} style={{ color: T.blue, fontFamily: T.mono, fontSize: '0.8rem' }}>← Back to H-Demo</a>
    </div>
  );

  const statusColor = { deployed: T.mint, running: T.blue, error: T.red }[worker?.status] || T.faint;

  return (
    <div style={{ fontFamily: T.ui, background: T.bg, color: T.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.25rem', height: 50, display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, boxShadow: T.shadow }}>
        <a href={sessionId ? `/?session=${sessionId}` : '/'} style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← H-Demo</a>
        <span style={{ color: 'rgba(0,0,0,0.12)' }}>|</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.88rem' }}>{worker?.name}</span>
        <Badge color={statusColor}>{worker?.status || 'proposed'}</Badge>
        {dirty && <Badge color={T.yellow} style={{ color: '#000' }}>Unsaved</Badge>}
        <div style={{ flex: 1 }} />
        {dirty && <Btn small onClick={saveFlow} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>}
        {worker?.status === 'deployed'
          ? <Btn small color={T.blue} onClick={handleRun} disabled={running}>{running ? 'Running…' : '▶ Run'}</Btn>
          : <Btn small color={T.mint} style={{ color: T.text }} onClick={handleDeploy} disabled={deploying}>{deploying ? 'Deploying…' : 'Deploy'}</Btn>
        }
      </div>

      {/* Tabs */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.25rem', display: 'flex' }}>
        {['flow', 'logs'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'logs') fetchLogs(); }} style={{ background: 'none', border: 'none', padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', color: activeTab === tab ? T.text : T.muted, borderBottom: activeTab === tab ? `2px solid ${T.text}` : '2px solid transparent', marginBottom: -1 }}>{tab}</button>
        ))}
      </div>

      {/* Flow tab */}
      {activeTab === 'flow' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* ReactFlow canvas */}
          <div style={{ flex: 1, position: 'relative' }}>
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.4}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              style={{ background: T.bg }}
            >
              <Background color="rgba(0,0,0,0.05)" gap={20} size={1} />
              <Controls showInteractive={false} style={{ bottom: 16, left: 16 }} />
              <MiniMap
                nodeColor={n => n.type === 'trigger' ? triggerOf(n.data?.trigger?.type).color : n.type === 'step' ? skillOf(n.data?.step?.skill).color : '#ccc'}
                style={{ bottom: 16, right: 16, borderRadius: 8, border: T.border }}
                maskColor="rgba(244,244,244,0.6)"
              />
            </ReactFlow>
            {/* Worker description overlay */}
            {worker?.description && (
              <div style={{ position: 'absolute', top: 12, left: 12, background: T.card, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.65rem', fontSize: '0.68rem', color: T.muted, maxWidth: 280, pointerEvents: 'none', boxShadow: T.shadow }}>
                {worker.description}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ width: 320, borderLeft: T.border, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: T.card }}>
            {/* Node detail */}
            <div style={{ overflowY: 'auto', borderBottom: T.border, maxHeight: '45%', minHeight: 72 }}>
              <NodeDetailPanel
                selectedId={selectedNodeId}
                trigger={trigger}
                steps={steps}
                onTriggerChange={updateTrigger}
                onStepChange={updateStep}
                onRemove={removeStep}
                onMoveUp={idx => moveStep(idx, -1)}
                onMoveDown={idx => moveStep(idx, 1)}
              />
            </div>

            {/* Skills palette */}
            <div style={{ borderBottom: T.border }}>
              <SkillsPalette onAdd={addStep} />
            </div>

            {/* Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '0.45rem 1rem', borderBottom: T.border, fontSize: '0.55rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Worker Chat</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.55rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {chatHistory.length === 0 && <div style={{ color: T.muted, fontSize: '0.67rem', fontStyle: 'italic', lineHeight: 1.6 }}>e.g. "trigger when orders has new insert", "add a condition if amount &gt; 500", "run hourly"</div>}
                {chatHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '90%', background: m.role === 'user' ? T.text : T.faint, color: m.role === 'user' ? '#fff' : T.text, borderRadius: T.radius, padding: '0.38rem 0.6rem', fontSize: '0.71rem', lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                ))}
                {chatLoading && <div style={{ color: T.muted, fontSize: '0.67rem', fontStyle: 'italic' }}>Updating flow…</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ borderTop: T.border, padding: '0.45rem 0.6rem', display: 'flex', gap: '0.3rem' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Modify flow via chat…" disabled={chatLoading} style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.32rem 0.52rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none' }} />
                <Btn small onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>→</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <LogsPanel logs={logs} />
        </div>
      )}
    </div>
  );
}
