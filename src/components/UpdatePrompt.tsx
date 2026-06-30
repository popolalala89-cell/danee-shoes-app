import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ SW registered:', r);
    },
    onRegisterError(e) {
      console.error('❌ SW registration failed:', e);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#034BB9',
        color: '#fff',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'Poppins, sans-serif',
        fontSize: 14,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span>📦 Update tersedia — versi baru siap dipasang</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setNeedRefresh(false)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Nanti
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            background: '#fff',
            border: 'none',
            color: '#034BB9',
            padding: '6px 16px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Update Sekarang
        </button>
      </div>
    </div>
  );
}
