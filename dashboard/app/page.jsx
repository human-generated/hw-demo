'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReactFlow, Background, Handle, Position, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Homepage } from './components/Homepage';
import { Workspace } from './components/Workspace';
import { AIWorkers } from './components/AIWorkers';
import { WorkerPage, PlatformPreviewCard } from './components/WorkerPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { LoginPage } from './components/LoginPage';
import { DockIcons } from './components/DockIcons';
import { MeshGradient } from '@paper-design/shaders-react';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:     '#F4F5F7',
  card:   '#FFFFFF',
  text:   '#1a1a1a',
  muted:  '#8e8e93',
  faint:  'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.06)',
  shadow: '0 1px 4px rgba(0,0,0,0.03)',
  radius: '12px',
  mono:   "'IBM Plex Mono', 'DM Mono', monospace",
  ui:     "'DM Sans', system-ui, sans-serif",
  mint:   '#34c759',
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  red:    '#ff3b30',
  yellow: '#F5C842',
};

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ color, children, style = {} }) {
  return (
    <span style={{
      background: color || T.faint, color: T.muted,
      borderRadius: '999px', padding: '2px 10px',
      fontSize: '0.6rem', fontFamily: T.mono,
      fontWeight: '500', textTransform: 'uppercase',
      letterSpacing: '0.08em', display: 'inline-block', ...style,
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
        background: ghost ? 'rgba(255,255,255,0.7)' : (color || T.text),
        color: ghost ? T.text : '#fff',
        border: ghost ? `1px solid rgba(0,0,0,0.09)` : 'none',
        borderRadius: '10px',
        padding: small ? '0.3rem 0.85rem' : '0.55rem 1.25rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        fontFamily: T.ui, fontSize: small ? '0.72rem' : '0.8rem',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
        whiteSpace: 'nowrap',
        boxShadow: ghost ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
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
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch('/api/demo/sessions', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => clearTimeout(t));
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
          function timeAgo(iso) {
            if (!iso) return null;
            const ms = Date.now() - new Date(iso).getTime();
            if (ms < 60000) return 'just now';
            if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`;
            if (ms < 86400000) return `${Math.floor(ms/3600000)}h ago`;
            if (ms < 7*86400000) return `${Math.floor(ms/86400000)}d ago`;
            return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }
          const ago = timeAgo(s.updatedAt || s.createdAt);
          const createdLabel = s.createdAt ? (() => {
            const d = new Date(s.createdAt);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
              d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          })() : null;
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
                {createdLabel && <span>{createdLabel}</span>}
                {(s.platforms > 0 || s.workers > 0) && <><span>·</span><span>{s.platforms}P {s.workers}W</span></>}
                {whLabel && <><span>·</span><span style={{ color: T.mint }}>{whLabel}</span></>}
                {ago && createdLabel && <><span>·</span><span>{ago}</span></>}
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

// ── Shared overlay shell ───────────────────────────────────────────────────────
function HubOverlay({ onClose, children, title, subtitle }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MeshGradient style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} speed={0.19} scale={1.51} distortion={0.88} swirl={1} colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']} />
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)', borderRadius: 20, padding: '2rem', width: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            {title && <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>{title}</div>}
            {subtitle && <div style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '1.2rem', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ── NewHubWizard ───────────────────────────────────────────────────────────────
function NewHubWizard({ sessionId, onDone, onCancel }) {
  const [step, setStep] = useState(0); // 0=company, 1=researching, 2=confirm, 3=building, 4=done
  const [companyInput, setCompanyInput] = useState('');
  const [research, setResearch] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  const [building, setBuilding] = useState(false);
  const [buildMsg, setBuildMsg] = useState('');

  async function doResearch(e) {
    e.preventDefault();
    if (!companyInput.trim()) return;
    setStep(1);
    try {
      const r = await fetch('/api/demo/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: companyInput.trim(), sessionId }) });
      const d = await r.json();
      setResearch(d);
      setPlatforms((d.platforms || []).map(p => ({ ...p })));
      setStep(2);
    } catch { setStep(2); setResearch(null); }
  }

  async function doBuild() {
    setStep(3); setBuilding(true);
    setBuildMsg('Discovering platform APIs…');
    const selected = platforms.filter(p => p.selected);
    try {
      setTimeout(() => setBuildMsg('Cloning synthetic environment…'), 1800);
      setTimeout(() => setBuildMsg('Spinning up sandboxes…'), 4000);
      const r = await fetch('/api/demo/build-platforms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, platforms: selected, feedback }) });
      await r.json();
    } catch {}
    setBuilding(false);
    setStep(4);
    setTimeout(() => onDone?.(), 1200);
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const readers = files.map(f => new Promise(res => { const fr = new FileReader(); fr.onload = () => res({ name: f.name, url: fr.result }); fr.readAsDataURL(f); }));
    Promise.all(readers).then(imgs => setScreenshots(prev => [...prev, ...imgs]));
  }

  return (
    <HubOverlay onClose={step < 3 ? onCancel : undefined}
      title={['Set up new Hub session', 'Researching company…', 'Confirm setup', 'Building platforms…', 'Done!'][step]}
      subtitle={['Enter the company name or website', '', 'Review what we found and adjust platforms', '', ''][step]}>

      {step === 0 && (
        <form onSubmit={doResearch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={companyInput} onChange={e => setCompanyInput(e.target.value)} placeholder="e.g. Altex Romania or altex.ro" style={{ padding: '0.7rem 1rem', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }} />
          <button type="submit" style={{ padding: '0.75rem', background: 'linear-gradient(135deg,#34c759,#30a74f)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Research company →</button>
        </form>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '2rem 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(52,199,89,0.25)', borderTopColor: '#34c759', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)' }}>Searching the web for {companyInput}…</div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {research ? (
            <>
              <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '0.875rem 1rem', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{research.company?.name || companyInput}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>{research.company?.description || ''}</div>
                {research.summary && <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 8, fontStyle: 'italic' }}>{research.summary}</div>}
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detected platforms — tick to build</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {platforms.map((p, i) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.625rem 0.875rem', borderRadius: 10, background: p.selected ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.5)', border: `1px solid ${p.selected ? 'rgba(52,199,89,0.25)' : 'rgba(0,0,0,0.07)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={!!p.selected} onChange={() => setPlatforms(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))} style={{ marginTop: 2, accentColor: '#34c759' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1a1a' }}>{p.actual_software || p.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{p.reason}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.8rem', padding: '1rem 0' }}>Could not research company. You can still proceed and add platforms manually.</div>
          )}

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Upload screenshots or clips (optional)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {screenshots.map((s, i) => <img key={i} src={s.url} alt={s.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }} />)}
              <label style={{ width: 60, height: 60, borderRadius: 8, border: '1.5px dashed rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.4rem', color: 'rgba(0,0,0,0.3)' }}>
                +<input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
              </label>
            </div>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Additional notes about their setup…" rows={2} style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <button onClick={doBuild} style={{ padding: '0.75rem', background: 'linear-gradient(135deg,#34c759,#30a74f)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Build {platforms.filter(p => p.selected).length} platform{platforms.filter(p => p.selected).length !== 1 ? 's' : ''} →
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '2rem 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(52,199,89,0.25)', borderTopColor: '#34c759', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)' }}>{buildMsg}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {platforms.filter(p => p.selected).map(p => (
              <div key={p.id} style={{ padding: '4px 10px', background: 'rgba(52,199,89,0.1)', borderRadius: 8, fontSize: '0.7rem', color: '#1a1a1a', border: '1px solid rgba(52,199,89,0.2)' }}>{p.name}</div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem' }}>✓</div>
          <div style={{ fontSize: '0.875rem', color: '#1a1a1a', fontWeight: 600 }}>Hub ready!</div>
        </div>
      )}
    </HubOverlay>
  );
}

// ── PlatformsView ──────────────────────────────────────────────────────────────
function PlatformsView({ sessionId, platforms = [], companyName, onClose, onGoHome, onGoHub, onGoWorkers, onGoAbout, onPlatformsChange }) {
  const [list, setList] = useState(platforms);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');

  function persist(next) {
    setList(next);
    onPlatformsChange?.(next);
    fetch(`/api/demo/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: next }),
    }).catch(() => {});
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!addUrl.trim()) return;
    const name = addName.trim() || new URL(addUrl.trim().startsWith('http') ? addUrl.trim() : 'https://' + addUrl.trim()).hostname;
    const p = { id: 'ext-' + Date.now(), name, actual_software: name, status: 'deployed', url: addUrl.trim().startsWith('http') ? addUrl.trim() : 'https://' + addUrl.trim(), external: true };
    persist([...list, p]);
    setAddName(''); setAddUrl(''); setAddOpen(false);
  }

  function handleRemove(id) {
    persist(list.filter(p => (p.id || p.name) !== id));
  }

  return (
    <div className="wkp" style={{ position: 'fixed', inset: 0, zIndex: 10000, height: 'auto', background: 'linear-gradient(135deg,#e0eaff 0%,#fff 40%,#aee8e2 70%,#d4eaed 100%)' }}>
      <nav className="wkp-menu">
        <div className="wkp-menu-left">
          <span className="wkp-menu-logo">h</span>
          <div className="wkp-menu-sep" />
          <span className="wkp-menu-label">Platforms</span>
        </div>
        <div className="wkp-menu-center">
          <DockIcons active="platforms" onHome={onGoHome} onHub={onGoHub} onWorkers={onGoWorkers} onPlatforms={() => {}} onAbout={onGoAbout} />
        </div>
        <div className="wkp-menu-right">
          <button className="wkp-menu-btn" onClick={() => setAddOpen(v => !v)} title="Add platform by URL" style={{ fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>+</button>
          <button className="wkp-menu-btn wkp-menu-btn--back" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="wkp-menu-avatar">S</div>
        </div>
      </nav>

      {/* Add platform form */}
      {addOpen && (
        <form onSubmit={handleAdd} style={{ position: 'absolute', top: 84, left: 16, zIndex: 110, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.8)', flexWrap: 'wrap', maxWidth: 480 }}>
          <input autoFocus value={addName} onChange={e => setAddName(e.target.value)} placeholder="Name (optional)" style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', width: 140 }} />
          <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://..." required style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', flex: 1, minWidth: 180 }} />
          <button type="submit" style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Add</button>
          <button type="button" onClick={() => setAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', fontSize: '1rem', padding: '0 4px' }}>✕</button>
        </form>
      )}

      {/* Cards */}
      <div style={{ position: 'absolute', top: 84, left: 0, right: 0, bottom: 0, zIndex: 1, display: 'flex', padding: '0 12px 12px', gap: 12, overflowX: 'auto', overflowY: 'hidden' }}>
        {list.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.35)', fontSize: '0.85rem', gap: 12 }}>
            <div>No platforms yet.</div>
            <button onClick={() => setAddOpen(true)} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add by URL</button>
          </div>
        ) : (
          list.map(p => (
            <div key={p.id || p.name} style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', minWidth: 320, position: 'relative' }}>
              <button onClick={() => handleRemove(p.id || p.name)} title="Remove platform" style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>✕</button>
              <PlatformPreviewCard platform={p} sessionId={sessionId} companyName={companyName} />
            </div>
          ))
        )}
      </div>
      <style>{`.wkp-platform-card { flex: 1; display: flex; flex-direction: column; } .wkp-platform-frame { flex: 1; max-height: none !important; min-height: 0 !important; } .wkp-platform-iframe { height: 100%; }`}</style>
    </div>
  );
}

// ── AboutView ──────────────────────────────────────────────────────────────────
function parseContactsCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  // Detect header row vs. data-only
  const first = lines[0].toLowerCase();
  const hasHeader = /name|email|phone|role|title|company/.test(first);
  const rows = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader
    ? lines[0].split(/,|\t/).map(h => h.trim().toLowerCase())
    : ['name', 'role', 'email', 'phone'];
  return rows.map((row, i) => {
    const cells = row.split(/,|\t/).map(c => c.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, j) => { obj[h] = cells[j] || ''; });
    // Normalise key aliases
    return {
      id: `c-${Date.now()}-${i}`,
      name: obj.name || obj['full name'] || obj['contact name'] || cells[0] || '',
      role: obj.role || obj.title || obj.position || obj.job || '',
      email: obj.email || obj['e-mail'] || '',
      phone: obj.phone || obj.mobile || obj.tel || '',
      note: obj.note || obj.notes || obj.comment || '',
    };
  }).filter(c => c.name);
}

function ContactCard({ contact, onRemove, onChange }) {
  const [editing, setEditing] = useState(false);
  const initials = contact.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const avatarColor = ['#d97706','#3b82f6','#34c759','#a855f7','#ef4444','#f59e0b','#06b6d4'][contact.name.charCodeAt(0) % 7];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.65rem 0.875rem', borderRadius: 12, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.07)', position: 'relative' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{initials}</div>
      {editing ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          {[['name','Name'],['role','Role / Title'],['email','Email'],['phone','Phone'],['note','Note']].map(([k, ph]) => (
            <input key={k} value={contact[k] || ''} onChange={e => onChange({ ...contact, [k]: e.target.value })} placeholder={ph}
              style={{ border: 'none', borderBottom: '1px solid rgba(0,0,0,0.12)', background: 'none', fontSize: '0.75rem', padding: '2px 0', outline: 'none', fontFamily: 'inherit', gridColumn: k === 'note' ? '1 / -1' : undefined }} />
          ))}
          <button onClick={() => setEditing(false)} style={{ gridColumn: '1 / -1', marginTop: 4, padding: '3px 8px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setEditing(true)}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.3 }}>{contact.name}</div>
          {contact.role && <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.45)', marginTop: 1 }}>{contact.role}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
            {contact.email && <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>{contact.email}</span>}
            {contact.phone && <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>{contact.phone}</span>}
          </div>
          {contact.note && <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.35)', fontStyle: 'italic', marginTop: 3 }}>{contact.note}</div>}
        </div>
      )}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.22)', fontSize: '1rem', lineHeight: 1, padding: 2, flexShrink: 0 }}>×</button>
    </div>
  );
}

function AboutView({ sessionId, companyName, onClose, onGoHome, onGoHub, onGoWorkers, onGoPlatforms }) {
  const [data, setData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [apiData, setApiData] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiCheckedAt, setApiCheckedAt] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/demo/session/${sessionId}`, { cache: 'no-store' }).then(r => r.json()).then(d => {
      setData(d);
      setContacts(d.contacts || []);
      setPhone(d.settings?.phone || '');
      setEmail(d.settings?.email || '');
      setTelegram(d.settings?.telegram || '');
    }).catch(() => {});
  }, [sessionId]);

  async function loadApiStatus() {
    setApiLoading(true);
    try {
      const r = await fetch('/api/demo/api-status', { cache: 'no-store' });
      const d = await r.json();
      setApiData(d.services || []);
      setApiCheckedAt(d.checkedAt);
    } catch (_) {}
    setApiLoading(false);
  }
  useEffect(() => { loadApiStatus(); }, []);

  function save(nextContacts, nextSettings) {
    const s = nextSettings || { phone, email, telegram };
    fetch(`/api/demo/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: s, contacts: nextContacts ?? contacts }) }).catch(() => {});
  }

  function importCsv(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseContactsCsv(ev.target.result);
      const next = [...contacts, ...parsed.filter(p => !contacts.some(c => c.email && c.email === p.email))];
      setContacts(next); save(next);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function addBlank() {
    const next = [...contacts, { id: `c-${Date.now()}`, name: 'New Contact', role: '', email: '', phone: '', note: '' }];
    setContacts(next); save(next);
  }

  function removeContact(id) { const next = contacts.filter(c => c.id !== id); setContacts(next); save(next); }
  function updateContact(updated) { const next = contacts.map(c => c.id === updated.id ? updated : c); setContacts(next); save(next); }

  const co = data?.company;

  return (
    <div className="wkp" style={{ position: 'fixed', inset: 0, zIndex: 10000, height: 'auto', background: 'linear-gradient(135deg,#e0eaff 0%,#fff 40%,#aee8e2 70%,#d4eaed 100%)' }}>
      <nav className="wkp-menu">
        <div className="wkp-menu-left">
          <span className="wkp-menu-logo">h</span>
          <div className="wkp-menu-sep" />
          <span className="wkp-menu-label">{co?.name || companyName || 'About'}</span>
        </div>
        <div className="wkp-menu-center">
          <DockIcons active="about" onHome={onGoHome} onHub={onGoHub} onWorkers={onGoWorkers} onPlatforms={onGoPlatforms} onAbout={() => {}} />
        </div>
        <div className="wkp-menu-right">
          <button className="wkp-menu-btn wkp-menu-btn--back" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="wkp-menu-avatar">S</div>
        </div>
      </nav>
      <div style={{ position: 'absolute', top: 84, left: 0, right: 0, bottom: 0, zIndex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {co && (
            <div style={{ padding: '0.875rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6 }}>{co.description}</div>
              {data?.researchSummary && <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' }}>{data.researchSummary}</div>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Session settings</div>
            {[['Email', 'email', email, setEmail, 'contact@company.com'], ['Phone', 'tel', phone, setPhone, '+1 555 000 0000'], ['Telegram', 'text', telegram, setTelegram, '@channel or chat ID']].map(([label, type, val, setter, ph]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', width: 64, flexShrink: 0 }}>{label}</span>
                <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph} onBlur={() => save(contacts, { phone, email, telegram })} style={{ flex: 1, border: 'none', background: 'none', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              Contacts <span style={{ fontWeight: 400, opacity: 0.6 }}>({contacts.length})</span>
            </div>
            <label style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer', color: 'rgba(0,0,0,0.55)' }}>
              Import CSV<input type="file" accept=".csv,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={importCsv} />
            </label>
            <button onClick={addBlank} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer', color: 'rgba(0,0,0,0.55)', fontFamily: 'inherit' }}>+ Add</button>
          </div>
          {contacts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.2rem 0', fontSize: '0.75rem', color: 'rgba(0,0,0,0.32)', fontStyle: 'italic' }}>
              No contacts yet — import a CSV or add manually.<br/>
              <span style={{ fontSize: '0.68rem' }}>Agents will know who is attending the demo.</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contacts.map(c => (
              <ContactCard key={c.id} contact={c} onRemove={() => removeContact(c.id)} onChange={updateContact} />
            ))}
          </div>

          {/* API Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              API Status
              {apiCheckedAt && <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 8, textTransform: 'none' }}>checked {new Date(apiCheckedAt).toLocaleTimeString()}</span>}
            </div>
            <button onClick={loadApiStatus} disabled={apiLoading} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: '0.7rem', cursor: apiLoading ? 'default' : 'pointer', color: 'rgba(0,0,0,0.55)', fontFamily: 'inherit', opacity: apiLoading ? 0.6 : 1 }}>
              {apiLoading ? 'Checking…' : '↻ Refresh'}
            </button>
          </div>
          {apiLoading && !apiData && <div style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.3)', padding: '8px 0', fontStyle: 'italic' }}>Checking APIs…</div>}
          {apiData && (() => {
            const SVC_ICONS = {
              bland: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 13V6l4-4h5l3 3v6l-3 3H6L2 13z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6 8h4M6 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
              twilio: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="6" r="1.2" fill="currentColor"/><circle cx="10.5" cy="6" r="1.2" fill="currentColor"/><circle cx="5.5" cy="10" r="1.2" fill="currentColor"/><circle cx="10.5" cy="10" r="1.2" fill="currentColor"/></svg>,
              telnyx: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="13" cy="12" r="1.5" fill="currentColor"/></svg>,
              openrouter: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h3l2-4 2 8 2-4h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              wavspeed: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="2" height="4" rx="1" fill="currentColor" opacity="0.6"/><rect x="5" y="4" width="2" height="8" rx="1" fill="currentColor" opacity="0.8"/><rect x="8" y="5" width="2" height="6" rx="1" fill="currentColor"/><rect x="11" y="3" width="2" height="10" rx="1" fill="currentColor" opacity="0.7"/></svg>,
              livekit: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 6.5l4-2v7l-4-2V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
              anthropic: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
              perplexity: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v4l3 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
              telegram: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8l12-5-3 10-4-3-3 2V8l3-2-3.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              google: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 8.18c0-.42-.04-.83-.1-1.22H8v2.3h3.09a2.64 2.64 0 01-1.14 1.73v1.44h1.85c1.08-1 1.7-2.47 1.7-4.25z" fill="currentColor" opacity="0.8"/><path d="M8 14c1.56 0 2.87-.52 3.82-1.4l-1.86-1.44c-.52.35-1.18.55-1.96.55-1.5 0-2.77-1.01-3.23-2.38H.86v1.49A6 6 0 008 14z" fill="currentColor" opacity="0.6"/><path d="M4.77 9.33A3.6 3.6 0 014.58 8c0-.46.08-.9.19-1.33V5.18H.86A6 6 0 000 8c0 .97.23 1.88.64 2.68l3.5-1.35z" fill="currentColor" opacity="0.7"/><path d="M8 3.12c.85 0 1.61.29 2.21.86l1.66-1.66A6 6 0 008 1a6 6 0 00-5.36 3.3l3.5 1.37z" fill="currentColor" opacity="0.9"/></svg>,
            };
            const GRP_LABELS = { telephony: 'Telephony', ai: 'AI / LLM', media: 'Media', messaging: 'Messaging', identity: 'Identity' };
            const GRP_ORDER = ['telephony', 'ai', 'media', 'messaging', 'identity'];
            const grouped = GRP_ORDER.reduce((acc, g) => { const s = apiData.filter(x => x.group === g); if (s.length) acc.push([g, s]); return acc; }, []);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {grouped.map(([group, svcs]) => (
                  <div key={group}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{GRP_LABELS[group]}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {svcs.map(svc => (
                        <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 10, background: svc.warning ? 'rgba(254,243,199,0.7)' : 'rgba(255,255,255,0.65)', border: svc.warning ? '1px solid rgba(217,119,6,0.18)' : '1px solid rgba(0,0,0,0.07)' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: svc.ok ? (svc.warning ? '#fef3c7' : svc.color + '18') : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: svc.ok ? (svc.warning ? '#b45309' : svc.color) : '#94a3b8' }}>
                            {SVC_ICONS[svc.id] || <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/></svg>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#1a1a1a' }}>{svc.name}</div>
                            {svc.ok && svc.account && <div style={{ fontSize: '0.66rem', color: 'rgba(0,0,0,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.account}{svc.detail ? <span style={{ marginLeft: 5, opacity: 0.8 }}>· {svc.detail}</span> : null}</div>}
                            {!svc.ok && <div style={{ fontSize: '0.66rem', color: '#b91c1c' }}>{svc.error}</div>}
                          </div>
                          {svc.ok && svc.credits && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: svc.warning ? '#b45309' : (svc.credits.startsWith('USD') ? '#15803d' : 'rgba(0,0,0,0.5)'), whiteSpace: 'nowrap' }}>{svc.credits}</div>
                              {svc.warning && <div style={{ fontSize: '0.6rem', color: '#b45309' }}>top up needed</div>}
                            </div>
                          )}
                          <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: svc.warning ? '#f59e0b' : (svc.ok ? '#22c55e' : '#ef4444'), boxShadow: svc.warning ? '0 0 0 2px rgba(245,158,11,0.2)' : (svc.ok ? '0 0 0 2px rgba(34,197,94,0.15)' : '0 0 0 2px rgba(239,68,68,0.12)') }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}


// ── HubSessionPicker ──────────────────────────────────────────────────────────
function HubSessionPicker({ onSelect, onNew, onClose }) {
  const [sessions, setSessions] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch('/api/demo/sessions', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => clearTimeout(t));
  }, []);
  const phaseColors = { start: '#8e8e93', research: '#3b82f6', building: '#f59e0b', platforms: '#34c759', workers: '#a855f7' };
  function timeAgo(iso) {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms/3600000)}h ago`;
    return `${Math.floor(ms/86400000)}d ago`;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MeshGradient style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} speed={0.19} scale={1.51} distortion={0.88} swirl={1} colors={['#E0EAFF', '#FFFFFF', '#AEE8E2', '#D4EAED']} />
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)', borderRadius: 20, padding: '2rem', width: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #34c759, #30a74f)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem', boxShadow: '0 8px 24px rgba(52,199,89,0.35)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', color: '#fff', fontWeight: 700, lineHeight: 1 }}>h</span>
          </div>
          <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: '1.15rem', fontWeight: 700, marginBottom: 4, color: '#1a1a1a' }}>Humans.AI Hub</div>
          <div style={{ fontFamily: 'system-ui', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)' }}>Select a company session to open in the Hub</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem', maxHeight: 320 }}>
          {sessions === null && <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '0.75rem', fontFamily: 'monospace', padding: '1.5rem' }}>Loading sessions…</div>}
          {sessions?.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '0.75rem', fontFamily: 'monospace', padding: '1.5rem' }}>No sessions yet — create a new one below</div>}
          {(sessions || []).map(s => (
            <div key={s.id} onClick={() => onSelect(s)} style={{ padding: '0.875rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.9)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 600, fontSize: '0.88rem', color: '#1a1a1a' }}>{s.company || <span style={{ color: 'rgba(0,0,0,0.35)', fontWeight: 400 }}>Unnamed Session</span>}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', textTransform: 'uppercase', color: phaseColors[s.phase] || '#8e8e93', fontWeight: 700, letterSpacing: '0.05em', background: `${phaseColors[s.phase] || '#8e8e93'}18`, borderRadius: 4, padding: '2px 6px' }}>{s.phase || 'start'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(0,0,0,0.4)', alignItems: 'center' }}>
                {s.workers > 0 && <span>{s.workers} worker{s.workers !== 1 ? 's' : ''}</span>}
                {s.workers > 0 && s.updatedAt && <span>·</span>}
                {(s.updatedAt || s.createdAt) && <span>{timeAgo(s.updatedAt || s.createdAt)}</span>}
                <span style={{ flex: 1 }} />
                <span onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(s.id); e.currentTarget.textContent = 'copied!'; setTimeout(() => { e.currentTarget.textContent = s.id; }, 1200); }} title="Copy session ID" style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(0,0,0,0.1)', transition: 'color 0.15s' }}>{s.id}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onNew} style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg, #34c759, #30a74f)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif", boxShadow: '0 4px 16px rgba(52,199,89,0.3)', marginBottom: 8 }}>
          + New Hub Session
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '0.5rem', background: 'none', color: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function AppInner() {
  const searchParams = useSearchParams();
  // AI Workers Hub view: null | 'login' | 'home' | 'workspace' | 'workers' | 'worker-page'
  // Start at login unless a direct ?hub= or ?access= URL was provided
  const [aiView, setAiView] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('hub') || p.get('access')) return null;
    }
    return 'login';
  });
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [hubAnamClient, setHubAnamClient] = useState(null);
  const [hubCameraStream, setHubCameraStream] = useState(null);
  const [hubAvatarStream, setHubAvatarStream] = useState(null);
  const [hubSessionId, setHubSessionId] = useState(null);
  const [hubCompanyName, setHubCompanyName] = useState(null);
  const [hubLocked, setHubLocked] = useState(false); // true when ?lock=true — hides back/switcher
  const [showHubPicker, setShowHubPicker] = useState(false); // shown after login
  const [showWizard, setShowWizard] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [hubWorkers, setHubWorkers] = useState([]);
  const [hubWorkerIdParam, setHubWorkerIdParam] = useState(null);
  const [hubWorkflowIdParam, setHubWorkflowIdParam] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState('start');
  const [maxPhase, setMaxPhase] = useState('start');
  const [chat, setChat] = useState([{ role: 'assistant', content: 'Welcome to H-Demo. Enter a company name to begin your AI back-office simulation.' }]);
  const [usage, setUsage] = useState({ tokens: 0, requests: 0, estimatedCostUsd: 0 });
  const [power, setPower] = useState({ totalWh: 0, runs: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [agentTree, setAgentTree] = useState([]); // delegation tree nodes
  const [agentRetries, setAgentRetries] = useState({}); // agentId → {attempt, maxRetries, reason}
  const [supervisorMsgs, setSupervisorMsgs] = useState([]); // recent supervisor messages
  const [activeZcAgent, setActiveZcAgent] = useState(null); // clicked agent node for zeroclaw chat
  const [zcChatHistory, setZcChatHistory] = useState([]);
  const [zcChatInput, setZcChatInput] = useState('');
  const [zcChatLoading, setZcChatLoading] = useState(false);
  const [zcHistoryLoading, setZcHistoryLoading] = useState(false);
  const [platformHealth, setPlatformHealth] = useState({}); // platformId → 'up'|'down'|'unknown'
  const [monitorMessages, setMonitorMessages] = useState([]); // recent monitor↔platform messages

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

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [rightView, setRightView] = useState('demo'); // 'demo' | 'canvas'

  // Real client data
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [realClientActive, setRealClientActive] = useState(false);
  const [hubPlatforms, setHubPlatforms] = useState([]);

  const chatEndRef = useRef(null);
  const pollRef = useRef(null);
  const hubInitRef = useRef(false); // only initialize hub from URL once

  // Load hub session workers and handle URL params when hubSessionId changes
  useEffect(() => {
    if (!hubSessionId) return;
    fetch(`/api/demo/session/${hubSessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.workers && d.workers.length > 0) setHubWorkers(d.workers);
        if (d.company) setHubCompanyName(d.company?.name || d.company || null);
        if (d.platforms && d.platforms.length > 0) setHubPlatforms(d.platforms);
        // Handle workerId URL param to auto-navigate
        const workerIdParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('workerId') : null;
        const workflowIdParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('workflowId') : null;
        if (workflowIdParam) setHubWorkflowIdParam(workflowIdParam);
        if (workerIdParam && d.workers) {
          const w = d.workers.find(w => w.id === workerIdParam);
          if (w) { setSelectedWorker(w); setAiView('worker-page'); }
        }
      })
      .catch(() => {});
  }, [hubSessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // SSE listener for supervisor/retry events → update agent tree live
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource('/api/demo/events/stream');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'agent:retry') {
          const { agentId, attempt, maxRetries, reason } = ev.data || {};
          setAgentRetries(prev => ({ ...prev, [agentId]: { attempt, maxRetries, reason } }));
          setAgentTree(prev => prev.map(n => n.id === agentId ? { ...n, status: 'error' } : n));
        } else if (ev.type === 'agent:supervisor') {
          const { agentId, status } = ev.data || {};
          if (status === 'recovered') {
            setAgentRetries(prev => { const next = { ...prev }; delete next[agentId]; return next; });
            setAgentTree(prev => prev.map(n => n.id === agentId ? { ...n, status: 'done' } : n));
          } else if (status === 'exhausted') {
            setAgentTree(prev => prev.map(n => n.id === agentId ? { ...n, status: 'error' } : n));
          }
        } else if (ev.type === 'agent:reply') {
          const { agentId, attempts } = ev.data || {};
          if (attempts && attempts > 1) {
            setAgentRetries(prev => { const next = { ...prev }; delete next[agentId]; return next; });
          }
          setAgentTree(prev => prev.map(n => n.id === agentId ? { ...n, status: 'done' } : n));
        } else if (ev.type === 'skill:selected') {
          const { agentId, selectedName, selectedType, rationale } = ev.data || {};
          setAgentTree(prev => {
            if (prev.some(n => n.id === agentId)) return prev.map(n => n.id === agentId ? { ...n, status: 'running' } : n);
            const resourceNode = { id: agentId + '-resource', name: selectedName || 'Resource', icon: selectedType === 'agent' ? '🤖' : selectedType === 'api_key' ? '🔑' : selectedType === 'service_account' ? '🏢' : '⚙️', role: 'resource', parentId: agentId, status: 'running', task: rationale || '' };
            return [...prev, { id: agentId, name: 'Skill Agent', icon: '🎯', role: 'skill-agent', parentId: null, status: 'running', task: 'Selects best resource on the fly' }, resourceNode];
          });
        } else if (ev.type === 'platform:health') {
          const { platformId, status, platformName } = ev.data || {};
          if (platformId) {
            setPlatformHealth(prev => ({ ...prev, [platformId]: status === 'down' ? 'down' : 'up' }));
            // Ensure monitor node exists in agent tree
            setAgentTree(prev => {
              const hasMonitor = prev.some(n => n.role === 'platform-monitor');
              const hasPlatform = prev.some(n => n.id === 'platform-' + platformId);
              let next = prev;
              if (!hasMonitor) next = [{ id: 'platform-monitor', name: 'Monitor', icon: '📡', role: 'platform-monitor', parentId: null, status: 'running', task: 'Health checks every 30s · Auto-restarts dead platforms' }, ...next];
              if (!hasPlatform) next = [...next, { id: 'platform-' + platformId, name: platformName || platformId, icon: '🖥️', role: 'platform', parentId: 'platform-monitor', status: status === 'down' ? 'error' : 'running', task: status === 'down' ? 'Unreachable — restarting' : 'Healthy' }];
              else next = next.map(n => n.id === 'platform-' + platformId ? { ...n, status: status === 'down' ? 'error' : 'running', task: status === 'down' ? 'Unreachable — restarting' : 'Healthy' } : n);
              return next;
            });
          }
        } else if (ev.type === 'agent:message') {
          const { from, to } = ev.data || {};
          const allMsgs = { ...ev.data, at: Date.now() };
          setSupervisorMsgs(prev => [allMsgs, ...prev].slice(0, 50));
          if (from === 'platform-monitor' || to === 'platform-monitor') {
            setMonitorMessages(prev => [allMsgs, ...prev].slice(0, 30));
          }
          // Ensure orchestrator node exists if orch-supervisor messages reference it
          if (from && from.startsWith('orch-supervisor')) {
            setAgentTree(prev => {
              if (prev.some(n => n.id === from)) return prev;
              return [{ id: from, name: 'SQL Guard', icon: '🔁', role: 'orch-supervisor', parentId: null, status: 'running', task: 'Fixes bad SQL · Retries on error' }, ...prev];
            });
          }
          // Track platform-agent messages
          if (from && from.startsWith('platform-agent-')) {
            setAgentTree(prev => prev.map(n => n.id === from ? { ...n, status: 'running', task: ev.data.message ? ev.data.message.slice(0, 50) : n.task } : n));
          }
          if (to && to.startsWith('platform-agent-')) {
            setAgentTree(prev => prev.map(n => n.id === to ? { ...n, status: 'running' } : n));
          }
        } else if (ev.type === 'agent:spawn') {
          const { agentId, name, role } = ev.data || {};
          if (role === 'platform-agent' && agentId) {
            setAgentTree(prev => {
              if (prev.some(n => n.id === agentId)) return prev.map(n => n.id === agentId ? { ...n, status: 'running' } : n);
              return [...prev, { id: agentId, name: name || agentId, icon: '🗄️', role: 'platform-agent', parentId: null, status: 'running', task: 'ZeroClaw · Supervised DB agent' }];
            });
          }
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  // Init session — re-run if searchParams changes (e.g. ?session= on first load)
  useEffect(() => {
    initSession();
  }, [searchParams]);

  async function initSession() {
    try {
      // Check for ?access=<token> magic link — resolves to a session without login
      const accessToken = searchParams.get('access');
      if (accessToken && !hubInitRef.current) {
        hubInitRef.current = true;
        const ar = await fetch(`/api/demo/resolve-access/${accessToken}`);
        if (ar.ok) {
          const ad = await ar.json();
          setHubSessionId(ad.sessionId);
          setHubCompanyName(ad.companyName || null);
          setHubLocked(true);
          setShowHubPicker(false);
          setAiView('workspace');
          return;
        }
        // Invalid token — fall through to normal login flow
        hubInitRef.current = false;
      }

      // Check for ?hub= URL param — auto-open hub with that session (only once)
      const hubParam = searchParams.get('hub');
      if (hubParam && !hubInitRef.current) {
        hubInitRef.current = true;
        const hr = await fetch(`/api/demo/session/${hubParam}`);
        if (hr.ok) {
          const hd = await hr.json();
          setHubSessionId(hubParam);
          setHubCompanyName(hd?.company?.name || hd?.company || null);
          setShowHubPicker(false);
          if (searchParams.get('lock') === 'true') setHubLocked(true);
          setAiView('workspace');
          // Also load main session from localStorage so dashboard still works
        }
      }
      // Check URL ?session= param first
      const urlSession = searchParams.get('session');
      if (urlSession) {
        const r = await fetch(`/api/demo/session/${urlSession}`);
        if (r.ok) {
          const d = await r.json();
          if (d && (d.id || d.phase)) {
            setSessionId(urlSession);
            if (typeof window !== 'undefined') localStorage.setItem('hw-demo-session', urlSession);
            restoreFromSession(d);
            return;
          }
        }
      }
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

  // Re-fetch workers from session when tab regains focus (e.g. returning from worker detail page)
  useEffect(() => {
    function onFocus() {
      if (!sessionId) return;
      fetch(`/api/demo/session/${sessionId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.workers?.length > 0) setWorkers(d.workers); })
        .catch(() => {});
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [sessionId]);

  function advancePhase(p) {
    setPhase(p);
    setMaxPhase(prev => PHASES.indexOf(p) > PHASES.indexOf(prev) ? p : prev);
  }

  function restoreFromSession(d) {
    const ph = d.phase || 'start';
    setPhase(ph);
    setMaxPhase(ph);
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
    // Seed agent tree with monitor + platform nodes for deployed platforms
    const deployedPs = (d.platforms || []).filter(p => p.status === 'deployed');
    if (deployedPs.length > 0) {
      const monNode = { id: 'platform-monitor', name: 'Monitor', icon: '📡', role: 'platform-monitor', parentId: null, status: 'running', task: 'Health checks every 30s · Auto-restarts dead platforms' };
      const platNodes = deployedPs.map(p => ({ id: 'platform-' + p.id, name: p.name, icon: '🖥️', role: 'platform', parentId: 'platform-monitor', status: 'running', task: p.url || '' }));
      setAgentTree(prev => {
        const hasMonitor = prev.some(n => n.role === 'platform-monitor');
        if (hasMonitor) return prev;
        return [monNode, ...platNodes, ...prev];
      });
      // Fetch actual health
      fetch(`/api/demo/platform-health/${d.id || ''}`)
        .then(r => r.ok ? r.json() : null)
        .then(hd => { if (!hd) return; hd.platforms.forEach(p => { setPlatformHealth(prev => ({ ...prev, [p.id]: p.status })); setAgentTree(prev2 => prev2.map(n => n.id === 'platform-' + p.id ? { ...n, status: p.status === 'down' ? 'error' : 'running', task: p.status === 'down' ? 'Unreachable' : p.url || 'Healthy' } : n)); }); })
        .catch(() => {});
    }
    const nP = (d.platforms || []).filter(p => p.status === 'deployed').length;
    const nW = (d.workers || []).length;
    // Restore chat history if available, otherwise show restore summary
    if (d.chatHistory && d.chatHistory.length > 0) {
      setChat(d.chatHistory);
    } else {
      setChat([{
        role: 'assistant',
        content: `Session restored.${d.company ? ` Company: ${d.company.name}.` : ''}${nP ? ` ${nP} platform${nP > 1 ? 's' : ''} deployed.` : ''}${nW ? ` ${nW} worker${nW > 1 ? 's' : ''} configured.` : ''} Phase: ${ph}.`,
        tag: 'agent:info',
      }]);
    }
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

  function addChat(role, content, tag, extra) {
    setChat(prev => {
      const updated = [...prev, { role, content, tag, at: new Date().toISOString(), ...(extra || {}) }];
      // Persist chat history to server (fire-and-forget, last 60 messages)
      if (sessionId) {
        fetch('/api/demo/session/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, chatHistory: updated.slice(-60) }),
        }).catch(() => {});
      }
      return updated;
    });
  }

  // Spawn a zeroclaw workspace for a tree node (fire-and-forget)
  function spawnZcAgent(node, customSystemPrompt) {
    const systemPrompt = customSystemPrompt || `You are ${node.name}. Your task: ${node.task || node.role}. Be concise.`;
    fetch('/api/demo/agents/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: node.id, name: node.name, role: node.role, systemPrompt, sessionId }),
    }).catch(() => {});
    // Ensure a supervisor node exists in the tree
    if (node.role !== 'supervisor') {
      setAgentTree(prev => {
        if (prev.some(n => n.role === 'supervisor')) return prev;
        const supId = 'supervisor-' + (sessionId || 'global');
        return [{ id: supId, name: 'Supervisor', icon: '🛡️', role: 'supervisor', parentId: null, status: 'running', task: 'Monitors agents · Auto-retries on errors' }, ...prev];
      });
    }
  }

  async function handleZcChat() {
    if (!zcChatInput.trim() || !activeZcAgent || zcChatLoading) return;
    const msg = zcChatInput.trim();
    setZcChatInput('');
    setZcChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setZcChatLoading(true);
    try {
      const r = await fetch(`/api/demo/agents/${activeZcAgent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const d = await r.json();
      const reply = d.reply || d.error || 'No response.';
      setZcChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setZcChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
    }
    setZcChatLoading(false);
  }

  async function openZcAgent(node) {
    if (!node) return;
    setActiveZcAgent(node);
    setZcChatHistory([]);
    setZcHistoryLoading(true);
    try {
      const r = await fetch(`/api/demo/agents/${node.id}/history`);
      const d = await r.json();
      const msgs = d.messages || [];
      if (msgs.length > 0) {
        setZcChatHistory(msgs);
      } else {
        setZcChatHistory([{ role: 'assistant', content: `Hi, I'm ${node.name}. My task: ${node.task || node.role}. Ask me anything.` }]);
      }
    } catch {
      setZcChatHistory([{ role: 'assistant', content: `Hi, I'm ${node.name}. My task: ${node.task || node.role}. Ask me anything.` }]);
    }
    setZcHistoryLoading(false);
  }

  async function handleResearch(co) {
    const name = (co || '').trim();
    if (!name) return;
    setLoading(true);
    advancePhase('research');
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
      // Spawn zeroclaw workspaces for each sub-agent
      const all = alreadyHasParent ? subs : [parent, ...subs];
      all.forEach(n => spawnZcAgent(n));
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
    advancePhase('building');
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
      const all = alreadyHasParent ? subs : [parent, ...subs];
      all.forEach(n => spawnZcAgent(n));
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
        advancePhase('platforms');
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
      const all = already ? subs : [parent, ...subs];
      all.forEach(n => spawnZcAgent(n));
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
        advancePhase('workers');
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
    // Ensure orchestrator node in agent tree
    setAgentTree(prev => {
      if (prev.some(n => n.role === 'orchestrator')) return prev.map(n => n.role === 'orchestrator' ? { ...n, status: 'running', task: msg.slice(0, 60) } : n);
      return [{ id: 'orchestrator-main', name: 'Orchestrator', icon: '🧠', role: 'orchestrator', parentId: null, status: 'running', task: msg.slice(0, 60) }, ...prev];
    });

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
      if (d.message) addChat('assistant', d.message, 'agent:orchestrator', d.imageUrl ? { imageUrl: d.imageUrl } : undefined);

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
      } else if (action.type === 'reconfigure_worker') {
        // Worker was already reconfigured server-side; update local state to reflect new phone/threshold
        const { workerId, phone, threshold } = action.params || {};
        setWorkers(prev => prev.map(w =>
          w.id === workerId
            ? { ...w, ...(phone !== undefined ? { phone } : {}), ...(threshold !== undefined ? { threshold } : {}), status: 'deployed' }
            : w
        ));
      } else if (action.type === 'generate_image' || action.type === 'use_skill_agent') {
        // Handled server-side via Skill Agent; result in d.message + d.imageUrl
        // Canvas Artifacts tab auto-switches via SSE artifact:created
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
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', borderRadius: 14, margin: '12px 12px 0', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: T.ui, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.03em', color: T.text }}>H-Demo</span>
          {(company?.name || sessionId) && <Badge color={T.faint} style={{ color: T.muted }}>{company?.name || sessionId.slice(0, 8)}</Badge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Phase indicator — clickable navigation */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {PHASES.filter(p => p !== 'start').map((p, i, arr) => {
              const maxIdx  = PHASES.indexOf(maxPhase);
              const thisIdx = PHASES.indexOf(p);
              const isActive = phase === p;
              const isDone = PHASES.indexOf(phase) > thisIdx;
              const canNav = thisIdx <= maxIdx;
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <div
                    onClick={() => { if (canNav) { setPhase(p); setActivePlatformChat(null); setPlatformChatHistory([]); setShowSettings(false); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.65rem', borderRadius: '999px',
                      background: isActive ? '#1a1a1a' : isDone ? 'rgba(52,199,89,0.1)' : 'transparent',
                      border: isActive ? 'none' : isDone ? `1px solid rgba(52,199,89,0.3)` : '1px solid rgba(0,0,0,0.07)',
                      cursor: canNav ? 'pointer' : 'default',
                      transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? '#fff' : isDone ? T.mint : 'rgba(0,0,0,0.2)',
                    }} />
                    <span style={{ fontSize: '0.62rem', fontFamily: T.ui, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : isDone ? T.mint : T.muted, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{phaseLabel(p)}</span>
                  </div>
                  {i < arr.length - 1 && <span style={{ color: T.faint, fontSize: '0.75rem' }}>›</span>}
                </div>
              );
            })}
          </div>
          <Btn ghost small onClick={() => setShowNetwork(true)} style={{ fontFamily: T.mono }}>⬡ Network</Btn>
          <Btn ghost small onClick={() => setShowSettings(s => !s)} style={showSettings ? { background: T.text, color: '#fff', border: 'none' } : {}}>⚙ Settings</Btn>
          <Btn ghost small onClick={() => setShowSessions(s => !s)}>Sessions</Btn>
          <Btn ghost small onClick={newSession}>+ New</Btn>
          <Btn small onClick={() => setAiView('login')} style={{ background: '#1a1a1a', color: '#fff', border: 'none', letterSpacing: '-0.01em' }}>✦ HUB</Btn>
        </div>
      </div>

      {showHubPicker && (
        <HubSessionPicker
          onSelect={async (s) => {
            setHubSessionId(s.id);
            setHubCompanyName(s.company || null);
            setHubWorkers([]);
            setHubWorkflowIdParam(null);
            if (typeof window !== 'undefined') window.history.replaceState(null, '', `?hub=${s.id}`);
            setShowHubPicker(false);
            setAiView('home'); // start the call / see the experience
          }}
          onNew={async () => {
            try {
              const r = await fetch('/api/demo/session', { method: 'POST' });
              const d = await r.json();
              if (d.sessionId) {
                setHubSessionId(d.sessionId);
                setHubCompanyName(null);
                setHubWorkers([]);
                setHubWorkflowIdParam(null);
                if (typeof window !== 'undefined') window.history.replaceState(null, '', `?hub=${d.sessionId}`);
              }
            } catch {}
            setShowHubPicker(false);
            setAiView('home'); // go to video call / homepage experience
          }}
          onClose={() => setShowHubPicker(false)}
        />
      )}
      {showWizard && (
        <OnboardingFlow
          sessionId={hubSessionId}
          onDone={() => {
            setShowWizard(false);
            if (hubSessionId) {
              fetch(`/api/demo/session/${hubSessionId}`, { cache: 'no-store' }).then(r => r.json()).then(d => {
                if (d.workers?.length) setHubWorkers(d.workers);
                if (d.company) setHubCompanyName(d.company?.name || d.company || null);
                if (d.platforms?.length) setHubPlatforms(d.platforms);
              }).catch(() => {});
            }
            setAiView('workers');
          }}
          onCancel={() => { setShowWizard(false); setAiView('home'); }}
        />
      )}
      {/* AI Workers Hub overlay */}
      {aiView && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
          {aiView === 'login' && (
            <LoginPage
              onLogin={() => {
                setAiView(null);
                setShowHubPicker(true);
              }}
            />
          )}
          {aiView === 'home' && (
            <Homepage
              onSubmit={(text, client, camera, avatarStream) => {
                if (text) setHubCompanyName(text);
                if (client) setHubAnamClient(client);
                if (camera) setHubCameraStream(camera);
                if (avatarStream) setHubAvatarStream(avatarStream);
                setAiView('workspace');
              }}
              onGoHub={() => setAiView('workspace')}
              onGoWorkers={() => setAiView('workers')}
              onGoPlatforms={() => setShowPlatforms(true)}
              onGoAbout={() => setShowAbout(true)}
              sessionId={hubSessionId}
              onBackToDashboard={() => { setAiView(null); if (typeof window !== 'undefined') { const url = new URL(window.location.href); url.searchParams.delete('hub'); window.history.replaceState(null, '', url.toString()); } }}
            />
          )}
          {aiView === 'workspace' && (
            <Workspace
              companyName={hubCompanyName || company?.name || ''}
              company={company}
              researchSummary={researchSummary}
              researchFindings={researchFindings}
              anamClient={hubAnamClient}
              cameraStream={hubCameraStream}
              sessionId={hubSessionId}
              onOpenWorkerProfile={() => { setSelectedWorker({ name: 'Alexandra\nSeaman', role: 'HR at Humans.AI', code: 'HRMANAGER', status: 'Active', tasks: 24, rating: 4.9 }); setAiView('worker-page'); }}
              onGoHome={() => { setHubAnamClient(null); setHubCameraStream(null); setAiView('home'); }}
              onGoHub={() => setAiView('workspace')}
              onGoWorkers={() => setAiView('workers')}
              onGoPlatforms={() => setShowPlatforms(true)}
              onGoAbout={() => setShowAbout(true)}
              onBackToDashboard={hubLocked ? undefined : () => { setAiView(null); if (typeof window !== 'undefined') { const url = new URL(window.location.href); url.searchParams.delete('hub'); window.history.replaceState(null, '', url.toString()); } }}
              onWorkersBuilt={(workers) => { setHubWorkers(workers); }}
              onCompanyName={(name) => { if (name) setHubCompanyName(name); }}
            />
          )}
          {aiView === 'workers' && (
            <AIWorkers
              companyName={hubCompanyName || company?.name || 'Humans.AI'}
              workers={hubWorkers.length > 0 ? hubWorkers : null}
              onSelectWorker={(w) => {
                setSelectedWorker(w);
                setAiView('worker-page');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('workerId', w.id || w.code || '');
                  url.searchParams.delete('workflowId');
                  window.history.replaceState(null, '', url.toString());
                }
              }}
              onGoHome={() => setAiView('home')}
              onGoHub={() => setAiView('workspace')}
              onGoPlatforms={() => setShowPlatforms(true)}
              onGoAbout={() => setShowAbout(true)}
              sessionId={hubSessionId}
              onBackToDashboard={() => { setAiView(null); if (typeof window !== 'undefined') { const url = new URL(window.location.href); url.searchParams.delete('hub'); window.history.replaceState(null, '', url.toString()); } }}
            />
          )}
          {aiView === 'worker-page' && (
            <WorkerPage
              worker={selectedWorker}
              onWorkerUpdate={(updated) => { setSelectedWorker(updated); setHubWorkers(prev => prev.map(w => w.id === updated.id ? updated : w)); }}
              sessionId={hubSessionId}
              companyName={hubCompanyName || company?.name || 'Humans.AI'}
              platforms={hubPlatforms}
              allWorkers={hubWorkers}
              defaultExpandedWorkflow={hubWorkflowIdParam}
              onWorkflowSelect={(wfId) => {
                setHubWorkflowIdParam(wfId);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('workflowId', wfId);
                  window.history.replaceState(null, '', url.toString());
                }
              }}
              onBack={() => {
                setAiView('workers');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('workerId');
                  url.searchParams.delete('workflowId');
                  window.history.replaceState(null, '', url.toString());
                }
              }}
              onGoHome={() => setAiView('home')}
              onGoWorkers={() => {
                setAiView('workers');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('workerId');
                  url.searchParams.delete('workflowId');
                  window.history.replaceState(null, '', url.toString());
                }
              }}
              onGoPlatforms={() => setShowPlatforms(true)}
              onGoAbout={() => setShowAbout(true)}
              onBackToDashboard={() => { setAiView(null); if (typeof window !== 'undefined') { const url = new URL(window.location.href); url.searchParams.delete('hub'); window.history.replaceState(null, '', url.toString()); } }}
            />
          )}
        </div>
      )}
      {showPlatforms && (
        <PlatformsView
          sessionId={hubSessionId}
          platforms={hubPlatforms}
          companyName={hubCompanyName}
          onClose={() => setShowPlatforms(false)}
          onGoHome={() => { setShowPlatforms(false); setAiView('home'); }}
          onGoHub={() => { setShowPlatforms(false); setAiView('workspace'); }}
          onGoWorkers={() => { setShowPlatforms(false); setAiView('workers'); }}
          onGoAbout={() => { setShowPlatforms(false); setShowAbout(true); }}
          onPlatformsChange={next => setHubPlatforms(next)}
        />
      )}
      {showAbout && (
        <AboutView
          sessionId={hubSessionId}
          companyName={hubCompanyName}
          onClose={() => setShowAbout(false)}
          onGoHome={() => { setShowAbout(false); setAiView('home'); }}
          onGoHub={() => { setShowAbout(false); setAiView('workspace'); }}
          onGoWorkers={() => { setShowAbout(false); setAiView('workers'); }}
          onGoPlatforms={() => { setShowAbout(false); setShowPlatforms(true); }}
        />
      )}
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
            if (typeof window !== 'undefined') {
              localStorage.setItem('hw-demo-session', id);
              window.history.replaceState(null, '', `?session=${id}`);
            }
            setSessionId(id);
            setAgentTree([]);
            restoreFromSession(d);
          }}
        />
      )}

      {/* Main card wrapper */}
      <div style={{ flex: 1, overflow: 'hidden', margin: '8px 12px 12px', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANEL */}
        <div style={{ width: 368, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.06)', background: '#fff', flexShrink: 0, overflow: 'hidden' }}>
          {/* Zeroclaw agent chat overlay */}
          {activeZcAgent ? (
            <ZcAgentChatPanel
              agent={activeZcAgent}
              history={zcChatHistory}
              input={zcChatInput}
              setInput={setZcChatInput}
              onSend={handleZcChat}
              loading={zcChatLoading}
              historyLoading={zcHistoryLoading}
              onBack={() => { setActiveZcAgent(null); setZcChatHistory([]); }}
            />
          ) : activePlatformChat ? (
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
                    <AgentFlowHover
                      treeNodes={agentTree}
                      agentRetries={agentRetries}
                      recentMsgs={[...supervisorMsgs, ...monitorMessages].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 15)}
                      onClear={() => { setAgentTree([]); setAgentRetries({}); setSupervisorMsgs([]); setMonitorMessages([]); }}
                      onAgentClick={(nodeId) => {
                        const node = agentTree.find(n => n.id === nodeId);
                        if (node) openZcAgent(node);
                      }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.92)', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '0.3rem 0.3rem 0.3rem 0.85rem', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleChatInput}
                    placeholder={phase === 'start' ? 'Enter company name...' : 'Chat with orchestrator...'}
                    disabled={loading}
                    style={{
                      flex: 1, background: 'none', border: 'none',
                      padding: '0.35rem 0', fontFamily: T.ui, fontSize: '0.82rem',
                      color: T.text, outline: 'none',
                    }}
                  />
                  <Btn onClick={handleOrchestratorMessage} disabled={loading || !input.trim()} small style={{ borderRadius: '10px', padding: '0.35rem 0.9rem' }}>
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
                      return <span style={{ color: T.mint }}>{label}{power.runs > 0 ? ` · ${power.runs} runs` : ''}</span>;
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {/* Right panel tab bar */}
          {!showSettings && (
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', background: '#fff', padding: '8px 16px', display: 'flex', gap: 1, flexShrink: 0 }}>
              {[{ id: 'demo', label: 'Demo' }, { id: 'canvas', label: '⬡ Canvas' }].map(v => (
                <button key={v.id} onClick={() => setRightView(v.id)} style={{
                  background: rightView === v.id ? 'rgba(0,0,0,0.05)' : 'none', border: 'none', borderRadius: 8,
                  padding: '0.45rem 1rem', cursor: 'pointer', fontFamily: T.ui, fontSize: '0.78rem',
                  fontWeight: rightView === v.id ? 600 : 500, letterSpacing: '-0.01em',
                  color: rightView === v.id ? T.text : 'rgba(0,0,0,0.35)',
                  transition: 'all 0.15s ease',
                }}>{v.label}</button>
              ))}
            </div>
          )}
          {/* Canvas view */}
          {!showSettings && rightView === 'canvas' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <CanvasPanel
                workers={workers}
                sessionId={sessionId}
                onRun={handleRunWorker}
                fetchLogs={fetchWorkerLogs}
                logs={workerLogs}
                onOpenZcAgent={openZcAgent}
                onAgentSpawned={(data) => {
                  // skill:selected event — already handled in AppInner SSE, but log it
                }}
              />
            </div>
          )}
          {/* Demo view */}
          <div style={{ flex: rightView === 'canvas' && !showSettings ? 0 : 1, overflowY: showSettings ? 'hidden' : 'auto', padding: showSettings || rightView === 'canvas' ? 0 : '1.5rem', display: rightView === 'canvas' && !showSettings ? 'none' : 'flex', flexDirection: 'column', gap: showSettings ? 0 : '1.5rem' }}>
          {showSettings && <SettingsPanel />}
          {!showSettings && <>
            {phase === 'start' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: 480, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '1.25rem' }}>
                    AI Back-Office Simulator
                  </div>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.85rem', letterSpacing: '-0.04em', lineHeight: 1.15, fontFamily: T.ui }}>
                    Type a company name<br/>to begin
                  </h1>
                  <p style={{ color: T.muted, fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '2.5rem', maxWidth: 380, margin: '0 auto 2.5rem' }}>
                    The orchestrator researches the company, detects platforms, builds live sandboxes, and deploys AI workers — all through chat.
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                    {[
                      { icon: '🔍', label: 'Research', desc: 'AI discovers platforms' },
                      { icon: '🏗️', label: 'Build', desc: 'Live sandbox per platform' },
                      { icon: '🤖', label: 'Automate', desc: 'Workers with real triggers' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.7)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>{s.label}</div>
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
          </>}
          </div>
        </div>
      </div>
      <ObservabilityPanel />
      </div>
      {showNetwork && (
        <AgentNetwork3D
          agentTree={agentTree}
          workers={workers}
          onClose={() => setShowNetwork(false)}
        />
      )}
    </div>
  );
}

const miniInputStyle = {
  background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px',
  padding: '0.45rem 0.75rem', fontFamily: T.ui, fontSize: '0.78rem',
  color: T.text, outline: 'none', width: '100%',
};

// ── Observability Panel ───────────────────────────────────────────────────────
const EV_COLORS = {
  'agent:spawn':        '#B06CEF',
  'agent:reply':        '#6CDDEF',
  'agent:retry':        '#F59E0B',
  'agent:supervisor':   '#8B5CF6',
  'agent:message':      '#06B6D4',
  'skill:selected':     '#A78BFA',
  'artifact:created':   '#34D399',
  'worker:trigger':     T.mint,
  'worker:twilio_call': '#F5C842',
  'worker:error':       '#EF4444',
  'worker:trigger_manual': '#EF9B6C',
  'platform:health':    '#34D399',
};
const EV_ICONS = {
  'agent:spawn':        '🤖',
  'agent:reply':        '💬',
  'agent:retry':        '↺',
  'agent:supervisor':   '🛡️',
  'agent:message':      '→',
  'skill:selected':     '🎯',
  'artifact:created':   '📄',
  'worker:trigger':     '⚡',
  'worker:twilio_call': '📞',
  'worker:error':       '✗',
  'platform:health':    '📡',
};

function ObservabilityPanel() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState(false);
  const esRef = useRef(null);
  const listRef = useRef(null);

  // Load recent events on open + poll every 10s as SSE fallback
  useEffect(() => {
    if (!open) return;
    function fetchEvents() {
      fetch('/api/demo/events?n=80').then(r => r.json()).then(d => {
        if (Array.isArray(d)) { setEvents(d.reverse()); setLive(true); }
      }).catch(() => {});
    }
    fetchEvents();
    const poll = setInterval(fetchEvents, 10000);
    return () => clearInterval(poll);
  }, [open]);

  // SSE connection
  const lastMsgRef = useRef(0);
  useEffect(() => {
    if (!open) { if (esRef.current) { esRef.current.close(); esRef.current = null; setLive(false); } return; }
    const es = new EventSource('/api/demo/events/stream');
    esRef.current = es;
    es.onopen = () => setLive(true);
    // onerror fires on every Vercel reconnect — only mark dead if no message in 30s
    es.onerror = () => { if (Date.now() - lastMsgRef.current > 30000) setLive(false); };
    es.onmessage = (e) => {
      lastMsgRef.current = Date.now();
      setLive(true);
      try {
        const ev = JSON.parse(e.data);
        setEvents(prev => [ev, ...prev].slice(0, 120));
      } catch {}
    };
    return () => { es.close(); esRef.current = null; setLive(false); };
  }, [open]);

  useEffect(() => {
    if (listRef.current && events.length > 0) listRef.current.scrollTop = 0;
  }, [events.length]);

  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function fmtData(ev) {
    const d = ev.data || {};
    if (ev.type === 'agent:spawn') return `${d.name || d.agentId} (${d.role || ''})`;
    if (ev.type === 'agent:reply') return `${d.agentId}: "${(d.reply || '').slice(0, 80)}${(d.reply||'').length > 80 ? '…' : ''}"`;
    if (ev.type === 'worker:trigger') {
      const parts = [d.workerName || d.workerId];
      if (d.amount !== undefined) parts.push(`$${d.amount}`);
      if (d.item) parts.push(d.item);
      if (d.stock !== undefined) parts.push(`stock=${d.stock}`);
      if (d.trigger) parts.push(d.trigger);
      if (d.contactName) parts.push(d.contactName);
      if (d.phone) parts.push(`(${d.phone})`);
      return parts.join(' · ');
    }
    if (ev.type === 'worker:twilio_call') return `Call to ${d.to} — SID ${(d.sid||'').slice(0,16)}… status=${d.status}`;
    if (ev.type === 'worker:error') return `${d.workerName || d.workerId}: ${d.error}`;
    if (ev.type === 'agent:retry') return `${d.agentId} — attempt ${d.attempt}/${d.maxRetries} · ${d.reason || ''}`;
    if (ev.type === 'agent:supervisor') return `${d.agentId} ${d.status === 'recovered' ? '✓ recovered' : d.status === 'exhausted' ? '✗ exhausted' : d.status} after ${d.attempts} attempt(s)`;
    if (ev.type === 'agent:message') return `${d.from} → ${d.to} [${d.type || ''}]${d.attempt ? ` #${d.attempt}` : ''}`;
    if (ev.type === 'skill:selected') return `${d.selectedName} [${d.selectedType}] · ${(d.rationale||'').slice(0,60)}`;
    if (ev.type === 'artifact:created') return `${d.title || d.artifactId} [${d.type}]${d.resource ? ' via ' + d.resource : ''}`;
    return JSON.stringify(d).slice(0, 100);
  }

  return (
    <div style={{ borderTop: T.border, background: T.card, flexShrink: 0 }}>
      {/* Header / toggle */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted }}>
          Observability
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? T.mint : T.muted, boxShadow: live ? `0 0 5px ${T.mint}` : 'none' }} />
          <span style={{ fontFamily: T.mono, fontSize: '0.58rem', color: live ? T.mint : T.muted }}>{live ? 'live' : 'off'}</span>
        </span>
        {events.length > 0 && (
          <span style={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.muted }}>{events.length} events</span>
        )}
        <span style={{ marginLeft: 'auto', color: T.muted, fontSize: '0.7rem' }}>{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div ref={listRef} style={{ maxHeight: 260, overflowY: 'auto', borderTop: T.border }}>
          {events.length === 0 && (
            <div style={{ padding: '1rem 1.5rem', color: T.muted, fontFamily: T.mono, fontSize: '0.7rem' }}>
              No events yet. Run an agent or trigger a worker.
            </div>
          )}
          {events.map((ev, i) => {
            const color = EV_COLORS[ev.type] || T.muted;
            const icon = EV_ICONS[ev.type] || '●';
            return (
              <div key={i} style={{
                padding: '0.35rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                background: i === 0 && live ? 'rgba(108,239,160,0.04)' : 'transparent',
              }}>
                <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, flexShrink: 0, paddingTop: 1, minWidth: 68 }}>
                  {fmtTime(ev.at)}
                </span>
                <span style={{ fontSize: '0.75rem', flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
                <span style={{
                  fontFamily: T.mono, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                  color, flexShrink: 0, paddingTop: 1, minWidth: 110,
                }}>{ev.type}</span>
                <span style={{ fontFamily: T.mono, fontSize: '0.62rem', color: T.text, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmtData(ev)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Agent Flow Graph (hover popup) ────────────────────────────────────────────
const STATUS_COLOR = { running: T.blue, done: T.mint, pending: T.muted, delegating: T.orange, error: T.red };

function AgentFlowNode({ data }) {
  const isRetrying = !!data.retryInfo;
  const isSupervisor = data.role === 'supervisor';
  const isMonitor = data.role === 'platform-monitor';
  const isPlatform = data.role === 'platform';
  const isPlatformAgent = data.role === 'platform-agent';
  const isDown = isPlatform && data.status === 'error';
  const sc = isRetrying ? '#d97706' : isDown ? '#dc2626' : data.status === 'running' ? '#16a34a' : '#94a3b8';
  const bg = isSupervisor ? '#f1f0f8' : isMonitor ? '#f0f4f0' : isPlatform ? (isDown ? '#fef2f2' : '#f0f7f0') : isPlatformAgent ? '#f0f6f8' : '#ffffff';
  const nameColor = isSupervisor ? '#4c1d95' : isMonitor ? '#166534' : isPlatform ? (isDown ? '#dc2626' : '#166534') : isPlatformAgent ? '#0c4a6e' : '#0D0D0D';
  const borderColor = isSupervisor ? '#7c3aed' : isMonitor ? '#16a34a' : isPlatformAgent ? '#0891b2' : sc;
  return (
    <div
      onClick={() => data.onNodeClick && data.onNodeClick(data.nodeId)}
      style={{
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 6,
        padding: '5px 10px', minWidth: 120, maxWidth: 165,
        fontFamily: T.mono, fontSize: '0.62rem',
        boxShadow: isDown ? `0 0 6px #dc262622` : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: '0.8rem', lineHeight: 1, flexShrink: 0 }}>{data.icon}</span>
        <span style={{ fontWeight: 700, color: nameColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</span>
        {isDown && <span style={{ fontSize: '0.5rem', color: '#dc2626', marginLeft: 'auto' }}>DOWN</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc, flexShrink: 0 }} />
        <span style={{ color: sc, textTransform: 'uppercase', fontSize: '0.55rem' }}>{isRetrying ? 'retrying' : data.status}</span>
        {isRetrying && <span style={{ color: '#d97706', fontSize: '0.52rem', marginLeft: 2 }}>{data.retryInfo.attempt}/{data.retryInfo.maxRetries}</span>}
      </div>
      {data.task && <div style={{ color: '#64748b', fontSize: '0.56rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.task}</div>}
      {isRetrying && data.retryInfo.reason && (
        <div style={{ background: '#fef3c7', borderRadius: 3, padding: '1px 5px', fontSize: '0.5rem', color: '#d97706', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.retryInfo.reason}
        </div>
      )}
      {isPlatformAgent && <div style={{ color: '#0891b2', fontSize: '0.5rem', marginTop: 2, letterSpacing: '0.03em' }}>Data Agent · API</div>}
      {!isSupervisor && !isMonitor && !isPlatform && !isPlatformAgent && <div style={{ color: '#64748b', fontSize: '0.52rem', marginTop: 3, opacity: 0.7, letterSpacing: '0.04em' }}>click to chat</div>}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
}

const AGENT_NODE_TYPES = { agentNode: AgentFlowNode };

function buildAgentFlow(treeNodes, onNodeClick, agentRetries, recentMsgs) {
  if (!treeNodes.length) return { nodes: [], edges: [] };
  const NODE_W = 155, NODE_H = 78, V_GAP = 80, H_GAP = 20;
  const CX = 300; // canvas center x

  // Separate node groups
  const orchNode = treeNodes.find(n => n.role === 'orchestrator');
  const supNode = treeNodes.find(n => n.role === 'supervisor');
  const orchSupNode = treeNodes.find(n => n.role === 'orch-supervisor' || n.id && n.id.startsWith('orch-supervisor'));
  const monitorNode = treeNodes.find(n => n.role === 'platform-monitor');
  const platformNodes = treeNodes.filter(n => n.role === 'platform');
  const platformAgentNodes = treeNodes.filter(n => n.role === 'platform-agent');
  const agentNodes = treeNodes.filter(n => !['orchestrator','supervisor','platform-monitor','platform','platform-agent'].includes(n.role));

  // Recent message pairs for animated edges
  const msgEdgeSet = new Set();
  (recentMsgs || []).slice(0, 5).forEach(m => { if (m.from && m.to) msgEdgeSet.add(m.from + '→' + m.to); });

  const positions = {};
  const nodes = [];

  // Row 0: Orchestrator at center-top
  if (orchNode) {
    positions[orchNode.id] = { x: CX - NODE_W / 2, y: 0 };
    nodes.push({ id: orchNode.id, type: 'agentNode', position: positions[orchNode.id], data: { icon: orchNode.icon || '🧠', name: orchNode.name, status: orchNode.status, task: orchNode.task, role: orchNode.role, nodeId: orchNode.id, onNodeClick, retryInfo: null } });
  }

  // Row 1: Supervisor (left), OrchestratorSupervisor (right of orch), Monitor (far right)
  const row1Y = V_GAP + NODE_H;
  let row1Nodes = [supNode, orchSupNode, monitorNode].filter(Boolean);
  row1Nodes.forEach((n, i) => {
    const total = row1Nodes.length;
    const x = CX + (i - (total - 1) / 2) * (NODE_W + H_GAP) - NODE_W / 2;
    positions[n.id] = { x, y: row1Y };
    nodes.push({ id: n.id, type: 'agentNode', position: positions[n.id], data: { icon: n.icon || (n.role === 'supervisor' ? '🛡️' : n.role === 'platform-monitor' ? '📡' : '🔁'), name: n.name, status: n.status, task: n.task, role: n.role, nodeId: n.id, onNodeClick, retryInfo: (agentRetries || {})[n.id] || null } });
  });

  // Row 2: Worker agents (children of orchestrator or orphaned)
  const workerAgents = agentNodes.filter(n => n.parentId === (orchNode && orchNode.id) || (!n.parentId && n.role !== 'skill-agent'));
  const skillAgents = agentNodes.filter(n => n.role === 'skill-agent' || n.role === 'resource');
  const otherAgents = agentNodes.filter(n => !workerAgents.includes(n) && !skillAgents.includes(n));
  const allWorkers = [...workerAgents, ...otherAgents];
  const row2Y = row1Y + V_GAP + NODE_H;
  allWorkers.forEach((n, i) => {
    const total = allWorkers.length;
    const x = CX + (i - (total - 1) / 2) * (NODE_W + H_GAP) - NODE_W / 2;
    positions[n.id] = { x, y: row2Y };
    nodes.push({ id: n.id, type: 'agentNode', position: positions[n.id], data: { icon: n.icon || '🤖', name: n.name, status: n.status, task: n.task, role: n.role, nodeId: n.id, onNodeClick, retryInfo: (agentRetries || {})[n.id] || null } });
  });

  // Row 3: Skill agents below workers
  const row3Y = row2Y + V_GAP + NODE_H;
  skillAgents.forEach((n, i) => {
    const total = skillAgents.length;
    const x = CX + (i - (total - 1) / 2) * (NODE_W + H_GAP) - NODE_W / 2;
    positions[n.id] = { x, y: row3Y };
    nodes.push({ id: n.id, type: 'agentNode', position: positions[n.id], data: { icon: n.icon || '🎯', name: n.name, status: n.status, task: n.task, role: n.role, nodeId: n.id, onNodeClick, retryInfo: null } });
  });

  // Row 3.5: Platform agents (between workers and platforms)
  const rowPAY = (skillAgents.length ? row3Y : row2Y) + V_GAP + NODE_H;
  platformAgentNodes.forEach((n, i) => {
    const total = platformAgentNodes.length;
    const x = CX + (i - (total - 1) / 2) * (NODE_W + H_GAP) - NODE_W / 2;
    positions[n.id] = { x, y: rowPAY };
    nodes.push({ id: n.id, type: 'agentNode', position: positions[n.id], data: { icon: '🗄️', name: n.name, status: n.status, task: n.task, role: n.role, nodeId: n.id, onNodeClick, retryInfo: (agentRetries || {})[n.id] || null } });
  });

  // Row bottom: Platform nodes
  const rowPY = (platformAgentNodes.length ? rowPAY : (skillAgents.length ? row3Y : row2Y)) + V_GAP + NODE_H;
  platformNodes.forEach((n, i) => {
    const total = platformNodes.length;
    const x = CX + (i - (total - 1) / 2) * (NODE_W + H_GAP) - NODE_W / 2;
    positions[n.id] = { x, y: rowPY };
    nodes.push({ id: n.id, type: 'agentNode', position: positions[n.id], data: { icon: n.icon || '🖥️', name: n.name, status: n.status, task: n.task, role: n.role, nodeId: n.id, onNodeClick, retryInfo: null } });
  });

  // ── Edges ──
  const edges = [];
  const edgeColor = (role) => role === 'supervisor' ? '#7c3aed' : role === 'platform-monitor' ? '#16a34a' : role === 'orchestrator' ? '#475569' : '#94a3b8';

  // Orchestrator → row1 (supervisor, orch-supervisor, monitor)
  if (orchNode) {
    row1Nodes.forEach(n => {
      const hasMsg = msgEdgeSet.has(orchNode.id + '→' + n.id) || msgEdgeSet.has(n.id + '→' + orchNode.id);
      edges.push({ id: `e-orch-${n.id}`, source: orchNode.id, target: n.id, animated: hasMsg, style: { stroke: edgeColor(n.role), strokeWidth: hasMsg ? 1.5 : 1, strokeDasharray: '5,4', opacity: 0.7 }, markerEnd: { type: MarkerType.ArrowClosed, width: 7, height: 7, color: edgeColor(n.role) }, label: n.role === 'supervisor' ? 'supervises' : n.role === 'platform-monitor' ? 'monitors' : 'sql retry', labelStyle: { fill: edgeColor(n.role), fontSize: '0.45rem', fontFamily: 'monospace' } });
    });
  }

  // Supervisor → worker agents (dashed, amber when retrying)
  if (supNode) {
    allWorkers.forEach(n => {
      const isRetrying = !!(agentRetries || {})[n.id];
      edges.push({ id: `sup-${n.id}`, source: supNode.id, target: n.id, animated: isRetrying, style: { stroke: isRetrying ? '#d97706' : '#c4b5fd', strokeWidth: isRetrying ? 1.5 : 1, strokeDasharray: '4,4' }, label: isRetrying ? `↺ ${(agentRetries[n.id] || {}).attempt}/${(agentRetries[n.id] || {}).maxRetries}` : 'watches', labelStyle: { fill: isRetrying ? '#d97706' : '#a78bfa', fontSize: '0.44rem', fontFamily: 'monospace' }, markerEnd: isRetrying ? { type: MarkerType.ArrowClosed, width: 7, height: 7, color: '#d97706' } : undefined, zIndex: isRetrying ? 10 : 0 });
    });
  }

  // OrchestratorSupervisor → orchestrator retry edge
  if (orchSupNode && orchNode) {
    const isRetrying = !!(agentRetries || {})[orchSupNode.id];
    edges.push({ id: `orchsup-orch`, source: orchSupNode.id, target: orchNode.id, animated: isRetrying, style: { stroke: isRetrying ? '#d97706' : '#fde68a', strokeWidth: isRetrying ? 1.5 : 1, strokeDasharray: '4,4' }, label: isRetrying ? `↺ fixing SQL` : 'sql guard', labelStyle: { fill: isRetrying ? '#d97706' : '#92400e', fontSize: '0.44rem', fontFamily: 'monospace' }, markerEnd: isRetrying ? { type: MarkerType.ArrowClosed, width: 7, height: 7, color: '#d97706' } : undefined });
  }

  // Orchestrator → worker agents (delegation)
  if (orchNode) {
    allWorkers.forEach(n => {
      const hasMsg = msgEdgeSet.has(orchNode.id + '→' + n.id);
      if (!hasMsg) return;
      edges.push({ id: `orch-del-${n.id}`, source: orchNode.id, target: n.id, animated: true, style: { stroke: '#64748b', strokeWidth: 1.5 }, label: 'delegate', labelStyle: { fill: '#64748b', fontSize: '0.44rem', fontFamily: 'monospace' }, markerEnd: { type: MarkerType.ArrowClosed, width: 7, height: 7, color: '#64748b' } });
    });
  }

  // Orchestrator → platform agents (delegate)
  if (orchNode) {
    platformAgentNodes.forEach(n => {
      const hasMsg = msgEdgeSet.has(orchNode.id + '→' + n.id) || msgEdgeSet.has(n.id + '→' + orchNode.id);
      edges.push({ id: `orch-pa-${n.id}`, source: orchNode.id, target: n.id, animated: hasMsg || n.status === 'running', style: { stroke: '#0891b2', strokeWidth: hasMsg ? 1.5 : 1, strokeDasharray: '5,3', opacity: 0.8 }, label: 'delegate', labelStyle: { fill: '#0891b2', fontSize: '0.45rem', fontFamily: 'monospace' }, markerEnd: { type: MarkerType.ArrowClosed, width: 7, height: 7, color: '#0891b2' } });
    });
  }

  // Platform agents → platforms (data access)
  platformAgentNodes.forEach(pa => {
    // Try to match platform-agent-PLATFORMID → platform-PLATFORMID
    const platformId = pa.id.replace('platform-agent-', '');
    const matchedPlatform = platformNodes.find(p => p.id === 'platform-' + platformId || p.id.includes(platformId));
    if (matchedPlatform && positions[matchedPlatform.id]) {
      edges.push({ id: `pa-plat-${pa.id}`, source: pa.id, target: matchedPlatform.id, animated: pa.status === 'running', style: { stroke: '#bae6fd', strokeWidth: 1.2, strokeDasharray: '4,4' }, label: 'db access', labelStyle: { fill: '#0c4a6e', fontSize: '0.42rem', fontFamily: 'monospace' }, markerEnd: { type: MarkerType.ArrowClosed, width: 6, height: 6, color: '#0891b2' } });
    }
  });

  // Monitor → platforms
  if (monitorNode) {
    platformNodes.forEach(n => {
      const isDown = n.status === 'error';
      edges.push({ id: `mon-${n.id}`, source: monitorNode.id, target: n.id, animated: true, style: { stroke: isDown ? '#dc2626' : '#bbf7d0', strokeWidth: isDown ? 1.5 : 1, strokeDasharray: isDown ? '3,3' : '6,4' }, label: isDown ? '↺ restart' : '♥ ping', labelStyle: { fill: isDown ? '#dc2626' : '#15803d', fontSize: '0.44rem', fontFamily: 'monospace' }, markerEnd: { type: MarkerType.ArrowClosed, width: 7, height: 7, color: isDown ? '#dc2626' : '#16a34a' } });
    });
  }

  // Skill agent → resource child
  skillAgents.filter(n => n.parentId).forEach(n => {
    if (positions[n.parentId]) {
      edges.push({ id: `skill-${n.id}`, source: n.parentId, target: n.id, style: { stroke: '#A78BFA', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, width: 7, height: 7, color: '#A78BFA' } });
    }
  });

  // Recent message edges (live pulse)
  (recentMsgs || []).slice(0, 3).forEach((m, i) => {
    const srcPos = positions[m.from];
    const tgtPos = positions[m.to];
    if (!srcPos || !tgtPos || m.from === m.to) return;
    const edgeId = `msg-${m.from}-${m.to}-${i}`;
    if (edges.find(e => e.id === edgeId)) return;
    edges.push({ id: edgeId, source: m.from, target: m.to, animated: true, style: { stroke: '#06B6D4', strokeWidth: 1.5 }, label: (m.type || '').replace(/_/g, ' ').slice(0, 14), labelStyle: { fill: '#06B6D4', fontSize: '0.42rem', fontFamily: 'monospace' }, markerEnd: { type: MarkerType.ArrowClosed, width: 6, height: 6, color: '#06B6D4' }, zIndex: 5 });
  });

  return { nodes, edges };
}

function AgentFlowHover({ treeNodes, agentRetries, onClear, onAgentClick, recentMsgs }) {
  const [show, setShow] = useState(false);
  const { nodes: rfNodes, edges: rfEdges } = buildAgentFlow(treeNodes, onAgentClick, agentRetries, recentMsgs);
  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync RF state when treeNodes or retries change
  useEffect(() => {
    const { nodes: n, edges: e } = buildAgentFlow(treeNodes, onAgentClick, agentRetries, recentMsgs);
    setNodes(n);
    setEdges(e);
  }, [treeNodes, onAgentClick, agentRetries, recentMsgs]);

  const running = treeNodes.filter(n => n.status === 'running').length;
  const total = treeNodes.length;
  if (!total) return null;

  const MSG_H = (recentMsgs && recentMsgs.length) ? 110 : 0;
  const GRAPH_H = 340;
  const popH = GRAPH_H + MSG_H + 8;

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          width: 580, height: popH,
          background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 6 }}>
            <span style={{ fontFamily: T.mono, fontSize: '0.52rem', color: T.muted, padding: '2px 6px', background: T.bg, borderRadius: 4 }}>Agent Network</span>
            <button onClick={onClear} style={{ background: T.faint, border: T.border, borderRadius: 4, padding: '2px 8px', fontFamily: T.mono, fontSize: '0.58rem', cursor: 'pointer', color: T.muted }}>clear</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ReactFlow
              nodes={nodes} edges={edges}
              nodeTypes={AGENT_NODE_TYPES}
              fitView fitViewOptions={{ padding: 0.25 }}
              nodesDraggable={false} nodesConnectable={false}
              elementsSelectable={false} zoomOnScroll={false}
              panOnDrag={false} preventScrolling={false}
              style={{ background: '#f8fafc' }}
            >
              <Background gap={24} size={0.5} color="rgba(0,0,0,0.05)" />
            </ReactFlow>
          </div>
          {recentMsgs && recentMsgs.length > 0 && (
            <div style={{ height: MSG_H, background: '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.08)', overflowY: 'auto', padding: '4px 8px' }}>
              <div style={{ fontFamily: T.mono, fontSize: '0.48rem', color: '#475569', marginBottom: 3, letterSpacing: '0.05em' }}>MESSAGE PASSING</div>
              {recentMsgs.slice(0, 6).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontFamily: T.mono, fontSize: '0.46rem', color: '#94a3b8', flexShrink: 0 }}>{new Date(m.at).toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                  <span style={{ fontFamily: T.mono, fontSize: '0.48rem', color: '#2563eb', flexShrink: 0 }}>{(m.from || '?').slice(0, 18)}</span>
                  <span style={{ fontFamily: T.mono, fontSize: '0.48rem', color: '#94a3b8' }}>→</span>
                  <span style={{ fontFamily: T.mono, fontSize: '0.48rem', color: '#7c3aed', flexShrink: 0 }}>{(m.to || '?').slice(0, 18)}</span>
                  <span style={{ fontFamily: T.mono, fontSize: '0.46rem', color: '#64748b', background: '#e2e8f0', borderRadius: 3, padding: '0 4px', flexShrink: 0 }}>{(m.type || '').replace(/_/g, ' ')}</span>
                  {m.message && <span style={{ fontFamily: T.mono, fontSize: '0.44rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message.slice(0, 50)}</span>}
                </div>
              ))}
            </div>
          )}
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
        background: isUser ? '#1a1a1a' : 'rgba(255,255,255,0.9)',
        color: isUser ? '#fff' : T.text,
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '0.65rem 1rem',
        fontSize: '0.82rem',
        lineHeight: 1.55,
        boxShadow: isUser ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
        border: isUser ? 'none' : '1px solid rgba(0,0,0,0.06)',
        fontFamily: msg.tag === 'agent:plan' ? T.mono : T.ui,
        whiteSpace: msg.tag === 'agent:plan' ? 'pre-wrap' : 'normal',
        letterSpacing: '-0.01em',
      }}>{msg.content}</div>
      {msg.imageUrl && (
        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" style={{ maxWidth: '90%', display: 'block', marginTop: '0.3rem' }}>
          <img src={msg.imageUrl} alt={msg.content} style={{ width: '100%', maxWidth: 400, borderRadius: T.radius, display: 'block', border: T.border }} onError={e => { e.target.style.display='none'; }} />
        </a>
      )}
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


// ── Zeroclaw Agent Chat Panel ─────────────────────────────────────────────────
function ZcAgentChatPanel({ agent, history, input, setInput, onSend, loading, historyLoading, onBack }) {
  const endRef = useRef(null);
  const [tab, setTab] = useState('chat');
  const [trace, setTrace] = useState([]);
  const [traceLoading, setTraceLoading] = useState(false);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  useEffect(() => {
    if (tab !== 'trace' || !agent?.id) return;
    setTraceLoading(true);
    fetch(`/api/demo/agents/${agent.id}/trace`)
      .then(r => r.json())
      .then(d => setTrace(d.trace || []))
      .catch(() => {})
      .finally(() => setTraceLoading(false));
  }, [tab, agent?.id]);
  const STATUS_COLORS = { running: T.blue, done: T.mint, pending: T.muted, error: T.red };
  const sc = STATUS_COLORS[agent.status] || T.muted;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '0.55rem 1rem', borderBottom: T.border, background: T.faint, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 3 }}>
          <Btn ghost small onClick={onBack}>←</Btn>
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{agent.icon || '🤖'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: '0.8rem', fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.name}
            </div>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, boxShadow: agent.status === 'running' ? `0 0 5px ${sc}` : 'none' }} />
            <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: sc, textTransform: 'uppercase' }}>{agent.status}</span>
          </span>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: '0.56rem', color: T.muted, paddingLeft: '2.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(0,0,0,0.06)', border: T.border, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.03em', color: T.text }}>{agent.id}</span>
          <span>{agent.task || agent.role}</span>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ background: T.card, borderBottom: T.border, display: 'flex', flexShrink: 0 }}>
        {['chat', 'trace'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.57rem', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', color: tab === t ? T.text : T.muted, borderBottom: tab === t ? `2px solid ${T.text}` : '2px solid transparent', marginBottom: -1 }}>{t}</button>
        ))}
      </div>
      {tab === 'chat' && <>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {historyLoading && <div style={{ color: T.muted, fontSize: '0.7rem', fontFamily: T.mono, textAlign: 'center', padding: '1rem' }}>Loading history…</div>}
          {!historyLoading && history.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {loading && <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, fontStyle: 'italic' }}>Thinking…</div>}
          <div ref={endRef} />
        </div>
        {/* Input */}
        <div style={{ borderTop: T.border, padding: '0.75rem', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={`Message ${agent.name}…`} disabled={loading || historyLoading} autoFocus style={{ ...miniInputStyle, flex: 1 }} />
          <Btn small onClick={onSend} disabled={loading || historyLoading || !input.trim()}>→</Btn>
        </div>
      </>}
      {tab === 'trace' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {traceLoading && <div style={{ color: T.muted, fontSize: '0.7rem', fontFamily: T.mono, textAlign: 'center', padding: '1rem' }}>Loading trace…</div>}
          {!traceLoading && trace.length === 0 && <div style={{ color: T.muted, fontSize: '0.7rem', fontFamily: T.mono, textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>No trace data yet. Run the agent to see execution steps.</div>}
          {trace.map((entry, i) => {
            const borderColor = entry.type === 'tool_call' ? T.blue : entry.type === 'tool_result' ? T.mint : entry.type === 'error' ? T.red : T.muted;
            return (
              <div key={i} style={{ marginBottom: '0.45rem', background: T.faint, borderRadius: T.radius, padding: '0.4rem 0.6rem', borderLeft: `3px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.56rem', fontFamily: T.mono, color: T.muted }}>
                    {entry.at ? new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${i+1}`}
                  </span>
                  <span style={{ fontSize: '0.58rem', fontFamily: T.mono, fontWeight: 700, color: borderColor, textTransform: 'uppercase' }}>
                    {entry.type || 'event'}
                  </span>
                  {entry.tool && <span style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.text }}>{entry.tool}</span>}
                </div>
                {entry.content && (
                  <pre style={{ margin: 0, fontSize: '0.63rem', fontFamily: T.mono, color: T.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all', opacity: 0.85, maxHeight: 120, overflow: 'hidden' }}>
                    {typeof entry.content === 'string' ? entry.content.slice(0, 400) : JSON.stringify(entry.content, null, 2).slice(0, 400)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
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
const TRIGGER_ICONS = { schedule: '⏰', webhook: '🔗', manual: '▶️', message: '💬', 'platform-event': '📡', 'db-change': '🗄️', 'db-condition': '🔎' };

function WorkerCard({ worker, sessionId, onDeploy, onRun, deploying, realClientActive }) {
  const trigger = worker.trigger || {};
  const steps = worker.steps || [];
  const ttype = trigger.type || 'manual';
  const triggerIcon = TRIGGER_ICONS[ttype] || '⚡';
  const tcfg = trigger.config || {};
  const phone = worker.phone || tcfg.phone || '';
  const [showRuns, setShowRuns] = useState(false);
  const [recentLogs, setRecentLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  function toggleRuns() {
    if (recentLogs === null) {
      setLogsLoading(true);
      fetch(`/api/demo/workers/${worker.id}/logs?sessionId=${sessionId}`)
        .then(r => r.json())
        .then(d => setRecentLogs((d.logs || []).slice(-8)))
        .catch(() => setRecentLogs([]))
        .finally(() => setLogsLoading(false));
    }
    setShowRuns(s => !s);
  }

  // Build a concise trigger detail line
  let triggerDetail = trigger.label || ttype;
  if (ttype === 'db-condition' && tcfg.condition) {
    triggerDetail = `WHERE ${tcfg.condition}` + (tcfg.table ? ` ON ${tcfg.table}` : '');
  } else if (ttype === 'db-change' && tcfg.table) {
    triggerDetail = `${tcfg.event || 'any'} on ${tcfg.table}`;
  } else if (ttype === 'schedule' && tcfg.cron) {
    triggerDetail = tcfg.cron;
  }

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

        {/* Trigger block */}
        <div style={{ marginTop: '0.65rem', background: T.faint, borderRadius: T.radius, padding: '0.4rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem' }}>{triggerIcon}</span>
            <span style={{ fontSize: '0.62rem', fontFamily: T.mono, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ttype}</span>
            {tcfg.pollIntervalSec && <span style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted }}>· every {tcfg.pollIntervalSec}s</span>}
          </div>
          {triggerDetail && triggerDetail !== ttype && (
            <div style={{ fontSize: '0.62rem', fontFamily: T.mono, color: T.text, background: 'rgba(0,0,0,0.04)', borderRadius: 3, padding: '0.15rem 0.4rem', wordBreak: 'break-all' }}>{triggerDetail}</div>
          )}
          {phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', fontFamily: T.mono, color: T.muted }}>
              <span>📞</span><span>{phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflows grouped list */}
      {(() => {
        const workflows = worker.workflows || [];
        const hasWorkflows = Array.isArray(workflows) && workflows.length > 0;
        const hasSteps = !hasWorkflows && steps.length > 0;
        if (hasWorkflows) return (
          <div style={{ padding: '0.5rem 1rem', borderBottom: T.border, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>
              {workflows.length} Workflow{workflows.length !== 1 ? 's' : ''}
            </div>
            {workflows.map((wf, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', borderBottom: i < workflows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: wf.status === 'active' ? T.mint : T.muted, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ flex: 1, fontSize: '0.67rem', color: T.text, fontFamily: T.ui, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</span>
                <span style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted }}>{wf.trigger}</span>
              </div>
            ))}
          </div>
        );
        if (hasSteps) return (
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
        );
        return null;
      })()}

      {/* Recent runs toggle */}
      <div style={{ borderTop: T.border }}>
        <div
          onClick={toggleRuns}
          style={{ padding: '0.4rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: '0.58rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {logsLoading ? 'Loading…' : 'Recent runs'}
          </span>
          <span style={{ color: T.muted, fontSize: '0.65rem' }}>{showRuns ? '▲' : '▼'}</span>
        </div>
        {showRuns && recentLogs !== null && (
          <div style={{ borderTop: T.border, background: T.bg, maxHeight: 160, overflowY: 'auto' }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontFamily: T.mono, color: T.muted, fontStyle: 'italic' }}>No runs yet</div>
            ) : recentLogs.map((log, i) => {
              const ok = log.success !== false && !log.type?.includes('error');
              return (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', fontFamily: T.mono, padding: '0.28rem 1rem', borderBottom: i < recentLogs.length - 1 ? T.border : 'none', alignItems: 'center' }}>
                  <span style={{ color: ok ? T.mint : T.red, flexShrink: 0 }}>{ok ? '✓' : '✗'}</span>
                  <span style={{ color: T.muted, flexShrink: 0, fontSize: '0.56rem' }}>
                    {log.at ? new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.text }}>{log.message || log.type || 'run'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

// ── 3D Agent Network ──────────────────────────────────────────────────────────
function AgentNetwork3D({ agentTree, workers, onClose }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cleanup;

    import('three').then(THREE => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8fafc);
      scene.fog = new THREE.FogExp2(0xf8fafc, 0.018);

      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      camera.position.set(0, 8, 26);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      // Lights — bright white scene
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const dl = new THREE.DirectionalLight(0xffffff, 0.8);
      dl.position.set(10, 20, 10);
      scene.add(dl);
      const dl2 = new THREE.DirectionalLight(0xe2e8f0, 0.4);
      dl2.position.set(-10, -5, -10);
      scene.add(dl2);

      function makeLabel(text, size = 22) {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 80;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 512, 80);
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.font = `bold ${size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(text.slice(0, 24), 256, 54);
        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(6, 1, 1);
        return sprite;
      }

      const nodeMap = {};
      const positions = {};
      const allEdges = [];

      // Orchestrator node
      const orchGeo = new THREE.SphereGeometry(1.5, 32, 32);
      const orchMat = new THREE.MeshPhongMaterial({ color: 0x334155, emissive: 0x1e293b, shininess: 80 });
      const orchMesh = new THREE.Mesh(orchGeo, orchMat);
      orchMesh.position.set(0, 0, 0);
      scene.add(orchMesh);
      const orchLabel = makeLabel('Orchestrator', 24);
      orchLabel.position.set(0, 2.4, 0);
      scene.add(orchLabel);
      nodeMap['orchestrator'] = orchMesh;
      positions['orchestrator'] = new THREE.Vector3(0, 0, 0);

      // Agent nodes (arranged in ring)
      const agtCount = Math.max(agentTree.length, 1);
      agentTree.forEach((agent, i) => {
        const angle = (i / agtCount) * Math.PI * 2;
        const r = Math.min(7 + agtCount * 0.5, 12);
        const y = (i % 2 === 0 ? 1 : -1) * 2;
        const pos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
        positions[agent.id] = pos;

        const color = agent.status === 'running' ? 0x64748b : agent.status === 'done' ? 0x94a3b8 : 0x94a3b8;
        const geo = new THREE.SphereGeometry(0.9, 24, 24);
        const mat = new THREE.MeshPhongMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.12), shininess: 50 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);
        const lbl = makeLabel(agent.name || agent.id, 20);
        lbl.position.set(pos.x, pos.y + 1.6, pos.z);
        scene.add(lbl);
        nodeMap[agent.id] = mesh;
        allEdges.push({ from: positions['orchestrator'], to: pos });
      });

      // Worker nodes (positioned below their parent agent)
      workers.forEach((worker, i) => {
        const parentAgent = agentTree[i % Math.max(agentTree.length, 1)];
        const parentPos = parentAgent ? positions[parentAgent.id] : positions['orchestrator'];
        const angle = (i / Math.max(workers.length, 1)) * Math.PI * 2;
        const offset = new THREE.Vector3(Math.cos(angle) * 2, -4, Math.sin(angle) * 2);
        const pos = parentPos ? parentPos.clone().add(offset) : new THREE.Vector3(i * 3 - 6, -7, 0);
        positions[worker.id] = pos;

        const color = worker.status === 'deployed' ? 0x475569 : worker.status === 'running' ? 0x64748b : 0xadb5bd;
        const geo = new THREE.BoxGeometry(1.4, 0.85, 0.85);
        const mat = new THREE.MeshPhongMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.1), shininess: 30 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);
        const lbl = makeLabel(worker.name || worker.id, 18);
        lbl.position.set(pos.x, pos.y + 1.4, pos.z);
        scene.add(lbl);
        nodeMap[worker.id] = mesh;
        const fromPos = parentAgent ? positions[parentAgent.id] : positions['orchestrator'];
        if (fromPos) allEdges.push({ from: fromPos, to: pos });
      });

      // Draw edges
      const lineMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.7 });
      allEdges.forEach(edge => {
        const pts = [edge.from.clone(), edge.to.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        scene.add(new THREE.Line(geo, lineMat));
      });

      // Animated particles along edges
      const particles = allEdges.map(edge => {
        const pGeo = new THREE.SphereGeometry(0.09, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
        const mesh = new THREE.Mesh(pGeo, pMat);
        scene.add(mesh);
        return { mesh, edge, t: Math.random(), speed: 0.004 + Math.random() * 0.006 };
      });

      // Resize handler
      function onResize() {
        const nw = el.clientWidth, nh = el.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
      window.addEventListener('resize', onResize);

      // Animation
      let raf;
      let t = 0;
      function animate() {
        raf = requestAnimationFrame(animate);
        t += 0.005;

        // Orbit camera
        camera.position.x = Math.sin(t * 0.35) * 28;
        camera.position.z = Math.cos(t * 0.35) * 28;
        camera.position.y = 10 + Math.sin(t * 0.18) * 4;
        camera.lookAt(0, 0, 0);

        // Pulse orchestrator
        const s = 1 + Math.sin(t * 2.5) * 0.06;
        orchMesh.scale.set(s, s, s);

        // Move particles
        particles.forEach(p => {
          p.t = (p.t + p.speed) % 1;
          p.mesh.position.lerpVectors(p.edge.from, p.edge.to, p.t);
        });

        renderer.render(scene, camera);
      }
      animate();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    });

    return () => { if (cleanup) cleanup(); };
  }, [agentTree, workers]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#f8fafc' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {/* Legend */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: '#64748b', fontFamily: "'IBM Plex Mono','DM Mono',monospace", fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>Agent Network</div>
        <div>● <span style={{ color: '#334155' }}>Orchestrator</span></div>
        <div>● <span style={{ color: '#64748b' }}>Agents ({agentTree.length})</span></div>
        <div>■ <span style={{ color: '#475569' }}>Workers ({workers.length})</span></div>
      </div>
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, padding: '0.4rem 1rem', color: '#334155', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.06em' }}
      >✕ Close</button>
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

// ── Canvas Panel ───────────────────────────────────────────────────────────────
const REMOTE_DESKTOPS = [
  { id: 'rd1', label: 'Worker PC 1', ip: '164.90.197.224', port: 6080 },
  { id: 'rd2', label: 'Worker PC 2', ip: '167.99.222.95', port: 6080 },
  { id: 'rd3', label: 'Worker PC 3', ip: '178.128.247.39', port: 6080 },
  { id: 'rd4', label: 'Worker PC 4', ip: '142.93.131.96', port: 6080 },
];

function ArtifactCard({ file }) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const url = `/api/nfs/file?path=uploads/${encodeURIComponent(file.name)}`;
  const iconMap = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', mp4: '🎥', webm: '🎥', zip: '🗜️', json: '{}', js: '📜', txt: '📋' };
  const icon = isImage ? null : iconMap[ext] || '📁';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden', cursor: 'pointer' }}>
        {isImage
          ? <img src={url} alt={file.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
          : <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontSize: '2rem' }}>{icon}</div>
        }
        <div style={{ padding: '0.4rem 0.6rem' }}>
          <div style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted }}>{((file.size || 0) / 1024).toFixed(1)} KB</div>
        </div>
      </div>
    </a>
  );
}

function CanvasPanel({ workers, sessionId, onRun, fetchLogs, logs, onOpenZcAgent, onAgentSpawned }) {
  const [canvasTab, setCanvasTab] = useState('agents');
  const [artifacts, setArtifacts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  // Orchestrate tab state
  const [orchInput, setOrchInput] = useState('');
  const [orchLoading, setOrchLoading] = useState(false);
  const [orchHistory, setOrchHistory] = useState([]);
  const orchEndRef = useRef();

  // Load session artifacts + NFS uploads
  async function loadArtifacts() {
    const results = [];
    try {
      if (sessionId) {
        const r = await fetch(`/api/demo/artifacts/${sessionId}`);
        if (r.ok) { const d = await r.json(); results.push(...(d.artifacts || [])); }
      }
    } catch {}
    try {
      const r = await fetch('/api/nfs?path=uploads');
      if (r.ok) { const d = await r.json(); (d.entries || []).forEach(e => results.push({ ...e, type: 'upload', title: e.name })); }
    } catch {}
    setArtifacts(results);
  }

  useEffect(() => { if (canvasTab === 'artifacts') loadArtifacts(); }, [canvasTab, sessionId]);

  // SSE: auto-refresh artifacts tab on artifact:created
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource('/api/demo/events/stream');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'artifact:created' && ev.data?.sessionId === sessionId) {
          loadArtifacts();
          if (canvasTab !== 'artifacts') setCanvasTab('artifacts');
        }
        if (ev.type === 'skill:selected' && onAgentSpawned) onAgentSpawned(ev.data);
      } catch {}
    };
    return () => es.close();
  }, [sessionId, canvasTab]);

  async function uploadFile(file) {
    setUploading(true);
    try {
      await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST', body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      loadArtifacts();
    } finally { setUploading(false); }
  }

  async function runSkillAgent(task) {
    if (!task.trim() || orchLoading) return;
    const msg = task.trim();
    setOrchInput('');
    setOrchHistory(prev => [...prev, { role: 'user', content: msg }]);
    setOrchLoading(true);
    try {
      const r = await fetch('/api/demo/skill-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, task: msg }),
      });
      const d = await r.json();
      if (d.error) {
        setOrchHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + d.error }]);
      } else {
        const sel = d.selection || {};
        setOrchHistory(prev => [...prev, {
          role: 'assistant', content: d.result || '',
          meta: { resource: sel.selected_name, type: sel.selected_type, rationale: sel.rationale, artifactId: d.artifact?.id },
        }]);
      }
    } catch (e) {
      setOrchHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
    }
    setOrchLoading(false);
  }

  useEffect(() => { orchEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [orchHistory]);

  const CANVAS_TABS = [
    { id: 'orchestrate', label: '🎯 Orchestrate' },
    { id: 'agents', label: '🤖 Agents' },
    { id: 'remote', label: '🖥️ Remote Desktop' },
    { id: 'artifacts', label: '📁 Artifacts' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Canvas sub-tabs */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '0 1.25rem', display: 'flex', flexShrink: 0 }}>
        {CANVAS_TABS.map(t => (
          <button key={t.id} onClick={() => setCanvasTab(t.id)} style={{
            background: 'none', border: 'none',
            borderBottom: canvasTab === t.id ? `2px solid ${T.text}` : '2px solid transparent',
            padding: '0.55rem 1rem', cursor: 'pointer', fontFamily: T.ui, fontSize: '0.75rem',
            fontWeight: canvasTab === t.id ? 600 : 400, letterSpacing: '-0.01em',
            color: canvasTab === t.id ? T.text : T.muted, marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: canvasTab === 'remote' && selectedRd ? 'hidden' : 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ─ Orchestrate tab ─ */}
        {canvasTab === 'orchestrate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <SectionLabel>Skill Agent — on-the-fly resource selection</SectionLabel>
            <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.6rem 0.9rem', fontSize: '0.68rem', color: T.muted }}>
              Type any request. The Skill Agent picks the best resource (agents, API keys, Wavespeed image gen, Bland voice calls) and executes it, generating a Canvas artifact.
            </div>
            {/* Chat history */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 0 }}>
              {orchHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    background: m.role === 'user' ? T.blue : T.card,
                    color: m.role === 'user' ? '#fff' : T.text,
                    border: m.role === 'user' ? 'none' : T.border,
                    borderRadius: T.radius, padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem', maxWidth: '90%', whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                  {m.meta && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: T.mono, fontSize: '0.56rem', background: '#1e1040', color: '#c4b5fd', borderRadius: 4, padding: '1px 7px', border: '1px solid #6d28d9' }}>
                        🎯 {m.meta.resource || 'skill'} [{m.meta.type}]
                      </span>
                      {m.meta.rationale && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted }}>{m.meta.rationale.slice(0, 60)}</span>}
                      {m.meta.artifactId && <span style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.mint }}>✓ artifact saved</span>}
                    </div>
                  )}
                </div>
              ))}
              {orchLoading && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: T.muted, fontSize: '0.72rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue, animation: 'pulse 1s infinite' }} />
                  Skill Agent selecting resource...
                </div>
              )}
              <div ref={orchEndRef} />
            </div>
            {/* Input */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <input
                value={orchInput}
                onChange={e => setOrchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSkillAgent(orchInput); } }}
                placeholder="Ask anything — e.g. 'Summarize recent CRM activity' or 'Check low stock items'..."
                disabled={orchLoading}
                style={{ flex: 1, background: T.card, border: T.border, borderRadius: T.radius, padding: '0.5rem 0.75rem', color: T.text, fontFamily: T.mono, fontSize: '0.72rem', outline: 'none' }}
              />
              <Btn small onClick={() => runSkillAgent(orchInput)} disabled={orchLoading || !orchInput.trim()}>
                {orchLoading ? '...' : 'Run →'}
              </Btn>
            </div>
          </div>
        )}

        {/* ─ Agents tab ─ */}
        {canvasTab === 'agents' && (
          <>
            <SectionLabel>Deployed Workers — {workers.filter(w => w.status === 'deployed').length}/{workers.length} active</SectionLabel>
            {workers.length === 0 ? (
              <div style={{ color: T.muted, fontSize: '0.8rem' }}>No workers deployed yet. Complete the workers phase to see agent cards here.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {workers.map(w => <CanvasWorkerCard key={w.id} worker={w} sessionId={sessionId} onRun={onRun} fetchLogs={fetchLogs} logs={logs} onOpenZcAgent={onOpenZcAgent} />)}
              </div>
            )}
          </>
        )}

        {/* ─ Remote Desktop tab ─ */}
        {canvasTab === 'remote' && (
          <>
            <SectionLabel>Worker PCs — click to open noVNC in new tab</SectionLabel>
            <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.75rem 1rem', fontSize: '0.7rem', color: T.muted, marginBottom: '0.5rem' }}>
              ℹ️ noVNC runs over HTTP. Browsers block HTTP iframes inside HTTPS pages — use the buttons below to open in a new tab.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {REMOTE_DESKTOPS.map(rd => (
                <div key={rd.id} style={{
                  background: T.card, border: T.border, borderRadius: T.radius, padding: '1.5rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                }}>
                  <div style={{ fontSize: '2rem' }}>🖥️</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rd.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>{rd.ip}:{rd.port}</div>
                  <Btn small onClick={() => window.open(`http://${rd.ip}:${rd.port}/vnc.html?autoconnect=1&resize=scale`, '_blank')}>Open VNC →</Btn>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─ Artifacts tab ─ */}
        {canvasTab === 'artifacts' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <SectionLabel style={{ marginBottom: 0 }}>Artifacts</SectionLabel>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                <Btn small ghost onClick={loadArtifacts}>Refresh</Btn>
                <Btn small onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? '...' : '↑ Upload'}</Btn>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0]); e.target.value = ''; }} />
              </div>
            </div>
            {artifacts.length === 0 ? (
              <div style={{ color: T.muted, fontSize: '0.8rem' }}>No artifacts yet. Run a skill agent request or upload files.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {artifacts.map((a, i) => {
                  const isImage = a.type === 'image';
                  const isSkillOutput = a.type === 'skill_output' || a.type === 'db_query' || a.type === 'orchestration';
                  if (isImage) return (
                    <div key={a.id || i} style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
                      <a href={a.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={a.imageUrl} alt={a.imagePrompt || a.title || 'Generated image'} style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain', background: '#000' }} onError={e => { e.target.style.display='none'; }} />
                      </a>
                      <div style={{ padding: '0.5rem 0.8rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem' }}>🖼️</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Generated Image'}</div>
                            {a.resource && <div style={{ fontFamily: T.mono, fontSize: '0.55rem', color: '#a78bfa', marginTop: 1 }}>⚡ {a.resource.name || a.resource}</div>}
                          </div>
                          <span style={{ fontFamily: T.mono, fontSize: '0.54rem', color: T.muted, flexShrink: 0 }}>{a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : ''}</span>
                        </div>
                        {a.imagePrompt && <div style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, marginTop: '0.3rem', fontStyle: 'italic' }}>{a.imagePrompt.slice(0, 150)}</div>}
                      </div>
                    </div>
                  );
                  if (isSkillOutput) return (
                    <div key={a.id || i} style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>{a.type === 'db_query' ? '🗄️' : a.type === 'orchestration' ? '🎭' : '🎯'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Artifact'}</div>
                          {a.resource && <div style={{ fontFamily: T.mono, fontSize: '0.56rem', color: '#c4b5fd', marginTop: 2 }}>🎯 {a.resource.name || a.resource}</div>}
                        </div>
                        <span style={{ fontFamily: T.mono, fontSize: '0.54rem', color: T.muted, flexShrink: 0 }}>{a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : ''}</span>
                      </div>
                      {a.content && <div style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap', background: T.bg, borderRadius: 4, padding: '0.4rem 0.6rem', marginTop: '0.3rem' }}>{a.content.slice(0, 600)}{a.content.length > 600 ? '…' : ''}</div>}
                    </div>
                  );
                  return <ArtifactCard key={a.name || i} file={a} />;
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CanvasWorkerCard({ worker, sessionId, onRun, fetchLogs, logs, onOpenZcAgent }) {
  const [expanded, setExpanded] = useState(false);
  const workerLogs = logs[worker.id] || [];
  const lastLog = workerLogs[workerLogs.length - 1];
  const isDeployed = worker.status === 'deployed';
  const triggerLabel = typeof worker.trigger === 'object' ? worker.trigger?.label : worker.trigger;
  const hasZcAgent = !!worker.zcAgentId;

  return (
    <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Header: name + status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isDeployed ? T.mint : T.muted, boxShadow: isDeployed ? `0 0 0 0 ${T.mint}` : 'none', animation: isDeployed ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
        <span style={{ fontWeight: 700, fontSize: '0.88rem', flex: 1 }}>{worker.name}</span>
        <Badge color={isDeployed ? 'rgba(108,239,160,0.15)' : T.faint} style={{ color: isDeployed ? T.mint : T.muted }}>{worker.status || 'idle'}</Badge>
      </div>

      {/* Worker ID — debug info */}
      <div style={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted, letterSpacing: '0.02em' }}>
        {worker.id}
        {hasZcAgent && <span style={{ marginLeft: '0.5rem', color: T.blue, fontSize: '0.5rem' }}>⬡ ZC</span>}
      </div>

      {/* Trigger */}
      {triggerLabel && <div style={{ fontSize: '0.7rem', color: T.muted }}>⚡ {triggerLabel}</div>}

      {/* Last log line */}
      {lastLog && (
        <div style={{ fontFamily: T.mono, fontSize: '0.6rem', background: T.bg, padding: '0.3rem 0.5rem', borderRadius: T.radius, color: lastLog.success === false ? T.red : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastLog.at ? new Date(lastLog.at).toLocaleTimeString() + ' ' : ''}{lastLog.message || JSON.stringify(lastLog).slice(0, 80)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <Btn small ghost onClick={() => { fetchLogs(worker.id, sessionId); setExpanded(true); }}>Logs</Btn>
        <Btn small onClick={() => onRun(worker)}>▶ Run</Btn>
        {hasZcAgent && onOpenZcAgent && (
          <Btn small ghost onClick={() => onOpenZcAgent({ id: worker.zcAgentId, name: worker.name + ' Agent', task: `Automation worker for ${worker.name}. Trigger: ${triggerLabel || 'scheduled'}` })}>⬡ Chat</Btn>
        )}
        <Btn small ghost onClick={() => window.open(`/worker/${worker.id}?session=${sessionId}`, '_blank')}>Detail →</Btn>
      </div>

      {/* Expanded log */}
      {expanded && workerLogs.length > 0 && (
        <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, borderTop: T.border, paddingTop: '0.5rem' }}>
          {workerLogs.slice(-8).map((l, i) => (
            <div key={i} style={{ fontFamily: T.mono, fontSize: '0.58rem', color: l.success === false ? T.red : T.muted, display: 'flex', gap: '0.4rem' }}>
              {l.at && <span style={{ color: T.faint }}>{new Date(l.at).toLocaleTimeString()}</span>}
              <span>{l.message || JSON.stringify(l).slice(0, 80)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel() {
  const [keys, setKeys]             = useState(null);
  const [vars, setVars]             = useState(null);
  const [skills, setSkills]         = useState([]);
  const [accounts, setAccounts]     = useState([]);
  const [nfsTree, setNfsTree]       = useState(null);
  const [nfsPath, setNfsPath]       = useState('');
  const [section, setSection]       = useState('keys');
  const [savingKeys, setSavingKeys] = useState(false);
  const [editKey, setEditKey]       = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyVal, setNewKeyVal]   = useState('');
  const [editVar, setEditVar]       = useState(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarVal, setNewVarVal]   = useState('');
  const [newSkill, setNewSkill]     = useState(null);
  const [savingSkill, setSavingSkill] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState(null);
  const [newAccount, setNewAccount] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const SA_TYPES = ['google', 'aws', 'azure', 'stripe', 'sendgrid', 'github', 'slack', 'twilio', 'other'];

  useEffect(() => {
    fetch('/api/config/keys').then(r => r.json()).then(setKeys).catch(() => setKeys({}));
    fetch('/api/config/variables').then(r => r.json()).then(setVars).catch(() => setVars({}));
    fetch('/api/skills').then(r => r.json()).then(d => setSkills(d.skills || [])).catch(() => {});
    fetch('/api/service-accounts').then(r => r.json()).then(d => setAccounts(d.accounts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (section !== 'nfs') return;
    fetch(`/api/nfs?path=${encodeURIComponent(nfsPath)}`).then(r => r.json()).then(setNfsTree).catch(() => {});
  }, [section, nfsPath]);

  async function saveKey(name, value) {
    setSavingKeys(true);
    await fetch('/api/config/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [name]: value }) });
    setKeys(prev => ({ ...prev, [name]: value }));
    setEditKey(null); setNewKeyName(''); setNewKeyVal('');
    setSavingKeys(false);
  }

  async function deleteKey(name) {
    await fetch(`/api/config/keys?key=${encodeURIComponent(name)}`, { method: 'DELETE' });
    setKeys(prev => { const k = { ...prev }; delete k[name]; return k; });
  }

  async function saveVar(name, value) {
    await fetch('/api/config/variables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [name]: value }) });
    setVars(prev => ({ ...prev, [name]: value }));
    setEditVar(null); setNewVarName(''); setNewVarVal('');
  }

  async function deleteVar(name) {
    await fetch(`/api/config/variables?key=${encodeURIComponent(name)}`, { method: 'DELETE' });
    setVars(prev => { const k = { ...prev }; delete k[name]; return k; });
  }

  async function createSkill() {
    if (!newSkill?.name) return;
    setSavingSkill(true);
    const r = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSkill) });
    const d = await r.json();
    if (d.ok) {
      setSkills(prev => [...prev, { ...newSkill, slug: d.slug, created_at: new Date().toISOString() }]);
      setNewSkill(null);
    }
    setSavingSkill(false);
  }

  async function deleteSkill(slug) {
    await fetch(`/api/skills?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setSkills(prev => prev.filter(s => (s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')) !== slug));
  }

  async function createAccount() {
    if (!newAccount?.name || !newAccount?.type) return;
    setSavingAccount(true);
    const r = await fetch('/api/service-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAccount) });
    const d = await r.json();
    if (d.ok) {
      setAccounts(prev => [...prev, { ...newAccount, slug: d.slug, hasCredentials: !!newAccount.credentials, created_at: new Date().toISOString() }]);
      setNewAccount(null);
    }
    setSavingAccount(false);
  }

  async function deleteAccount(slug) {
    await fetch(`/api/service-accounts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.slug !== slug));
  }

  const tabs = [
    { id: 'keys',      label: '🔑 API Keys' },
    { id: 'variables', label: '📦 Variables' },
    { id: 'accounts',  label: '🪪 Service Accounts' },
    { id: 'skills',    label: '⚙️ Skill Library' },
    { id: 'nfs',       label: '🗄️ NFS Storage' },
  ];

  const sInput = { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '0.42rem 0.75rem', fontFamily: T.ui, fontSize: '0.78rem', color: T.text, outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: T.border, background: T.card, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)} style={{ background: 'none', border: 'none', padding: '0.6rem 1.1rem', cursor: 'pointer', fontSize: '0.62rem', fontFamily: T.mono, color: section === t.id ? T.text : T.muted, borderBottom: section === t.id ? `2px solid ${T.text}` : '2px solid transparent', marginBottom: -1, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

        {/* ── API Keys ── */}
        {section === 'keys' && (
          <div>
            <div style={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.mono, marginBottom: '1rem', lineHeight: 1.6 }}>
              Stored in <code>/opt/hw-master/keys.json</code> · accessible to all workers via <code>loadDemoKeys()</code>
            </div>
            {keys === null ? (
              <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {Object.entries(keys).map(([name, value]) => (
                  <div key={name} style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.6rem 0.85rem' }}>
                    {editKey?.name === name ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{name}</div>
                        <input defaultValue={value} id={`key-edit-${name}`} style={sInput} autoFocus />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Btn small onClick={() => saveKey(name, document.getElementById(`key-edit-${name}`).value)} disabled={savingKeys}>Save</Btn>
                          <Btn small ghost onClick={() => setEditKey(null)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{name}</div>
                          <div style={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted, letterSpacing: '0.08em' }}>{'●'.repeat(Math.min(20, value?.length || 8))}</div>
                        </div>
                        <button onClick={() => setEditKey({ name, value })} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem', fontFamily: T.mono, color: T.muted }}>Edit</button>
                        <button onClick={() => deleteKey(name)} style={{ background: 'none', border: `1px solid ${T.red}40`, borderRadius: T.radius, padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem', color: T.red }}>✕</button>
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ background: T.card, border: `1px dashed rgba(0,0,0,0.15)`, borderRadius: T.radius, padding: '0.7rem 0.85rem', marginTop: '0.2rem' }}>
                  <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', marginBottom: '0.45rem' }}>Add / Update Key</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="key_name" style={{ ...sInput, width: 140, flex: 'none' }} />
                    <input value={newKeyVal} onChange={e => setNewKeyVal(e.target.value)} placeholder="value" type="password" style={{ ...sInput, flex: 1, minWidth: 160 }} />
                    <Btn small onClick={() => saveKey(newKeyName, newKeyVal)} disabled={!newKeyName || !newKeyVal || savingKeys}>+ Add</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Variables ── */}
        {section === 'variables' && (
          <div>
            <div style={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.mono, marginBottom: '1rem', lineHeight: 1.6 }}>
              Shared non-secret config in <code>/mnt/shared/variables.json</code> · readable by all workers at runtime
            </div>
            {vars === null ? (
              <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {Object.entries(vars).map(([name, value]) => (
                  <div key={name} style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.6rem 0.85rem' }}>
                    {editVar?.name === name ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{name}</div>
                        <input defaultValue={value} id={`var-edit-${name}`} style={sInput} autoFocus />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Btn small onClick={() => saveVar(name, document.getElementById(`var-edit-${name}`).value)}>Save</Btn>
                          <Btn small ghost onClick={() => setEditVar(null)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: T.mono, fontSize: '0.62rem', fontWeight: 700, color: T.text }}>{name}</div>
                          <div style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                        </div>
                        <Btn small ghost onClick={() => setEditVar({ name })}>Edit</Btn>
                        <Btn small ghost onClick={() => deleteVar(name)} style={{ color: T.red, borderColor: T.red + '40' }}>✕</Btn>
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="variable_name" style={{ ...sInput, width: 140, flex: 'none' }} />
                  <input value={newVarVal} onChange={e => setNewVarVal(e.target.value)} placeholder="value" style={sInput} />
                  <Btn small onClick={() => saveVar(newVarName, newVarVal)} disabled={!newVarName || !newVarVal}>+ Add</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Service Accounts ── */}
        {section === 'accounts' && (
          <div>
            <div style={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.mono, marginBottom: '1rem', lineHeight: 1.6 }}>
              Stored in <code>/mnt/shared/service_accounts/</code> · JSON credential blobs for cloud providers, SaaS integrations
            </div>
            {accounts.length === 0 && !newAccount && (
              <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, marginBottom: '1rem' }}>No service accounts yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1rem' }}>
              {accounts.map(sa => (
                <div key={sa.slug} style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: T.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {{'google':'🔵','aws':'🟠','azure':'🔷','stripe':'💜','sendgrid':'🟢','github':'⚫','slack':'🟣','twilio':'🔴','other':'🔘'}[sa.type] || '🔘'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{sa.name}</div>
                    <div style={{ fontSize: '0.62rem', color: T.muted }}>{sa.type}{sa.description ? ' · ' + sa.description : ''}</div>
                    {sa.hasCredentials && <div style={{ fontSize: '0.58rem', color: T.mint, marginTop: 1 }}>✓ credentials stored</div>}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: T.muted, fontFamily: T.mono, flexShrink: 0 }}>{sa.created_at ? new Date(sa.created_at).toLocaleDateString() : ''}</div>
                  <button onClick={() => deleteAccount(sa.slug)} style={{ background: 'none', border: `1px solid ${T.red}40`, borderRadius: T.radius, padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem', color: T.red }}>✕</button>
                </div>
              ))}
            </div>
            {newAccount ? (
              <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', marginBottom: '0.65rem' }}>New Service Account</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <input value={newAccount.name} onChange={e => setNewAccount(p => ({...p, name: e.target.value}))} placeholder="Account name (e.g. prod-gcp-sa)" style={sInput} autoFocus />
                  <select value={newAccount.type} onChange={e => setNewAccount(p => ({...p, type: e.target.value}))} style={{ ...sInput }}>
                    {SA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={newAccount.description || ''} onChange={e => setNewAccount(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" style={sInput} />
                  <textarea value={typeof newAccount.credentials === 'string' ? newAccount.credentials : JSON.stringify(newAccount.credentials || {}, null, 2)}
                    onChange={e => setNewAccount(p => ({...p, credentials: e.target.value}))}
                    placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'}
                    rows={8} style={{ ...sInput, resize: 'vertical', lineHeight: 1.5 }} />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Btn small onClick={createAccount} disabled={!newAccount.name || !newAccount.type || savingAccount}>{savingAccount ? 'Saving…' : 'Save Account'}</Btn>
                    <Btn small ghost onClick={() => setNewAccount(null)}>Cancel</Btn>
                  </div>
                </div>
              </div>
            ) : (
              <Btn ghost small onClick={() => setNewAccount({ name: '', type: 'google', description: '', credentials: '' })}>+ Add Service Account</Btn>
            )}
          </div>
        )}

        {/* ── Skill Library ── */}
        {section === 'skills' && (
          <div>
            <div style={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.mono, marginBottom: '1rem', lineHeight: 1.6 }}>
              Stored in <code>/mnt/shared/skills/</code> · available as steps in all workers · read secrets from <code>/mnt/shared/keys.json</code>
            </div>
            {skills.length === 0 && !newSkill && (
              <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, marginBottom: '1rem' }}>No skills yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1rem' }}>
              {skills.map(sk => {
                const slug = sk.slug || sk.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
                const expanded = expandedSkill === slug;
                return (
                  <div key={slug} style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
                    <div style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 2 }}>{sk.name}</div>
                        {sk.desc && <div style={{ fontSize: '0.64rem', color: T.muted }}>{sk.desc}</div>}
                        <div style={{ fontSize: '0.58rem', color: T.muted, marginTop: 2 }}>by {sk.creator || 'unknown'} · {sk.created_at ? new Date(sk.created_at).toLocaleDateString() : ''}</div>
                      </div>
                      <button onClick={() => setExpandedSkill(expanded ? null : slug)} style={{ background: 'none', border: T.border, borderRadius: T.radius, padding: '2px 7px', cursor: 'pointer', fontSize: '0.62rem', color: T.muted }}>{expanded ? '▲' : '▼ code'}</button>
                      <button onClick={() => deleteSkill(slug)} style={{ background: 'none', border: `1px solid ${T.red}40`, borderRadius: T.radius, padding: '2px 7px', cursor: 'pointer', fontSize: '0.62rem', color: T.red }}>✕</button>
                    </div>
                    {expanded && sk.code && (
                      <pre style={{ margin: 0, padding: '0.65rem 0.85rem', background: T.bg, fontSize: '0.63rem', fontFamily: T.mono, color: T.text, overflowX: 'auto', borderTop: T.border, maxHeight: 240, overflowY: 'auto' }}>{sk.code}</pre>
                    )}
                  </div>
                );
              })}
            </div>
            {newSkill ? (
              <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.6rem', fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', marginBottom: '0.65rem' }}>New Skill</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <input value={newSkill.name} onChange={e => setNewSkill(p => ({...p, name: e.target.value}))} placeholder="Skill name" style={sInput} autoFocus />
                  <input value={newSkill.desc} onChange={e => setNewSkill(p => ({...p, desc: e.target.value}))} placeholder="Description" style={sInput} />
                  <textarea value={newSkill.code} onChange={e => setNewSkill(p => ({...p, code: e.target.value}))}
                    placeholder={"// JavaScript\nconst keys = JSON.parse(require('fs').readFileSync('/mnt/shared/keys.json','utf8'));\nconst accounts = {}; // load from /mnt/shared/service_accounts/\n"}
                    rows={8} style={{ ...sInput, resize: 'vertical', lineHeight: 1.5 }} />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Btn small onClick={createSkill} disabled={!newSkill.name || savingSkill}>{savingSkill ? 'Saving…' : 'Create'}</Btn>
                    <Btn small ghost onClick={() => setNewSkill(null)}>Cancel</Btn>
                  </div>
                </div>
              </div>
            ) : (
              <Btn ghost small onClick={() => setNewSkill({ name: '', desc: '', code: '', creator: 'user' })}>+ New Skill</Btn>
            )}
          </div>
        )}

        {/* ── NFS Storage ── */}
        {section === 'nfs' && (
          <div>
            <div style={{ background: T.card, border: T.border, borderRadius: T.radius, padding: '0.65rem 0.85rem', marginBottom: '1rem', fontFamily: T.mono, fontSize: '0.68rem', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Mount this share locally:</div>
              <code style={{ display: 'block', color: T.blue, userSelect: 'all' }}>sudo mount -t nfs 159.65.205.244:/mnt/shared /mnt/hw-shared</code>
              <div style={{ color: T.muted, marginTop: '0.3rem', fontSize: '0.62rem' }}>or via sshfs: <code style={{ color: T.muted, userSelect: 'all' }}>sshfs -o IdentityFile=~/.ssh/openclaw-key.pem root@159.65.205.244:/mnt/shared /mnt/hw-shared</code></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => setNfsPath('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.68rem', color: T.blue, padding: 0 }}>shared/</button>
              {nfsPath.split('/').filter(Boolean).map((seg, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ color: T.muted, fontSize: '0.7rem' }}>›</span>
                  <button onClick={() => setNfsPath(arr.slice(0, i+1).join('/'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.68rem', color: T.blue, padding: 0 }}>{seg}</button>
                </span>
              ))}
            </div>
            {!nfsTree ? (
              <div style={{ color: T.muted, fontSize: '0.72rem', fontFamily: T.mono }}>Loading…</div>
            ) : nfsTree.error ? (
              <div style={{ color: T.red, fontSize: '0.72rem', fontFamily: T.mono }}>{nfsTree.error}</div>
            ) : (
              <div style={{ background: T.card, border: T.border, borderRadius: T.radius, overflow: 'hidden' }}>
                {!(nfsTree.entries || []).length && <div style={{ padding: '1rem', color: T.muted, fontSize: '0.72rem', fontFamily: T.mono, textAlign: 'center' }}>Empty</div>}
                {(nfsTree.entries || []).map((entry, i, arr) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.42rem 0.85rem', borderBottom: i < arr.length - 1 ? T.border : 'none', cursor: entry.type === 'dir' ? 'pointer' : 'default' }}
                    onClick={() => entry.type === 'dir' && setNfsPath(nfsPath ? nfsPath + '/' + entry.name : entry.name)}>
                    <span style={{ fontSize: '0.85rem' }}>{entry.type === 'dir' ? '📁' : entry.type === 'binary' ? '📦' : '📄'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.mono, fontSize: '0.72rem', color: entry.type === 'dir' ? T.blue : T.text, fontWeight: entry.type === 'dir' ? 600 : 400 }}>{entry.name}</div>
                    </div>
                    <span style={{ color: T.muted, fontSize: '0.58rem', fontFamily: T.mono, flexShrink: 0 }}>{entry.size ? (entry.size > 1024 ? (entry.size/1024).toFixed(1)+'k' : entry.size+'b') : ''}</span>
                    {entry.type !== 'dir' && entry.type !== 'binary' && (
                      <a href={`/api/nfs/file?path=${encodeURIComponent(nfsPath ? nfsPath + '/' + entry.name : entry.name)}`} download style={{ color: T.muted, fontSize: '0.6rem', fontFamily: T.mono, textDecoration: 'none', border: T.border, borderRadius: T.radius, padding: '1px 5px' }}>↓</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <Suspense><AppInner /></Suspense>;
}
