import React from 'react';

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // check every 3 minutes

export default function NewVersionBanner() {
  const [showBanner, setShowBanner] = React.useState(false);
  const initialBuildIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/build-info', { cache: 'no-store' });
        const { buildId } = await res.json();
        if (cancelled) return;
        if (initialBuildIdRef.current === null) {
          // First check just establishes the baseline for this tab's session
          initialBuildIdRef.current = buildId;
          return;
        }
        if (buildId !== initialBuildIdRef.current) {
          setShowBanner(true);
        }
      } catch {
        // Silently ignore — a failed check just means we try again next interval
      }
    };

    checkVersion(); // establish baseline immediately on mount
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      background: '#1E293B', color: '#fff', borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, maxWidth: 360,
    }}>
      <span style={{ fontSize: 18 }}>🔄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>A new version is available</div>
        <div style={{ color: '#CBD5E1', fontSize: 12 }}>Please save any work in progress, then refresh.</div>
      </div>
      <button onClick={() => window.location.reload()}
        style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 7,
          padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Refresh
      </button>
    </div>
  );
}
