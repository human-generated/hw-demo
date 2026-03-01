'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

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
  { id: 'query-platform',  name: 'Query Platform',    icon: '🔍', color: T.blue   },
  { id: 'generate-report', name: 'AI Report',          icon: '🤖', color: T.purple },
  { id: 'send-notification',name:'Send Notification', icon: '📤', color: T.mint   },
  { id: 'call-webhook',    name: 'Call Webhook',       icon: '🔗', color: T.orange },
  { id: 'run-script',      name: 'Run Script',         icon: '⚙️', color: T.muted  },
  { id: 'transform-data',  name: 'Transform Data',     icon: '🔄', color: T.yellow },
  { id: 'condition',       name: 'Condition',          icon: '🔀', color: T.purple },
  { id: 'wait',            name: 'Wait',               icon: '⏱️', color: T.muted  },
];

const TRIGGERS = [
  { id: 'schedule',      name: 'Schedule',       icon: '⏰', color: T.blue,   desc: 'Run on a cron schedule' },
  { id: 'webhook',       name: 'Webhook',        icon: '🔗', color: T.mint,   desc: 'HTTP POST to generated URL' },
  { id: 'db-change',     name: 'DB Change',      icon: '🗄️', color: T.purple, desc: 'Trigger on database table insert / update / delete' },
  { id: 'db-condition',  name: 'DB Condition',   icon: '🔎', color: T.orange, desc: 'Poll until a database row matches a condition' },
  { id: 'message',       name: 'Telegram Msg',   icon: '💬', color: T.blue,   desc: 'Triggered by Telegram message matching a pattern' },
  { id: 'platform-event',name: 'Platform Event', icon: '📡', color: T.yellow, desc: 'Triggered when platform data changes' },
  { id: 'manual',        name: 'Manual',         icon: '▶️', color: T.muted,  desc: 'Run manually on demand' },
];

function skillOf(id) { return SKILLS.find(s => s.id === id) || { icon: '●', color: T.muted, name: id }; }
function triggerOf(id) { return TRIGGERS.find(t => t.id === id) || TRIGGERS[6]; }

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Badge({ color, children, style = {} }) {
  return <span style={{ background: color || T.faint, color: T.text, borderRadius: T.radius, padding: '2px 8px', fontSize: '0.58rem', fontFamily: T.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', ...style }}>{children}</span>;
}
function Btn({ onClick, children, ghost, small, disabled, color, style = {} }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: ghost ? T.card : (color || T.text), color: ghost ? T.muted : '#fff', border: ghost ? '1px solid rgba(0,0,0,0.1)' : 'none', borderRadius: T.radius, padding: small ? '0.3rem 0.7rem' : '0.5rem 1.1rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: T.mono, fontSize: small ? '0.6rem' : '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', ...style }}>{children}</button>;
}
function Input({ value, onChange, placeholder, style = {} }) {
  return <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.6rem', fontFamily: T.mono, fontSize: '0.72rem', color: T.text, outline: 'none', ...style }} />;
}
function Label({ children }) {
  return <div style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{children}</div>;
}
function Field({ label, children }) {
  return <div style={{ marginBottom: '0.75rem' }}><Label>{label}</Label>{children}</div>;
}

// ── Flow Graph ─────────────────────────────────────────────────────────────────
const NODE_W = 248;
const NODE_H = 60;
const ARROW_H = 44;
const STEP = NODE_H + ARROW_H;

function FlowGraph({ trigger, steps, selectedId, onSelect }) {
  const nodes = [
    { id: '__trigger__', type: 'trigger', data: trigger },
    ...steps.map(s => ({ id: s.id, type: 'step', data: s })),
    { id: '__end__', type: 'end' },
  ];
  const totalH = nodes.length * STEP + NODE_H;
  const svgW = NODE_W + 60;
  const cx = svgW / 2;

  return (
    <div style={{ position: 'relative', width: svgW, margin: '0 auto', minHeight: totalH }}>
      {/* Arrows */}
      <svg style={{ position: 'absolute', inset: 0, width: svgW, height: totalH, pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <marker id="arr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <polygon points="0,0 7,3.5 0,7" fill="rgba(0,0,0,0.18)" />
          </marker>
          <marker id="arr-cond" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <polygon points="0,0 7,3.5 0,7" fill={T.purple} />
          </marker>
        </defs>
        {nodes.slice(0, -1).map((node, i) => {
          const y1 = i * STEP + NODE_H;
          const y2 = (i + 1) * STEP;
          const isCond = node.type === 'step' && node.data?.skill === 'condition';
          return (
            <line key={i} x1={cx} y1={y1} x2={cx} y2={y2 - 2}
              stroke={isCond ? T.purple : 'rgba(0,0,0,0.18)'}
              strokeWidth={1.5}
              strokeDasharray={isCond ? '5,3' : 'none'}
              markerEnd={isCond ? 'url(#arr-cond)' : 'url(#arr)'}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      <div style={{ position: 'relative' }}>
        {nodes.map((node, i) => {
          const top = i * STEP;
          const isSelected = selectedId === node.id;
          if (node.type === 'trigger') {
            const trig = node.data || { type: 'manual', label: 'Manual' };
            const td = triggerOf(trig.type);
            return (
              <div key={node.id} onClick={() => onSelect('__trigger__')} style={{ position: 'absolute', top, left: (svgW - NODE_W) / 2, width: NODE_W, height: NODE_H, cursor: 'pointer', background: isSelected ? td.color + '18' : T.card, border: `2px solid ${isSelected ? td.color : 'rgba(0,0,0,0.09)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.9rem', boxShadow: isSelected ? `0 0 0 3px ${td.color}30` : T.shadow, transition: 'all 0.12s' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{td.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.57rem', fontFamily: T.mono, color: td.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trigger</div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trig.label || td.name}</div>
                </div>
                <Badge color={td.color + '22'} style={{ color: td.color }}>{trig.type}</Badge>
              </div>
            );
          }
          if (node.type === 'step') {
            const s = node.data;
            const sk = skillOf(s.skill);
            const isCond = s.skill === 'condition';
            return (
              <div key={node.id} onClick={() => onSelect(node.id)} style={{ position: 'absolute', top, left: (svgW - NODE_W) / 2, width: NODE_W, height: NODE_H, cursor: 'pointer', background: isSelected ? sk.color + '14' : T.card, border: `2px solid ${isSelected ? sk.color : 'rgba(0,0,0,0.08)'}`, borderRadius: isCond ? '50%' : 6, display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0 0.8rem', boxShadow: isSelected ? `0 0 0 3px ${sk.color}22` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.12s', clipPath: isCond ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: isSelected ? sk.color : T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontFamily: T.mono, color: isSelected ? '#fff' : T.muted, flexShrink: 0 }}>{i}</div>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{sk.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.79rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || sk.name}</div>
                  {s.description && <div style={{ fontSize: '0.62rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
                </div>
                <Badge color={sk.color + '22'} style={{ color: sk.color }}>{s.skill}</Badge>
              </div>
            );
          }
          // End node
          return (
            <div key={node.id} style={{ position: 'absolute', top: top + NODE_H / 2 - 16, left: cx - 16, width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.18)' }} />
            </div>
          );
        })}
      </div>
      {/* Spacer so container has right height */}
      <div style={{ height: totalH }} />
    </div>
  );
}

// ── Trigger Config Panel ───────────────────────────────────────────────────────
function TriggerConfigPanel({ trigger, onChange }) {
  const t = trigger || { type: 'manual', label: 'Manual', config: {} };
  const td = triggerOf(t.type);
  function upd(patch) { onChange({ ...t, ...patch, config: { ...(t.config || {}), ...patch.config } }); }
  function updCfg(cfg) { upd({ config: { ...(t.config || {}), ...cfg } }); }

  return (
    <div>
      {/* Type selector */}
      <Field label="Trigger type">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {TRIGGERS.map(tt => (
            <button key={tt.id} onClick={() => upd({ type: tt.id, label: tt.name, config: {} })} style={{ background: t.type === tt.id ? tt.color + '22' : T.faint, border: `1.5px solid ${t.type === tt.id ? tt.color : 'transparent'}`, borderRadius: T.radius, padding: '0.25rem 0.55rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.62rem', color: t.type === tt.id ? tt.color : T.muted, fontWeight: t.type === tt.id ? 700 : 400 }}>
              {tt.icon} {tt.name}
            </button>
          ))}
        </div>
      </Field>

      {t.type === 'schedule' && <>
        <Field label="Cron expression">
          <Input value={t.config?.cron || '0 9 * * 1-5'} onChange={v => { upd({ label: 'Schedule · ' + v, config: { cron: v } }); }} placeholder="0 9 * * 1-5" />
        </Field>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {[['0 9 * * 1-5','Weekdays 9am'],['0 * * * *','Every hour'],['*/30 * * * *','Every 30 min'],['0 0 * * *','Daily midnight']].map(([cron, lbl]) => (
            <button key={cron} onClick={() => upd({ label: 'Schedule · ' + cron, config: { cron } })} style={{ background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, color: T.muted }}>{lbl}</button>
          ))}
        </div>
      </>}

      {t.type === 'webhook' && <>
        <Field label="Webhook URL (auto-generated)">
          <div style={{ background: T.faint, borderRadius: T.radius, padding: '0.35rem 0.6rem', fontSize: '0.66rem', fontFamily: T.mono, color: T.muted, wordBreak: 'break-all' }}>
            POST /demo/workers/&#123;id&#125;/webhook
          </div>
        </Field>
        <Field label="Secret (optional)">
          <Input value={t.config?.secret || ''} onChange={v => updCfg({ secret: v })} placeholder="webhook-secret-xxx" />
        </Field>
        <Field label="Allowed method">
          <Input value={t.config?.method || 'POST'} onChange={v => updCfg({ method: v })} placeholder="POST" />
        </Field>
      </>}

      {t.type === 'db-change' && <>
        <Field label="Table name">
          <Input value={t.config?.table || ''} onChange={v => { updCfg({ table: v }); upd({ label: `DB · ${v} change` }); }} placeholder="e.g. contacts, orders, invoices" />
        </Field>
        <Field label="Event">
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['insert', 'update', 'delete', 'any'].map(ev => (
              <button key={ev} onClick={() => { updCfg({ event: ev }); upd({ label: `DB · ${t.config?.table || 'table'} ${ev}` }); }} style={{ background: (t.config?.event || 'any') === ev ? T.purple + '22' : T.faint, border: `1.5px solid ${(t.config?.event || 'any') === ev ? T.purple : 'transparent'}`, borderRadius: T.radius, padding: '0.25rem 0.5rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.62rem', color: (t.config?.event || 'any') === ev ? T.purple : T.muted }}>
                {ev}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Row filter condition (optional)">
          <Input value={t.config?.condition || ''} onChange={v => updCfg({ condition: v })} placeholder="e.g. amount > 1000" />
        </Field>
        <Field label="Poll interval (seconds)">
          <Input value={String(t.config?.pollIntervalSec || 30)} onChange={v => updCfg({ pollIntervalSec: parseInt(v) || 30 })} placeholder="30" />
        </Field>
      </>}

      {t.type === 'db-condition' && <>
        <Field label="Table name">
          <Input value={t.config?.table || ''} onChange={v => { updCfg({ table: v }); upd({ label: `DB Condition · ${v}` }); }} placeholder="e.g. invoices" />
        </Field>
        <Field label="SQL / JS condition">
          <textarea value={t.config?.condition || ''} onChange={e => updCfg({ condition: e.target.value })} placeholder="e.g. status = 'overdue' AND amount > 500" rows={3} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.6rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none', resize: 'vertical' }} />
        </Field>
        <Field label="Poll interval (seconds)">
          <Input value={String(t.config?.pollIntervalSec || 60)} onChange={v => updCfg({ pollIntervalSec: parseInt(v) || 60 })} placeholder="60" />
        </Field>
      </>}

      {t.type === 'message' && (
        <Field label="Telegram pattern">
          <Input value={t.config?.pattern || ''} onChange={v => { updCfg({ pattern: v }); upd({ label: `Message · ${v}` }); }} placeholder="/report or any keyword" />
        </Field>
      )}

      {t.type === 'platform-event' && (
        <Field label="Condition">
          <Input value={t.config?.condition || ''} onChange={v => { updCfg({ condition: v }); upd({ label: `Event · ${v}` }); }} placeholder="e.g. transaction.amount > 500" />
        </Field>
      )}

      {t.type === 'manual' && (
        <div style={{ fontSize: '0.72rem', fontFamily: T.mono, color: T.muted, background: T.faint, padding: '0.5rem 0.75rem', borderRadius: T.radius }}>
          No configuration required — trigger manually from the dashboard.
        </div>
      )}
    </div>
  );
}

// ── Step Config Panel ──────────────────────────────────────────────────────────
function StepConfigPanel({ step, onParamChange }) {
  const sk = skillOf(step.skill);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{sk.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{step.name || sk.name}</div>
          {step.description && <div style={{ fontSize: '0.67rem', color: T.muted }}>{step.description}</div>}
        </div>
        <Badge color={sk.color + '22'} style={{ color: sk.color, marginLeft: 'auto' }}>{step.skill}</Badge>
      </div>
      {Object.keys(step.params || {}).length === 0 && (
        <div style={{ fontSize: '0.72rem', fontFamily: T.mono, color: T.muted, fontStyle: 'italic' }}>No params. Ask in chat to configure.</div>
      )}
      {Object.entries(step.params || {}).map(([k, v]) => (
        <Field key={k} label={k}>
          {typeof v === 'string' && v.length > 60
            ? <textarea value={v} onChange={e => onParamChange(k, e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.6rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none', resize: 'vertical' }} />
            : <Input value={typeof v === 'object' ? JSON.stringify(v) : String(v)} onChange={val => { let parsed = val; try { parsed = JSON.parse(val); } catch {} onParamChange(k, parsed); }} />
          }
        </Field>
      ))}
    </div>
  );
}

// ── Node Detail Panel ──────────────────────────────────────────────────────────
function NodeDetailPanel({ selectedId, trigger, steps, onTriggerChange, onStepChange, onRemove, onMoveUp, onMoveDown }) {
  if (!selectedId) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, fontStyle: 'italic' }}>
        Click a node to configure it
      </div>
    );
  }
  if (selectedId === '__trigger__') {
    return (
      <div style={{ padding: '0.9rem 1rem' }}>
        <div style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>Trigger Config</div>
        <TriggerConfigPanel trigger={trigger} onChange={onTriggerChange} />
      </div>
    );
  }
  const stepIdx = steps.findIndex(s => s.id === selectedId);
  if (stepIdx < 0) return null;
  const step = steps[stepIdx];
  return (
    <div style={{ padding: '0.9rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Step {stepIdx + 1} Config</div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button onClick={() => onMoveUp(stepIdx)} disabled={stepIdx === 0} style={{ background: 'none', border: T.border, borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: '0.6rem', color: T.muted, opacity: stepIdx === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={() => onMoveDown(stepIdx)} disabled={stepIdx === steps.length - 1} style={{ background: 'none', border: T.border, borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: '0.6rem', color: T.muted, opacity: stepIdx === steps.length - 1 ? 0.3 : 1 }}>↓</button>
          <button onClick={() => onRemove(stepIdx)} style={{ background: 'none', border: T.border, borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: '0.6rem', color: T.red }}>✕ Remove</button>
        </div>
      </div>
      <StepConfigPanel step={step} onParamChange={(k, v) => onStepChange(stepIdx, { ...step, params: { ...step.params, [k]: v } })} />
    </div>
  );
}

// ── Skills Palette ─────────────────────────────────────────────────────────────
function SkillsPalette({ onAdd }) {
  return (
    <div style={{ padding: '0.75rem 1rem' }}>
      <div style={{ fontSize: '0.57rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Add Step</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {SKILLS.map(s => (
          <button key={s.id} onClick={() => onAdd(s)} style={{ background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.22rem 0.5rem', cursor: 'pointer', fontSize: '0.62rem', fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: '0.25rem', color: T.muted }} onMouseOver={e => e.currentTarget.style.background = s.color + '18'} onMouseOut={e => e.currentTarget.style.background = T.faint}>
            <span>{s.icon}</span>{s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Logs Panel ─────────────────────────────────────────────────────────────────
function LogsPanel({ logs }) {
  if (!logs || logs.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>
      No runs yet. Deploy then trigger the worker.
    </div>
  );
  const totalWh = logs.reduce((s, l) => s + (l.powerWh || 0), 0);
  const measured = logs.filter(l => l.powerWh !== undefined).length;
  return (
    <div style={{ padding: '1.5rem' }}>
      {measured > 0 && (
        <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.6rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.68rem', fontFamily: T.mono }}>
          <span style={{ color: T.orange }}>⚡ {(totalWh * 1000).toFixed(4)} mWh total</span>
          <span style={{ color: T.muted }}>{measured} measured runs</span>
          <span style={{ color: T.muted }}>avg {(totalWh * 1000 / measured).toFixed(4)} mWh/run</span>
        </div>
      )}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
        <div style={{ padding: '0.55rem 1rem', borderBottom: T.border, fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Run History</div>
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', fontFamily: T.mono, padding: '0.4rem 1rem', borderBottom: i < logs.length - 1 ? T.border : 'none', alignItems: 'center' }}>
            <span style={{ color: T.muted, flexShrink: 0, fontSize: '0.62rem' }}>{new Date(log.at || Date.now()).toLocaleTimeString()}</span>
            <span style={{ color: log.success !== false ? T.mint : T.red, flexShrink: 0 }}>{log.success !== false ? '✓' : '✗'}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message || 'Completed'}</span>
            {log.powerWh !== undefined && (
              <span style={{ color: T.orange, flexShrink: 0, fontSize: '0.6rem' }}>
                ⚡{(log.powerWh * 1000).toFixed(4)}mWh{log.wallSec ? ` ${log.wallSec.toFixed(1)}s` : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Worker Page ───────────────────────────────────────────────────────────
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

  // Flow state
  const [trigger, setTrigger] = useState(null);
  const [steps, setSteps] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Chat
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  useEffect(() => {
    if (worker) {
      setTrigger(worker.trigger || { type: 'manual', label: 'Manual', config: {} });
      setSteps(worker.steps || []);
      setDirty(false);
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
      const d = await r.json();
      setLogs(d.logs || []);
    } catch {}
  }

  function updateTrigger(t) { setTrigger(t); setDirty(true); }
  function addStep(skill) {
    setSteps(prev => [...prev, { id: 's' + Date.now(), skill: skill.id, name: skill.name, description: skill.description || '', params: {} }]);
    setDirty(true);
  }
  function removeStep(idx) { setSteps(prev => prev.filter((_, i) => i !== idx)); setDirty(true); }
  function moveStep(idx, dir) {
    setSteps(prev => {
      const arr = [...prev]; const t2 = idx + dir;
      if (t2 < 0 || t2 >= arr.length) return arr;
      [arr[idx], arr[t2]] = [arr[t2], arr[idx]]; return arr;
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
    } catch {}
    setSaving(false);
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const r = await fetch('/api/demo/workers/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, worker: { ...worker, trigger, steps } }) });
      const d = await r.json();
      setWorker(prev => ({ ...prev, status: d.status || 'deployed' }));
    } catch {}
    setDeploying(false);
  }

  async function handleRun() {
    setRunning(true);
    try {
      await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      setTimeout(fetchLogs, 2000);
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
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message: msg }) });
      const d = await r.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: d.message || 'Done.' }]);
      if (d.worker) { setWorker(d.worker); setTrigger(d.worker.trigger || trigger); setSteps(d.worker.steps || steps); setDirty(false); }
    } catch (e) { setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]); }
    setChatLoading(false);
  }

  if (loading) return <div style={{ fontFamily: T.mono, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: '0.85rem' }}>Loading worker...</div>;
  if (!worker) return (
    <div style={{ fontFamily: T.ui, background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.85rem', color: T.muted, fontFamily: T.mono }}>Worker not found.</div>
      <a href={sessionId ? `/?session=${sessionId}` : '/'} style={{ color: T.blue, fontSize: '0.8rem', fontFamily: T.mono }}>← Back to H-Demo</a>
    </div>
  );

  const statusColor = worker?.status === 'deployed' ? T.mint : worker?.status === 'running' ? T.blue : worker?.status === 'error' ? T.red : T.faint;

  return (
    <div style={{ fontFamily: T.ui, background: T.bg, color: T.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.25rem', height: 50, display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <a href={sessionId ? `/?session=${sessionId}` : '/'} style={{ fontFamily: T.mono, fontSize: '0.62rem', color: T.muted, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← H-Demo</a>
        <span style={{ color: 'rgba(0,0,0,0.15)' }}>|</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.88rem' }}>{worker?.name}</span>
        <Badge color={statusColor}>{worker?.status || 'proposed'}</Badge>
        {dirty && <Badge color={T.yellow} style={{ color: '#000' }}>Unsaved</Badge>}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {dirty && <Btn small onClick={saveFlow} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>}
          {worker?.status === 'deployed'
            ? <Btn small color={T.blue} onClick={handleRun} disabled={running}>{running ? 'Running...' : '▶ Run'}</Btn>
            : <Btn small color={T.mint} style={{ color: T.text }} onClick={handleDeploy} disabled={deploying}>{deploying ? 'Deploying...' : 'Deploy'}</Btn>
          }
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.25rem', display: 'flex' }}>
        {['flow', 'logs'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'logs') fetchLogs(); }} style={{ background: 'none', border: 'none', padding: '0.55rem 0.9rem', cursor: 'pointer', fontSize: '0.62rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', color: activeTab === tab ? T.text : T.muted, borderBottom: activeTab === tab ? `2px solid ${T.text}` : '2px solid transparent', marginBottom: -1 }}>{tab}</button>
        ))}
      </div>

      {/* Flow tab */}
      {activeTab === 'flow' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Graph area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.68rem', color: T.muted, fontFamily: T.mono }}>
              {worker.description}
            </div>
            {trigger && (
              <FlowGraph
                trigger={trigger}
                steps={steps}
                selectedId={selectedNodeId}
                onSelect={id => setSelectedNodeId(prev => prev === id ? null : id)}
              />
            )}
          </div>

          {/* Right panel */}
          <div style={{ width: 330, borderLeft: T.border, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            {/* Node detail — scrollable top section */}
            <div style={{ overflowY: 'auto', borderBottom: T.border, maxHeight: '40%', minHeight: 80 }}>
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
            <div style={{ borderBottom: T.border, flexShrink: 0 }}>
              <SkillsPalette onAdd={addStep} />
            </div>

            {/* Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: T.border, fontSize: '0.57rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Worker Chat</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {chatHistory.length === 0 && <div style={{ color: T.muted, fontSize: '0.68rem', fontStyle: 'italic', lineHeight: 1.6 }}>Ask to modify the flow — e.g. "change trigger to hourly", "add a webhook step", "trigger when orders table has insert"</div>}
                {chatHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '90%', background: m.role === 'user' ? T.text : T.faint, color: m.role === 'user' ? '#fff' : T.text, borderRadius: T.radius, padding: '0.4rem 0.65rem', fontSize: '0.72rem', lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                ))}
                {chatLoading && <div style={{ color: T.muted, fontSize: '0.68rem', fontStyle: 'italic' }}>Updating flow...</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ borderTop: T.border, padding: '0.5rem 0.65rem', display: 'flex', gap: '0.35rem' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Modify flow via chat..." disabled={chatLoading} style={{ flex: 1, background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.35rem 0.55rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none' }} />
                <Btn small onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>→</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs tab */}
      {activeTab === 'logs' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <LogsPanel logs={logs} />
        </div>
      )}
    </div>
  );
}
