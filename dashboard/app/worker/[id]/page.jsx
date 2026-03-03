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

// Provider alternatives per skill (for dropdown in ResourceNode)
const SKILL_PROVIDERS = {
  'send-notification': [
    { icon: '📨', label: 'Telegram',     color: T.blue,   params: { channel: 'telegram' } },
    { icon: '📞', label: 'Twilio Voice', color: T.mint,   params: { channel: 'phone',   provider: 'twilio' } },
    { icon: '📱', label: 'Twilio SMS',   color: T.mint,   params: { channel: 'sms',     provider: 'twilio' } },
    { icon: '💬', label: 'Slack',        color: T.purple, params: { channel: 'slack' } },
    { icon: '📧', label: 'Email',        color: T.orange, params: { channel: 'email' } },
  ],
  'generate-report': [
    { icon: '🔑', label: 'Anthropic Claude', color: T.purple, params: { model: 'claude-sonnet-4-6' } },
    { icon: '🤖', label: 'OpenAI GPT-4',     color: T.mint,   params: { model: 'gpt-4o', provider: 'openai' } },
  ],
  'call-webhook': [
    { icon: '📞', label: 'Twilio Voice', color: T.mint,   params: { provider: 'twilio' } },
    { icon: '🔗', label: 'HTTP Webhook', color: T.orange, params: { provider: '' } },
    { icon: '💬', label: 'Slack',        color: T.purple, params: { provider: 'slack' } },
  ],
};

// Resources used by each step/trigger
function resourcesOf(skill, params, trigger) {
  if (!skill) {
    const rs = []; const type = trigger?.type; const cfg = trigger?.config || {};
    if (type === 'db-condition' || type === 'db-change')
      rs.push({ icon: '🗄️', label: cfg.table || 'DB table', color: T.blue });
    if (type === 'message') rs.push({ icon: '📨', label: 'Telegram', color: T.blue });
    if (cfg.phone)          rs.push({ icon: '📞', label: 'Twilio', color: T.mint });
    if (type === 'webhook') rs.push({ icon: '🔗', label: 'Webhook', color: T.orange });
    return rs;
  }
  const p = params || {};
  switch (skill) {
    case 'query-platform':    return [{ icon: '🗄️', label: p.table || p.platform || p.module || p.endpoint?.split('/').slice(-1)[0] || 'platform DB', color: T.blue }];
    case 'generate-report':   return [{ icon: '🔑', label: 'Anthropic Claude', color: T.purple }];
    case 'send-notification': {
      const ch = (p.channel || '').toLowerCase();
      const pr = (p.provider || '').toLowerCase();
      if (ch === 'phone' || ch === 'twilio' || pr === 'twilio')
        return [{ icon: '📞', label: 'Twilio Voice', color: T.mint }];
      if (ch === 'sms' || pr === 'sms' || pr === 'twilio-sms')
        return [{ icon: '📱', label: 'Twilio SMS', color: T.mint }];
      if (ch === 'email' || pr === 'sendgrid' || pr === 'ses' || pr === 'smtp')
        return [{ icon: '📧', label: pr || 'Email', color: T.orange }];
      if (ch === 'slack')
        return [{ icon: '💬', label: 'Slack', color: T.purple }];
      // Default: Telegram (channel telegram or unset)
      return [{ icon: '📨', label: 'Telegram Bot', color: T.blue }];
    }
    case 'call-webhook': {
      const pr2 = (p.provider || '').toLowerCase();
      const url = p.url || '';
      if (pr2 === 'twilio' || url.toLowerCase().includes('twilio') || url.includes('/Calls') || p.to || p.phone)
        return [{ icon: '📞', label: 'Twilio Voice', color: T.mint }];
      if (pr2 === 'slack' || url.includes('hooks.slack'))
        return [{ icon: '💬', label: 'Slack', color: T.purple }];
      return [{ icon: '🔗', label: url ? url.replace(/^https?:\/\//, '').split('/')[0].slice(0, 22) : 'Webhook', color: T.orange }];
    }
    case 'run-script':      return [{ icon: '⚙️', label: p.file || 'script', color: T.muted }];
    case 'transform-data':  return [{ icon: '🔄', label: 'in-memory', color: T.yellow }];
    default: return [];
  }
}

// Static per-step performance estimates
const STEP_ESTIMATES = {
  'query-platform':    { sec: 0.15, tokens: 0,    costUsd: 0,       wh: 0.00005 },
  'generate-report':   { sec: 3.2,  tokens: 1200, costUsd: 0.00036, wh: 0.0006  },
  'send-notification': { sec: 0.4,  tokens: 0,    costUsd: 0,       wh: 0.00005 },
  'call-webhook':      { sec: 1.5,  tokens: 0,    costUsd: 0.014,   wh: 0.0001  },
  'condition':         { sec: 0.01, tokens: 0,    costUsd: 0,       wh: 0       },
  'transform-data':    { sec: 0.05, tokens: 0,    costUsd: 0,       wh: 0       },
  'run-script':        { sec: 0.8,  tokens: 0,    costUsd: 0,       wh: 0.0001  },
  'wait':              { sec: 1.0,  tokens: 0,    costUsd: 0,       wh: 0       },
};

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
  const resources = resourcesOf(null, null, t);
  return (
    <div
      onClick={data.onSelect}
      style={{
        width: 230, padding: '0.55rem 0.8rem', borderRadius: 10,
        background: sel ? td.color + '1A' : '#fff',
        border: `2px solid ${sel ? td.color : 'rgba(0,0,0,0.10)'}`,
        boxShadow: sel ? `0 0 0 4px ${td.color}28` : '0 2px 8px rgba(0,0,0,0.07)',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{td.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.55rem', fontFamily: T.mono, color: td.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trigger</div>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label || td.name}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: td.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  style={{ background: td.color, width: 6, height: 6, top: '50%' }} id="right" />
    </div>
  );
}

function StepNode({ data }) {
  const sk  = skillOf(data.step?.skill);
  const s   = data.step || {};
  const sel = data.selected;
  const isCond = s.skill === 'condition';
  const est = STEP_ESTIMATES[s.skill];
  return (
    <div
      onClick={data.onSelect}
      style={{
        width: 230, padding: '0.5rem 0.75rem', borderRadius: 8,
        background: sel ? sk.color + '14' : '#fff',
        border: `2px solid ${sel ? sk.color : isCond ? sk.color + '60' : 'rgba(0,0,0,0.08)'}`,
        borderLeft: isCond ? `4px solid ${sk.color}` : undefined,
        boxShadow: sel ? `0 0 0 4px ${sk.color}22` : '0 1px 5px rgba(0,0,0,0.05)',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 20, height: 20, borderRadius: isCond ? 4 : '50%', background: sel ? sk.color : isCond ? sk.color + '22' : T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontFamily: T.mono, color: sel ? '#fff' : sk.color, flexShrink: 0, fontWeight: 700 }}>{isCond ? '?' : data.index + 1}</div>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{sk.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.79rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || sk.name}</div>
          {s.description && <div style={{ fontSize: '0.61rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
        </div>
        <Badge color={sk.color + '22'} style={{ color: sk.color, flexShrink: 0 }}>{s.skill}</Badge>
      </div>
      {est && (
        <div style={{ display: 'flex', gap: 3, marginTop: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {est.sec > 0    && <span style={{ fontSize: '0.52rem', fontFamily: T.mono, background: T.faint, color: T.muted, borderRadius: 3, padding: '1px 5px' }}>~{est.sec}s</span>}
          {est.tokens > 0 && <span style={{ fontSize: '0.52rem', fontFamily: T.mono, background: T.purple + '18', color: T.purple, borderRadius: 3, padding: '1px 5px' }}>~{est.tokens}t</span>}
          {est.costUsd > 0 && <span style={{ fontSize: '0.52rem', fontFamily: T.mono, background: T.orange + '18', color: T.orange, borderRadius: 3, padding: '1px 5px' }}>${est.costUsd.toFixed(4)}</span>}
        </div>
      )}
      <Handle type="target" position={Position.Top}    style={{ background: sk.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: sk.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  style={{ background: sk.color, width: 6, height: 6, top: '50%' }} id="right" />
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

function ResourceNode({ data }) {
  const r = data.resource;
  const alts = data.alternatives || [];
  const hasAlts = alts.length > 1;
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => hasAlts && setOpen(o => !o)}
        style={{ padding: '0.28rem 0.65rem', borderRadius: 6, background: r.color + '14', border: `1.5px dashed ${r.color}70`, display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', cursor: hasAlts ? 'pointer' : 'default', userSelect: 'none' }}>
        <span style={{ fontSize: '0.85rem' }}>{r.icon}</span>
        <span style={{ fontSize: '0.59rem', fontFamily: T.mono, color: r.color, fontWeight: 600 }}>{r.label}</span>
        {hasAlts && <span style={{ fontSize: '0.5rem', color: r.color, opacity: 0.7, marginLeft: 1 }}>▾</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 999, background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 7, boxShadow: '0 4px 18px rgba(0,0,0,0.12)', minWidth: 152, overflow: 'hidden' }}>
          {alts.map((alt, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); data.onProviderChange(alt); setOpen(false); }}
              style={{ padding: '0.32rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', background: alt.label === r.label ? alt.color + '14' : 'transparent', borderLeft: alt.label === r.label ? `3px solid ${alt.color}` : '3px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = alt.color + '12'}
              onMouseLeave={e => e.currentTarget.style.background = alt.label === r.label ? alt.color + '14' : 'transparent'}
            >
              <span style={{ fontSize: '0.85rem' }}>{alt.icon}</span>
              <span style={{ fontSize: '0.59rem', fontFamily: T.mono, color: alt.color, fontWeight: 600 }}>{alt.label}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: r.color, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}

const NODE_TYPES = { trigger: TriggerNode, step: StepNode, end: EndNode, resource: ResourceNode };

// Build ReactFlow nodes + edges from trigger + steps
// onProviderChange(stepIdx, paramPatch) called when user picks a provider from dropdown
function buildFlow(trigger, steps, selectedId, onSelect, onProviderChange) {
  const X = 0, GAP = 130;
  const RES_X = 260; // x for resource nodes
  const TRIG_H = 65, STEP_H = 65; // approx node heights for centering
  const nodes = [];
  const edges = [];

  function addResourceNodes(parentId, resources, centerY, stepIdx) {
    const total = resources.length;
    resources.forEach((r, ri) => {
      const rid = `__res__${parentId}_${ri}`;
      const altList = stepIdx >= 0 ? (SKILL_PROVIDERS[steps[stepIdx]?.skill] || []) : [];
      // y: center the resource cluster around the parent's vertical center
      const resY = centerY + (ri - (total - 1) / 2) * 36 - 12; // -12 to align with node mid
      nodes.push({
        id: rid, type: 'resource',
        position: { x: RES_X, y: resY },
        data: {
          resource: r,
          alternatives: altList,
          onProviderChange: stepIdx >= 0
            ? (alt) => onProviderChange(stepIdx, alt.params)
            : () => {},
        },
        draggable: false,
      });
      edges.push({
        id: `er-${parentId}-${ri}`, source: parentId, sourceHandle: 'right',
        target: rid,
        style: { stroke: r.color + '60', strokeWidth: 1.2, strokeDasharray: '5 4' },
        type: 'straight',
      });
    });
  }

  // Trigger node
  nodes.push({
    id: '__trigger__',
    type: 'trigger',
    position: { x: X, y: 0 },
    data: { trigger, selected: selectedId === '__trigger__', onSelect: () => onSelect('__trigger__') },
    draggable: false,
  });
  const trigRs = resourcesOf(null, null, trigger);
  if (trigRs.length) addResourceNodes('__trigger__', trigRs, TRIG_H / 2, -1);

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
    const stepRs = resourcesOf(s.skill, s.params, null);
    if (stepRs.length) addResourceNodes(s.id, stepRs, y + STEP_H / 2, i);
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
        <Field label="Alert phone (Twilio call on trigger)"><Input value={t.config?.phone || ''} onChange={v => updCfg({ phone: v })} placeholder="+1234567890" /></Field>
      </>}

      {t.type === 'db-condition' && <>
        <Field label="Table name">
          <Input value={t.config?.table || ''} onChange={v => { updCfg({ table: v }); upd({ label: `DB Condition · ${v}` }); }} placeholder="invoices" />
        </Field>
        <Field label="SQL condition">
          <textarea value={t.config?.condition || ''} onChange={e => updCfg({ condition: e.target.value })} placeholder="status = 'overdue' AND amount > 500" rows={3} style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: T.border, borderRadius: T.radius, padding: '0.32rem 0.55rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.text, outline: 'none', resize: 'vertical' }} />
        </Field>
        <Field label="Poll interval (s)"><Input value={String(t.config?.pollIntervalSec || 60)} onChange={v => updCfg({ pollIntervalSec: parseInt(v) || 60 })} /></Field>
        <Field label="Alert phone (Twilio call on match)"><Input value={t.config?.phone || ''} onChange={v => updCfg({ phone: v })} placeholder="+1234567890" /></Field>
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
function SkillsPalette({ onAdd, nfsSkills = [] }) {
  return (
    <div style={{ padding: '0.65rem 1rem' }}>
      <Label>Built-in Steps</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', marginBottom: nfsSkills.length ? '0.6rem' : 0 }}>
        {SKILLS.map(s => (
          <button key={s.id} onClick={() => onAdd(s)} style={{ background: T.faint, border: T.border, borderRadius: T.radius, padding: '0.2rem 0.45rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: '0.22rem', color: T.muted }} onMouseOver={e => e.currentTarget.style.background = s.color + '18'} onMouseOut={e => e.currentTarget.style.background = T.faint}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      {nfsSkills.length > 0 && <>
        <Label>Shared Library</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem' }}>
          {nfsSkills.map(s => {
            const slug = s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
            return (
              <button key={slug} onClick={() => onAdd({ id: slug, name: s.name, description: s.desc || '', color: T.orange, icon: '📦', code: s.code })}
                style={{ background: T.orange + '12', border: `1px solid ${T.orange}40`, borderRadius: T.radius, padding: '0.2rem 0.45rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: '0.22rem', color: T.orange }}
                onMouseOver={e => e.currentTarget.style.background = T.orange + '22'} onMouseOut={e => e.currentTarget.style.background = T.orange + '12'}>
                📦 {s.name}
              </button>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ─── Run Panel (Soft Run / Hard Run) ──────────────────────────────────────────
function RunStepCard({ stepNum, name, skill, status, input, output, durationMs, error, resources }) {
  const [open, setOpen] = useState(false);
  const sk = skillOf(skill);
  const isRunning = status === 'running';
  const isDone    = status === 'ok' || status === 'done';
  const isError   = status === 'error';
  const isSkipped = status === 'skipped';
  const borderColor = isRunning ? sk.color : isDone ? T.mint : isError ? T.red : isSkipped ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.07)';
  const bg          = isRunning ? sk.color + '0d' : isError ? T.red + '08' : 'transparent';

  return (
    <div style={{ background: T.card, border: `2px solid ${borderColor}`, borderRadius: T.radius, overflow: 'hidden', transition: 'border-color 0.25s', boxShadow: isRunning ? `0 0 14px ${sk.color}28` : 'none' }}>
      <div onClick={() => (isDone || isError) && setOpen(o => !o)} style={{ padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: (isDone || isError) ? 'pointer' : 'default' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', background: isDone ? T.mint : isError ? T.red : isRunning ? sk.color : T.faint, transition: 'background 0.25s' }}>
          {isDone ? <span style={{ fontSize: '0.72rem', color: '#fff' }}>✓</span> : isError ? <span style={{ fontSize: '0.72rem', color: '#fff' }}>✗</span> : isSkipped ? <span style={{ fontSize: '0.65rem', color: T.muted }}>—</span> : isRunning ? <span style={{ fontSize: '0.72rem', color: '#fff', animation: 'pulse 0.8s ease-in-out infinite alternate' }}>●</span> : <span>{sk.icon}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.68rem', fontWeight: 700, color: isRunning ? sk.color : isError ? T.red : isSkipped ? T.muted : T.text }}>
            {stepNum != null ? `Step ${stepNum}: ` : ''}{name}
          </div>
          {resources?.length > 0 && (
            <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
              {resources.map((r, i) => <span key={i} style={{ fontSize: '0.51rem', fontFamily: T.mono, background: r.color + '20', color: r.color, borderRadius: 3, padding: '1px 5px' }}>{r.icon} {r.label}</span>)}
            </div>
          )}
          {isError && error && <div style={{ fontSize: '0.62rem', color: T.red, fontFamily: T.mono, marginTop: 2 }}>✗ {error}</div>}
        </div>
        {durationMs != null && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted, flexShrink: 0 }}>{durationMs < 1000 ? durationMs + 'ms' : (durationMs/1000).toFixed(1) + 's'}</span>}
        {(isDone || isError) && <span style={{ fontSize: '0.55rem', color: T.muted, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>}
      </div>
      {open && (
        <div style={{ borderTop: T.border, padding: '0.55rem 0.85rem', display: 'flex', gap: '0.7rem', background: T.faint }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: '0.53rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Input</div>
            <pre style={{ margin: 0, fontFamily: T.mono, fontSize: '0.59rem', color: T.text, background: '#fff', borderRadius: 4, padding: '0.4rem', overflowX: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap', wordBreak: 'break-all', border: T.border }}>
              {input != null ? JSON.stringify(input, null, 2) : '—'}
            </pre>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: '0.53rem', color: isDone ? T.mint : T.red, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Output</div>
            <pre style={{ margin: 0, fontFamily: T.mono, fontSize: '0.59rem', color: T.text, background: isDone ? T.mint + '08' : T.red + '08', borderRadius: 4, padding: '0.4rem', overflowX: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap', wordBreak: 'break-all', border: `1px solid ${isDone ? T.mint + '40' : T.red + '40'}` }}>
              {output != null ? JSON.stringify(output, null, 2) : '—'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function RunPanel({ trigger, steps, sessionId, workerId }) {
  const [runData,  setRunData]  = useState(null);   // { mode, triggerData, steps, totalDurationMs }
  const [running,  setRunning]  = useState(false);
  const [runMode,  setRunMode]  = useState(null);   // 'soft' | 'hard'
  const [visibleN, setVisibleN] = useState(0);      // how many steps to reveal (animated)
  const intRef = useRef(null);

  async function startRun(mode) {
    setRunning(true); setRunMode(mode); setRunData(null); setVisibleN(0);
    clearInterval(intRef.current);
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/run-steps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mode }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setRunData(d);
      // Animate reveal: show one step every 600ms
      let n = 0;
      intRef.current = setInterval(() => {
        n++;
        setVisibleN(n);
        if (n >= (d.steps || []).length) clearInterval(intRef.current);
      }, 600);
    } catch(e) {
      setRunData({ error: e.message, steps: [] });
    } finally {
      setRunning(false);
    }
  }

  const isSoft = runMode === 'soft';
  const modeColor = isSoft ? T.blue : T.red;
  const totalMs = runData?.totalDurationMs;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Mode header */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.68rem', fontWeight: 700, marginBottom: 3 }}>
            {runData ? (isSoft ? '🔍 Soft Run' : '⚡ Hard Run') + ' · ' + (runData.steps?.length || 0) + ' steps' : 'Run Workflow'}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.muted }}>
            {runData
              ? (isSoft ? 'Read-only · no external actions performed' : 'Live · real calls / messages / DB writes performed')
              : 'Soft run = read only, inspect values. Hard run = real external actions (calls, messages, DB writes).'}
          </div>
        </div>
        {runData && !running && <button onClick={() => { setRunData(null); setVisibleN(0); }} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '0.28rem 0.6rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>Reset</button>}
        <Btn small ghost onClick={() => startRun('soft')} disabled={running} style={{ borderColor: T.blue + '80', color: T.blue }}>
          {running && runMode === 'soft' ? '⟳ Running…' : '🔍 Soft Run'}
        </Btn>
        <Btn small color={T.red} onClick={() => startRun('hard')} disabled={running}>
          {running && runMode === 'hard' ? '⟳ Running…' : '⚡ Hard Run'}
        </Btn>
      </div>

      {runData?.error && (
        <div style={{ background: T.red + '12', border: `1px solid ${T.red}40`, borderRadius: T.radius, padding: '0.65rem 1rem', fontFamily: T.mono, fontSize: '0.7rem', color: T.red }}>
          ✗ {runData.error}
        </div>
      )}

      {/* Trigger result */}
      {runData && (
        <RunStepCard
          stepNum={null}
          name={trigger?.label || trigger?.type || 'Trigger'}
          skill={null}
          status="ok"
          input={{ type: trigger?.type, ...trigger?.config }}
          output={runData.triggerData}
          durationMs={null}
          resources={resourcesOf(null, null, trigger)}
        />
      )}

      {/* Step results */}
      {runData && (runData.steps || []).map((sr, i) => (
        <div key={sr.id} style={{ opacity: i < visibleN ? 1 : 0.25, transform: i < visibleN ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.35s, transform 0.35s' }}>
          {i > 0 && <div style={{ height: 20, display: 'flex', alignItems: 'center', paddingLeft: 22 }}><div style={{ width: 2, height: 20, background: i < visibleN ? T.mint + '60' : 'rgba(0,0,0,0.07)', marginLeft: 11, transition: 'background 0.4s' }} /></div>}
          <RunStepCard
            stepNum={i + 1}
            name={sr.name}
            skill={sr.skill}
            status={i < visibleN ? sr.status : 'pending'}
            input={sr.input}
            output={sr.output}
            durationMs={i < visibleN ? sr.durationMs : null}
            error={sr.error}
            resources={resourcesOf(sr.skill, steps[i]?.params, null)}
          />
        </div>
      ))}

      {/* Pending step placeholders (before run) */}
      {!runData && steps.map((step, i) => (
        <div key={step.id}>
          {i > 0 && <div style={{ height: 18, display: 'flex', alignItems: 'center', paddingLeft: 22 }}><div style={{ width: 2, height: 18, background: 'rgba(0,0,0,0.07)', marginLeft: 11 }} /></div>}
          <RunStepCard stepNum={i + 1} name={step.name || step.skill} skill={step.skill} status="pending" input={null} output={null} durationMs={null} resources={resourcesOf(step.skill, step.params, null)} />
        </div>
      ))}

      {steps.length === 0 && !runData && (
        <div style={{ textAlign: 'center', color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, padding: '1.5rem' }}>No steps configured. Add steps in the Flow tab.</div>
      )}

      {/* Summary */}
      {runData && visibleN >= (runData.steps || []).length && (
        <div style={{ background: T.card, border: `2px solid ${modeColor}30`, borderRadius: T.radius, padding: '0.7rem 1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: modeColor, fontWeight: 700, textTransform: 'uppercase' }}>{isSoft ? '🔍 Soft Run' : '⚡ Hard Run'} complete</span>
          <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>
            {(runData.steps || []).filter(s => s.status === 'ok').length} ok ·{' '}
            {(runData.steps || []).filter(s => s.status === 'error').length} errors ·{' '}
            {(runData.steps || []).filter(s => s.status === 'skipped').length} skipped
          </span>
          {totalMs != null && <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, marginLeft: 'auto' }}>⏱ {totalMs < 1000 ? totalMs + 'ms' : (totalMs/1000).toFixed(1) + 's'} total</span>}
        </div>
      )}
    </div>
  );
}

// ─── Old Simulate Panel (replaced by RunPanel above) ──────────────────────────
function SimStepCard({ index, label, icon, color, resources, input, output, status, estimate }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = status === 'active';
  const isDone   = status === 'done';
  return (
    <div style={{ background: T.card, border: `2px solid ${isActive ? color : isDone ? T.mint + '80' : 'rgba(0,0,0,0.07)'}`, borderRadius: T.radius, overflow: 'hidden', transition: 'border-color 0.35s', boxShadow: isActive ? `0 0 12px ${color}33` : 'none' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? T.mint : isActive ? color : T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' }}>
          {isDone ? <span style={{ fontSize: '0.75rem', color: '#fff' }}>✓</span> : <span style={{ fontSize: '0.9rem' }}>{icon}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 700, color: isActive ? color : isDone ? T.text : T.muted }}>
            {index >= 0 ? `Step ${index + 1}: ` : ''}{label}
          </div>
          {resources?.length > 0 && (
            <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
              {resources.map((r, i) => (
                <span key={i} style={{ fontSize: '0.52rem', fontFamily: T.mono, background: r.color + '20', color: r.color, borderRadius: 3, padding: '1px 5px' }}>
                  {r.icon} {r.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {estimate && (
          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
            {estimate.sec > 0   && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', background: T.faint,           color: T.muted,   borderRadius: 3, padding: '1px 5px' }}>⏱ {estimate.sec}s</span>}
            {estimate.tokens > 0 && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', background: T.purple + '18', color: T.purple,  borderRadius: 3, padding: '1px 5px' }}>🔤 {estimate.tokens}</span>}
            {estimate.costUsd > 0 && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', background: T.orange + '18', color: T.orange, borderRadius: 3, padding: '1px 5px' }}>${estimate.costUsd.toFixed(4)}</span>}
            {estimate.wh > 0   && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', background: T.mint + '18',    color: T.mint,    borderRadius: 3, padding: '1px 5px' }}>⚡{(estimate.wh * 1000).toFixed(2)}mWh</span>}
          </div>
        )}
        <span style={{ fontSize: '0.58rem', color: T.muted, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      {expanded && (
        <div style={{ borderTop: T.border, padding: '0.6rem 0.85rem', display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Input</div>
            <pre style={{ margin: 0, fontFamily: T.mono, fontSize: '0.59rem', color: T.text, background: T.faint, borderRadius: 4, padding: '0.4rem', overflowX: 'auto', maxHeight: 140, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {input ? JSON.stringify(input, null, 2) : '—'}
            </pre>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.mint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Expected Output</div>
            <pre style={{ margin: 0, fontFamily: T.mono, fontSize: '0.59rem', color: T.text, background: T.mint + '08', borderRadius: 4, padding: '0.4rem', overflowX: 'auto', maxHeight: 140, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {output != null ? JSON.stringify(output, null, 2) : '(run simulation to see output)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function SimulatePanel({ trigger, steps, logs, sessionId, workerId }) {
  const [simulating, setSimulating] = useState(false);
  const [simData,    setSimData]    = useState(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [playing,    setPlaying]    = useState(false);
  const intRef = useRef(null);

  // Derive input/output shape per step from trigger data + step config
  function buildStepSims(triggerData) {
    const tRows = triggerData?.rows || [];
    const tRow  = tRows[0] || {};
    return steps.map((step, i) => {
      const p = step.params || {};
      const est = { ...(STEP_ESTIMATES[step.skill] || { sec: 0.1, tokens: 0, costUsd: 0, wh: 0 }) };
      let input = {}, output = {};
      switch (step.skill) {
        case 'query-platform':
          input  = { table: p.table || trigger?.config?.table || '?', condition: p.condition || trigger?.config?.condition };
          output = { rows: tRows, count: tRows.length };
          break;
        case 'generate-report':
          input  = { data: tRow, prompt: (p.prompt || 'Analyze the following data').slice(0, 80) + '…' };
          output = { report: '## Report\n\n*AI-generated summary would appear here.*', tokens_used: est.tokens };
          break;
        case 'send-notification':
          input  = { chat_id: p.chatId || p.chat_id || '(from config)', message: (p.message || 'Alert: {item} stock={stock}').replace(/{(\w+)}/g, (_, k) => tRow[k] ?? `{${k}}`) };
          output = { sent: true, message_id: Math.floor(Math.random() * 900000 + 100000) };
          break;
        case 'call-webhook':
          input  = { url: p.url || '(configured URL)', method: 'POST', body: tRow };
          output = { status: 200, response: { queued: true } };
          break;
        case 'condition':
          input  = { value: tRow, condition: p.condition || '?' };
          output = { pass: true, matched_value: tRow };
          break;
        case 'transform-data':
          input  = { data: tRow, transform: p.transform || 'passthrough' };
          output = { transformed: tRow };
          break;
        default:
          input  = tRow;
          output = { success: true };
      }
      return { step, resources: resourcesOf(step.skill, p, null), input, output, estimate: est };
    });
  }

  async function runSimulation() {
    setSimulating(true); setSimData(null); setActiveStep(-1); setPlaying(false);
    clearInterval(intRef.current);
    let triggerData = null;
    try {
      const r = await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/simulate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (r.ok) { const d = await r.json(); triggerData = d.triggerData || null; }
    } catch {}
    const stepSims = buildStepSims(triggerData);
    setSimData({ triggerData, stepSims });
    setActiveStep(0);
    setPlaying(true);
    setSimulating(false);
  }

  useEffect(() => {
    if (!playing || !simData) return;
    const total = simData.stepSims.length;
    intRef.current = setInterval(() => {
      setActiveStep(n => {
        if (n >= total - 1) { setPlaying(false); return n; }
        return n + 1;
      });
    }, 1300);
    return () => clearInterval(intRef.current);
  }, [playing, simData]);

  const trigRs = resourcesOf(null, null, trigger);
  const totalEst = simData?.stepSims?.reduce((acc, ss) => ({
    sec: acc.sec + ss.estimate.sec, tokens: acc.tokens + ss.estimate.tokens,
    costUsd: acc.costUsd + ss.estimate.costUsd, wh: acc.wh + ss.estimate.wh,
  }), { sec: 0, tokens: 0, costUsd: 0, wh: 0 }) || null;

  // Per-step log-based refinement: use avg powerWh from logs
  const avgWh = logs.filter(l => l.powerWh).reduce((s, l) => s + l.powerWh, 0) / Math.max(1, logs.filter(l => l.powerWh).length);

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Header */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.68rem', fontWeight: 700, marginBottom: 3 }}>Workflow Simulation</div>
          <div style={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.muted }}>
            Dry-run each step · show data flow · estimate cost &amp; duration
            {logs.length > 0 && <span style={{ color: T.mint }}> · {logs.length} historical run{logs.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        {simData && !playing && (
          <button onClick={() => { setSimData(null); setActiveStep(-1); }} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '0.28rem 0.6rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>Reset</button>
        )}
        <Btn small color={T.purple} onClick={runSimulation} disabled={simulating}>
          {simulating ? '⟳ Simulating…' : simData ? '↺ Re-run' : '▶ Simulate'}
        </Btn>
      </div>

      {/* Trigger card */}
      <SimStepCard
        index={-1}
        label={trigger?.label || trigger?.type || 'Trigger'}
        icon={TRIGGERS.find(t => t.id === trigger?.type)?.icon || '⚡'}
        color={T.orange}
        resources={trigRs}
        input={{ type: trigger?.type, table: trigger?.config?.table, condition: trigger?.config?.condition }}
        output={simData?.triggerData ? { matched: simData.triggerData.matched, rows: simData.triggerData.rows, count: simData.triggerData.count } : simData ? { matched: true, note: 'live check unavailable — using config' } : null}
        status={simData ? 'done' : 'pending'}
        estimate={null}
      />

      {/* Step cards */}
      {(simData?.stepSims || steps.map(step => ({ step, resources: resourcesOf(step.skill, step.params, null), input: null, output: null, estimate: STEP_ESTIMATES[step.skill] || { sec: 0.1, tokens: 0, costUsd: 0, wh: 0 } }))).map((ss, i) => (
        <SimStepCard
          key={ss.step.id}
          index={i}
          label={ss.step.name || ss.step.skill}
          icon={skillOf(ss.step.skill).icon}
          color={skillOf(ss.step.skill).color}
          resources={ss.resources}
          input={ss.input}
          output={activeStep > i || (!playing && simData) ? ss.output : null}
          status={!simData ? 'pending' : activeStep > i ? 'done' : activeStep === i ? 'active' : 'pending'}
          estimate={ss.estimate}
        />
      ))}

      {steps.length === 0 && (
        <div style={{ textAlign: 'center', color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, padding: '1rem' }}>
          No steps yet — add steps from the Flow tab.
        </div>
      )}

      {/* Totals summary */}
      {totalEst && !playing && (
        <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.75rem 1rem' }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Run Estimates · {steps.length} step{steps.length !== 1 ? 's' : ''}
            {logs.length > 0 && avgWh > 0 && <span style={{ color: T.mint }}> · actual avg {(avgWh * 1000).toFixed(2)} mWh</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            {[
              { icon: '⏱', label: 'Duration',   value: totalEst.sec.toFixed(2) + 's',           color: T.text   },
              { icon: '🔤', label: 'Tokens',     value: totalEst.tokens.toLocaleString(),        color: T.purple },
              { icon: '💰', label: 'Cost',       value: '$' + totalEst.costUsd.toFixed(4),       color: T.orange },
              { icon: '⚡', label: 'Energy',     value: (totalEst.wh * 1000).toFixed(2) + ' mWh', color: T.mint  },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background: T.faint, borderRadius: T.radius, padding: '0.4rem 0.7rem', fontFamily: T.mono, textAlign: 'center' }}>
                <div style={{ fontSize: '0.55rem', color: T.muted, textTransform: 'uppercase', marginBottom: 2 }}>{icon} {label}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Replay Panel ─────────────────────────────────────────────────────────────
// Shows each run (log entry) as a workflow execution — trigger + steps animated.
function ReplayPanel({ logs, steps, trigger }) {
  const runs = [...(logs || [])].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  // Which run we're viewing
  const [runIdx, setRunIdx]   = useState(() => Math.max(0, runs.length - 1));
  // Which node in the workflow is currently "active" (-1=none, 0=trigger, 1..n=step)
  const [nodeIdx, setNodeIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const currentRun = runs[runIdx] || null;
  const trig = trigger || {};
  const allSteps = steps || [];

  // All "workflow nodes": trigger node + step nodes
  const flowNodes = [
    { id: '__trigger__', label: trig.label || trig.type || 'Trigger', icon: TRIGGERS.find(t => t.id === trig.type)?.icon || '⚡', color: T.blue, skill: null },
    ...allSteps.map(s => {
      const sk = SKILLS.find(x => x.id === s.skill) || { icon: '●', color: T.muted };
      return { id: s.id, label: s.name || s.skill, icon: sk.icon, color: sk.color, skill: s.skill };
    }),
  ];
  const total = flowNodes.length;

  // Derive a message for each workflow node from the current run's log entry
  function nodeMessage(node, run) {
    if (!run) return null;
    if (node.id === '__trigger__') {
      if (run.trigger)  return `Condition: ${run.trigger}`;
      if (run.message)  return run.message.slice(0, 80);
      return 'Worker triggered';
    }
    // Step messages derived from log data
    const sk = node.skill;
    if (sk === 'query-platform' || sk === 'transform-data') {
      if (run.stock !== undefined) return `Result: stock = ${run.stock}`;
      if (run.message?.includes('matched') || run.message?.includes('Alert')) return `Matched: ${run.message?.slice(0,60)}`;
      return 'Platform queried';
    }
    if (sk === 'generate-report') return run.message ? run.message.slice(0, 80) : 'Report generated';
    if (sk === 'send-notification') return run.message ? `Sent: ${run.message.slice(0,70)}` : 'Notification sent via Telegram';
    if (sk === 'call-webhook')      return run.phone ? `Called ${run.phone}` : 'Webhook called';
    if (sk === 'condition') {
      return run.success !== false ? 'Condition: true → continue' : 'Condition: false → skip';
    }
    if (sk === 'wait') return 'Waiting…';
    if (run.success === false) return `Error: ${run.message || 'unknown'}`;
    return run.message?.slice(0, 80) || '✓ Complete';
  }

  // Play animation: step through nodes
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setNodeIdx(n => {
          if (n >= total - 1) { setPlaying(false); return n; }
          return n + 1;
        });
      }, 900);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, total]);

  function startPlay() {
    setNodeIdx(0);
    setPlaying(true);
  }

  if (runs.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>No runs yet. Click ▶ Run to trigger the worker.</div>;
  }

  const isAlert = currentRun?.message?.includes('Alert') || currentRun?.message?.includes('matched');
  const isErr   = currentRun?.success === false || currentRun?.type?.includes('error');
  const runColor = isErr ? T.red : isAlert ? T.orange : T.mint;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Run selector */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Run</span>
        <button onClick={() => { setRunIdx(i => Math.max(0, i - 1)); setNodeIdx(-1); setPlaying(false); }}
          disabled={runIdx === 0}
          style={{ background: 'none', border: T.border, borderRadius: 4, padding: '0.22rem 0.45rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, opacity: runIdx === 0 ? 0.3 : 1 }}>◀</button>
        <span style={{ fontFamily: T.mono, fontSize: '0.68rem', fontWeight: 700, color: runColor }}>
          {runIdx + 1} / {runs.length}
        </span>
        <button onClick={() => { setRunIdx(i => Math.min(runs.length - 1, i + 1)); setNodeIdx(-1); setPlaying(false); }}
          disabled={runIdx === runs.length - 1}
          style={{ background: 'none', border: T.border, borderRadius: 4, padding: '0.22rem 0.45rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, opacity: runIdx === runs.length - 1 ? 0.3 : 1 }}>▶</button>
        {currentRun?.at && (
          <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, flex: 1, textAlign: 'right' }}>
            {new Date(currentRun.at).toLocaleString()}
          </span>
        )}
        {currentRun?.powerWh !== undefined && (
          <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.orange }}>⚡{(currentRun.powerWh * 1000).toFixed(2)}mWh</span>
        )}
      </div>

      {/* Run summary */}
      {currentRun && (
        <div style={{ background: T.card, border: `2px solid ${runColor}44`, borderRadius: T.radius, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{isErr ? '✗' : isAlert ? '🔔' : currentRun.type === 'twilio_call' ? '📞' : '✓'}</span>
          <span style={{ fontFamily: T.mono, fontSize: '0.72rem', fontWeight: 700, color: isErr ? T.red : T.text, flex: 1 }}>{currentRun.message || currentRun.type || 'Run completed'}</span>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {Object.entries(currentRun).filter(([k]) => !['at','message','type','success','powerWh'].includes(k)).map(([k,v]) => (
              <span key={k} style={{ fontFamily: T.mono, fontSize: '0.58rem', background: T.faint, borderRadius: 3, padding: '1px 5px', color: T.muted }}>
                {k}: <strong style={{ color: T.text }}>{String(v)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workflow execution animation */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 1rem', borderBottom: T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Execution flow</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => { setNodeIdx(-1); setPlaying(false); }}
              style={{ background: 'none', border: T.border, borderRadius: 4, padding: '0.2rem 0.4rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>⏮</button>
            <button onClick={() => setNodeIdx(n => Math.max(-1, n - 1))}
              style={{ background: 'none', border: T.border, borderRadius: 4, padding: '0.2rem 0.4rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>◀</button>
            <button
              onClick={() => { if (nodeIdx >= total - 1) { setNodeIdx(0); setPlaying(true); } else { startPlay(); } }}
              style={{ background: playing ? T.red : T.mint, border: 'none', borderRadius: 4, padding: '0.2rem 0.65rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: playing ? '#fff' : T.text, fontWeight: 700 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => { setPlaying(false); setNodeIdx(n => Math.min(total - 1, n + 1)); }}
              style={{ background: 'none', border: T.border, borderRadius: 4, padding: '0.2rem 0.4rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>▶</button>
          </div>
        </div>

        {/* Step-by-step nodes */}
        <div style={{ padding: '1rem' }}>
          {flowNodes.map((node, i) => {
            const isActive  = nodeIdx === i;
            const isDone    = nodeIdx > i;
            const isPending = nodeIdx < i;
            const msg       = nodeMessage(node, currentRun);
            const borderColor = isDone ? T.mint : isActive ? node.color : 'rgba(0,0,0,0.07)';
            const bg          = isActive ? node.color + '14' : isDone ? T.mint + '08' : 'transparent';
            return (
              <div key={node.id}>
                {i > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 20, height: 24 }}>
                    <div style={{ width: 2, height: 24, background: isDone ? T.mint + '80' : 'rgba(0,0,0,0.08)', marginLeft: 11, transition: 'background 0.4s' }} />
                  </div>
                )}
                <div
                  onClick={() => { setPlaying(false); setNodeIdx(isActive ? -1 : i); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0.65rem', borderRadius: T.radius, border: `2px solid ${borderColor}`, background: bg, cursor: 'pointer', transition: 'all 0.3s', boxShadow: isActive ? `0 0 10px ${node.color}33` : 'none' }}>
                  {/* Icon circle */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isActive ? node.color : isDone ? T.mint : T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, transition: 'background 0.3s' }}>
                    {isDone ? <span style={{ fontSize: '0.75rem', color: '#fff' }}>✓</span> : node.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Step label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: msg && isActive ? '0.3rem' : 0 }}>
                      <span style={{ fontFamily: T.mono, fontSize: '0.68rem', fontWeight: isActive ? 700 : 600, color: isActive ? node.color : isDone ? T.text : T.muted }}>
                        {node.label}
                      </span>
                      {isPending && nodeIdx === -1 && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted }}>waiting</span>}
                      {isActive && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: node.color, animation: playing ? 'pulse 1s ease-in-out infinite alternate' : 'none' }}>● running</span>}
                      {isDone && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.mint }}>done</span>}
                    </div>
                    {/* Message (shown when active or done) */}
                    {msg && (isActive || isDone) && (
                      <div style={{ fontFamily: T.mono, fontSize: '0.65rem', color: isActive ? T.text : T.muted, lineHeight: 1.5, background: isActive ? 'rgba(0,0,0,0.03)' : 'transparent', borderRadius: 4, padding: isActive ? '0.25rem 0.4rem' : '0' }}>
                        {msg}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }`}</style>
      </div>

      {/* Run list at bottom */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
        <div style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.4rem 0.9rem', borderBottom: T.border }}>All {runs.length} runs</div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {[...runs].reverse().map((run, ri) => {
            const realIdx = runs.length - 1 - ri;
            const active  = realIdx === runIdx;
            const rIsErr  = run.success === false || run.type?.includes('error');
            const rIsAlert = run.message?.includes('Alert') || run.message?.includes('matched') || run.type === 'twilio_call';
            return (
              <div key={ri} onClick={() => { setRunIdx(realIdx); setNodeIdx(-1); setPlaying(false); }}
                style={{ display: 'flex', gap: '0.5rem', padding: '0.28rem 0.9rem', borderBottom: ri < runs.length - 1 ? T.border : 'none', cursor: 'pointer', background: active ? T.blue + '12' : 'transparent', borderLeft: `3px solid ${active ? T.blue : rIsErr ? T.red : rIsAlert ? T.orange : 'transparent'}`, alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', flexShrink: 0 }}>{rIsErr ? '✗' : rIsAlert ? '🔔' : '✓'}</span>
                <span style={{ fontFamily: T.mono, fontSize: '0.56rem', color: T.muted, flexShrink: 0 }}>
                  {run.at ? new Date(run.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${realIdx+1}`}
                </span>
                <span style={{ flex: 1, fontFamily: T.mono, fontSize: '0.63rem', color: active ? T.text : rIsErr ? T.red : rIsAlert ? T.orange : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.message || run.type || 'run'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Logs Panel ───────────────────────────────────────────────────────────────
function LogsPanel({ logs }) {
  if (!logs || logs.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: T.muted, fontSize: '0.78rem', fontFamily: T.mono }}>No runs yet.</div>
  );

  const alerts   = logs.filter(l => l.success === true && !l.type);
  const failures = logs.filter(l => l.success === false);
  const calls    = logs.filter(l => l.type === 'twilio_call');
  const callErrs = logs.filter(l => l.type === 'twilio_call_error');
  const totalWh  = logs.reduce((s, l) => s + (l.powerWh || 0), 0);
  const measured  = logs.filter(l => l.powerWh !== undefined).length;

  // Show most-recent first
  const sorted = [...logs].reverse();

  function rowColor(log) {
    if (log.type === 'twilio_call')       return T.blue;
    if (log.type === 'twilio_call_error') return T.red;
    if (log.success === false)            return T.red;
    if (log.message && (log.message.includes('Alert') || log.message.includes('matched'))) return T.orange;
    return T.muted;
  }
  function rowIcon(log) {
    if (log.type === 'twilio_call')       return '📞';
    if (log.type === 'twilio_call_error') return '❌';
    if (log.success === false)            return '✗';
    if (log.message && (log.message.includes('Alert') || log.message.includes('matched'))) return '🔔';
    return '✓';
  }
  function rowLabel(log) {
    if (log.type === 'twilio_call')       return `Call ${log.to} · ${log.status} · ${log.sid ? log.sid.slice(0,12) + '…' : ''}`;
    if (log.type === 'twilio_call_error') return `Call error: ${log.error}`;
    return log.message || 'Completed';
  }

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Alerts fired', value: alerts.length, color: T.orange },
          { label: 'Failures', value: failures.length, color: T.red },
          { label: 'Calls queued', value: calls.length, color: T.blue },
          ...(callErrs.length ? [{ label: 'Call errors', value: callErrs.length, color: T.red }] : []),
          ...(measured > 0 ? [{ label: 'Energy', value: (totalWh * 1000).toFixed(3) + ' mWh', color: T.muted }] : []),
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontFamily: T.mono }}>
            <div style={{ color: T.muted, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
            <div style={{ color, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Log rows */}
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
        {sorted.map((log, i) => {
          const color = rowColor(log);
          return (
            <div key={i} style={{ display: 'flex', gap: '0.65rem', fontSize: '0.68rem', fontFamily: T.mono, padding: '0.42rem 0.9rem', borderBottom: i < sorted.length - 1 ? T.border : 'none', alignItems: 'flex-start', borderLeft: `3px solid ${color}40` }}>
              <span style={{ color: T.muted, flexShrink: 0, fontSize: '0.58rem', paddingTop: 2, minWidth: 60 }}>
                {new Date(log.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{ color, flexShrink: 0, fontSize: '0.8rem' }}>{rowIcon(log)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: log.success === false || log.type?.includes('error') ? T.red : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowLabel(log)}</div>
                {log.trigger && <div style={{ fontSize: '0.58rem', color: T.muted, marginTop: 1 }}>trigger: {log.trigger}</div>}
                {log.stock !== undefined && <div style={{ fontSize: '0.58rem', color: T.muted, marginTop: 1 }}>stock: {log.stock}</div>}
              </div>
              {log.powerWh !== undefined && (
                <span style={{ color: T.orange, flexShrink: 0, fontSize: '0.56rem', paddingTop: 2 }}>⚡{(log.powerWh * 1000).toFixed(3)}mWh</span>
              )}
            </div>
          );
        })}
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

  const [nfsSkills, setNfsSkills] = useState([]);

  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Sync ReactFlow graph whenever trigger/steps/selectedNodeId changes
  useEffect(() => {
    if (!trigger) return;
    const { nodes, edges } = buildFlow(
      trigger, steps, selectedNodeId,
      id => setSelectedNodeId(prev => prev === id ? null : id),
      (stepIdx, paramPatch) => {
        setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, params: { ...s.params, ...paramPatch } } : s));
        setDirty(true);
      },
    );
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
    fetch('/api/skills').then(r => r.json()).then(d => setNfsSkills(d.skills || [])).catch(() => {});
  }, []);

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
      // Always save current flow first so session has latest trigger.config (phone, etc.)
      await fetch(`/api/demo/workers/${encodeURIComponent(workerId)}/flow`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, flow: { trigger, steps } }) });
      const r = await fetch('/api/demo/workers/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, worker: { ...worker, trigger, steps } }) });
      const d = await r.json();
      setWorker(prev => ({ ...prev, status: d.status || 'deployed' }));
      setDirty(false);
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
        {worker?.status === 'deployed' ? (
          <>
            <Btn small ghost onClick={handleDeploy} disabled={deploying}>{deploying ? 'Redeploying…' : '↺ Redeploy'}</Btn>
            <Btn small color={T.blue} onClick={handleRun} disabled={running}>{running ? 'Running…' : '▶ Run'}</Btn>
          </>
        ) : (
          <Btn small color={T.mint} style={{ color: T.text }} onClick={handleDeploy} disabled={deploying}>{deploying ? 'Deploying…' : 'Deploy'}</Btn>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: T.card, borderBottom: T.border, padding: '0 1.25rem', display: 'flex' }}>
        {['flow', 'logs', 'replay', 'simulate'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'logs' || tab === 'replay' || tab === 'simulate') fetchLogs(); }} style={{ background: 'none', border: 'none', padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.6rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', color: activeTab === tab ? T.text : T.muted, borderBottom: activeTab === tab ? `2px solid ${tab === 'simulate' ? T.purple : T.text}` : '2px solid transparent', marginBottom: -1 }}>{tab === 'simulate' ? '⟳ Simulate' : tab}</button>
        ))}
      </div>

      {/* Flow tab */}
      {activeTab === 'flow' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* ReactFlow canvas */}
          <div style={{ flex: 1, position: 'relative' }}>
            <ReactFlow
              key={`${trigger?.type}_${steps.length}_${steps.map(s=>s.skill).join(',')}`}
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
              <SkillsPalette onAdd={addStep} nfsSkills={nfsSkills} />
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

      {activeTab === 'replay' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ReplayPanel logs={logs} steps={steps} trigger={trigger} />
        </div>
      )}

      {activeTab === 'simulate' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RunPanel trigger={trigger} steps={steps} sessionId={sessionId} workerId={workerId} />
        </div>
      )}
    </div>
  );
}
