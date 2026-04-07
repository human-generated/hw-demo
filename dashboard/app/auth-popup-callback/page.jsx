'use client';
import { useEffect } from 'react';

export default function AuthPopupCallback() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      // Signal the parent that auth completed, then close
      try { window.opener.postMessage({ type: 'auth-complete' }, window.location.origin); } catch {}
    }
    window.close();
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'sans-serif', color: '#666', fontSize: 14,
    }}>
      Sign-in complete — closing window…
    </div>
  );
}
