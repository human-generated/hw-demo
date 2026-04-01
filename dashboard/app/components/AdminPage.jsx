'use client';
import { useState, useEffect } from 'react';

function Avatar({ user, size = 34 }) {
  if (user.image) {
    return <img src={user.image} alt="" width={size} height={size} referrerPolicy="no-referrer"
      style={{ borderRadius: '50%', display: 'block', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#1a1a1a', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
    }}>
      {(user.name || user.email || 'U')[0].toUpperCase()}
    </div>
  );
}

function EditableCell({ value, onSave, type = 'text', prefix = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ''));
  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ fontSize: '0.82rem', color: '#1a1a1a' }}>{prefix}</span>}
        <input
          autoFocus type={type} value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(val); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            width: type === 'number' ? 70 : 120, padding: '3px 7px', borderRadius: 6,
            border: '1.5px solid #34c759', outline: 'none',
            fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button onClick={() => { onSave(val); setEditing(false); }}
          style={{ background: '#34c759', border: 'none', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: '#fff', fontSize: '0.75rem' }}>✓</button>
        <button onClick={() => setEditing(false)}
          style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', fontSize: '0.75rem' }}>✕</button>
      </span>
    );
  }
  return (
    <span onClick={() => { setVal(String(value ?? '')); setEditing(true); }}
      title="Click to edit"
      style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(0,0,0,0.2)' }}>
      {prefix}{type === 'number' ? parseFloat(value || 0).toFixed(2) : (value || '—')}
    </span>
  );
}

function UserRow({ user, isSelf, saving, onUpdate }) {
  return (
    <tr style={{
      borderBottom: '1px solid rgba(0,0,0,0.04)',
      opacity: saving ? 0.55 : 1, transition: 'opacity 0.2s',
    }}>
      <td style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={user} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2 }}>
              <EditableCell value={user.name} onSave={v => onUpdate(user.email, { name: v })} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: user.authType === 'credentials' ? 'rgba(0,0,0,0.06)' : 'rgba(66,133,244,0.1)',
          color: user.authType === 'credentials' ? 'rgba(0,0,0,0.5)' : '#4285F4',
        }}>
          {user.authType === 'credentials' ? 'Password' : 'Google'}
        </span>
      </td>
      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: (user.credits || 0) > 0 ? '#16a34a' : '#dc2626' }}>
        <EditableCell value={user.credits} type="number" prefix="$" onSave={v => onUpdate(user.email, { credits: parseFloat(v) || 0 })} />
      </td>
      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)' }}>
        ${(user.spend || 0).toFixed(2)}
      </td>
      <td style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)' }}>
        {user.lastSeen ? new Date(user.lastSeen).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        {user.isAdmin ? (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(234,179,8,0.15)', color: '#92400e' }}>Admin</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.28)' }}>User</span>
        )}
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!isSelf && (
            <button
              onClick={() => onUpdate(user.email, { isAdmin: !user.isAdmin })}
              style={{
                padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid rgba(0,0,0,0.1)',
                background: user.isAdmin ? 'rgba(220,38,38,0.07)' : 'rgba(52,199,89,0.08)',
                color: user.isAdmin ? '#dc2626' : '#16a34a',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {user.isAdmin ? 'Revoke' : '+ Admin'}
            </button>
          )}
          {user.authType === 'credentials' && (
            <button
              onClick={() => {
                const pw = window.prompt(`New password for ${user.email}:`);
                if (pw && pw.trim()) onUpdate(user.email, { password: pw.trim() });
              }}
              style={{
                padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid rgba(0,0,0,0.1)', background: '#fafafa', color: 'rgba(0,0,0,0.5)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Password
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const BLANK_FORM = { email: '', name: '', password: '', credits: '5' };

export function AdminPage({ onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users');
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setUsers(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function updateUser(email, patch) {
    setSaving(email);
    try {
      const r = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      await loadUsers();
    } catch (e) { setError(e.message); }
    setSaving('');
  }

  async function createUser() {
    setFormError('');
    if (!form.email.trim() || !form.password.trim()) { setFormError('Email and password are required'); return; }
    setSaving('create');
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          name: form.name.trim(),
          password: form.password,
          credits: parseFloat(form.credits) || 5,
          authType: 'credentials',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setShowCreate(false);
      setForm(BLANK_FORM);
      await loadUsers();
    } catch (e) { setFormError(e.message); }
    setSaving('');
  }

  const totalCredits = users.reduce((s, u) => s + (u.credits || 0), 0);
  const totalSpent = users.reduce((s, u) => s + (u.spend || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#EDF1F3',
      fontFamily: "'DM Sans', sans-serif", overflowY: 'auto', zIndex: 200,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Admin Panel</span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '2px 9px', borderRadius: 10,
            background: 'rgba(234,179,8,0.12)', color: '#92400e',
          }}>
            {users.length} users · ${totalCredits.toFixed(2)} balance · ${totalSpent.toFixed(2)} spent
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '0.5rem 1.1rem', borderRadius: 8,
            background: '#1a1a1a', color: '#fff', border: 'none',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            + New User
          </button>
          <button onClick={onClose} style={{
            padding: '0.5rem 1rem', borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
            fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '2rem', maxWidth: 1120, margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)',
            borderRadius: 10, padding: '0.7rem 1rem', marginBottom: 18,
            fontSize: '0.82rem', color: '#dc2626', display: 'flex', justifyContent: 'space-between',
          }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>×</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'rgba(0,0,0,0.3)', fontSize: '0.9rem' }}>Loading…</div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: 18,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.015)' }}>
                  {['User', 'Auth', 'Credits', 'Spent', 'Last seen', 'Role', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '0.8rem 1rem', textAlign: 'left',
                      fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <UserRow
                    key={u.email}
                    user={u}
                    isSelf={u.email === currentUser?.email}
                    saving={saving === u.email}
                    onUpdate={updateUser}
                  />
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'rgba(0,0,0,0.3)', fontSize: '0.85rem' }}>No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 22, padding: '28px 26px 24px',
            width: '100%', maxWidth: 400,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a', marginBottom: 20 }}>Create Credentials User</div>
            {formError && (
              <div style={{ fontSize: '0.78rem', color: '#dc2626', background: 'rgba(220,38,38,0.07)', padding: '7px 11px', borderRadius: 7, marginBottom: 14 }}>{formError}</div>
            )}
            {[
              { label: 'Email *', field: 'email', type: 'email', placeholder: 'user@example.com' },
              { label: 'Display Name', field: 'name', type: 'text', placeholder: 'John Doe' },
              { label: 'Password *', field: 'password', type: 'text', placeholder: 'password' },
              { label: 'Initial Credits ($)', field: 'credits', type: 'number', placeholder: '5' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 13 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(0,0,0,0.38)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                <input
                  type={type} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 9,
                    border: '1.5px solid rgba(0,0,0,0.1)', background: '#fafafa',
                    fontSize: '0.85rem', color: '#1a1a1a', outline: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onFocus={e => (e.target.style.borderColor = '#34c759')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => { setShowCreate(false); setFormError(''); setForm(BLANK_FORM); }} style={{
                flex: 1, padding: '0.7rem', borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'rgba(0,0,0,0.5)',
                fontFamily: "'DM Sans', sans-serif",
              }}>Cancel</button>
              <button onClick={createUser} disabled={saving === 'create'} style={{
                flex: 2, padding: '0.7rem', borderRadius: 10,
                background: saving === 'create' ? 'rgba(0,0,0,0.07)' : '#1a1a1a',
                color: saving === 'create' ? 'rgba(0,0,0,0.3)' : '#fff',
                border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {saving === 'create' ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
