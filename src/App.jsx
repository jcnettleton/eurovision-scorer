import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { sortEntries } from './utils/scoring';
import ControlDesk from './components/ControlDesk';
import JudgeManager from './components/JudgeManager';
import Leaderboard from './components/Leaderboard';

function fireConfetti() {
  const end = Date.now() + 2200;
  const colors = ['#ff0080', '#9d4edd', '#00d4ff', '#ffd700', '#ffffff'];
  (function burst() {
    confetti({ particleCount: 7, angle: 60,  spread: 65, origin: { x: 0 }, colors });
    confetti({ particleCount: 7, angle: 120, spread: 65, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(burst);
  })();
}

// ── thin API helpers ──────────────────────────────────────────────────────────

async function api(path, body) {
  await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export default function App() {
  const [appState, setAppState] = useState(null); // null = loading
  const prevFirstRef = useRef(null);

  // ── Connect to SSE stream; server pushes full state on every change ──────
  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onmessage = (e) => {
      const next = JSON.parse(e.data);
      setAppState(next);

      // Confetti when the #1 spot changes
      const sorted = sortEntries(next.entries);
      const newFirst = sorted.find(en => en.average !== null)?.country ?? null;
      if (newFirst && newFirst !== prevFirstRef.current) {
        prevFirstRef.current = newFirst;
        setTimeout(fireConfetti, 50);
      }
    };

    es.onerror = () => {
      // Browser will auto-reconnect; nothing to do here
    };

    return () => es.close();
  }, []);

  // ── Mutations — fire and forget; SSE echo updates state everywhere ────────

  const handleSubmit    = useCallback((country, scores) =>
    api('/api/score', { country, scores }), []);

  const handleAddJudge  = useCallback((name) =>
    api('/api/judges/add', { name }), []);

  const handleRenameJudge = useCallback((oldName, newName) =>
    api('/api/judges/rename', { oldName, newName }), []);

  const handleRemoveJudge = useCallback((name) =>
    api('/api/judges/remove', { name }), []);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset ALL scores and start fresh? This cannot be undone.'))
      api('/api/reset', {});
  }, []);

  // ── Loading state while waiting for first SSE message ────────────────────
  if (!appState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--text-muted)' }}>Connecting to scorer…</p>
      </div>
    );
  }

  const sortedEntries = sortEntries(appState.entries);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="text-center py-6 px-4 border-b border-[var(--border-dim)]">
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--neon-pink)' }}>
          ★ EUROVISION 2026
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Vienna Grand Final · Score Master Console
        </p>
      </header>

      {/* ── Main layout ── */}
      <main className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left panel — Control Desk */}
        <aside className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto">
          <JudgeManager
            judges={appState.judges}
            onAdd={handleAddJudge}
            onRename={handleRenameJudge}
            onRemove={handleRemoveJudge}
          />
          <ControlDesk
            judges={appState.judges}
            entries={appState.entries}
            onSubmit={handleSubmit}
          />
          <button className="btn btn-danger w-full mt-auto" onClick={handleReset}>
            Hard Reset
          </button>
        </aside>

        {/* Right panel — Leaderboard */}
        <section className="flex-1 overflow-y-auto">
          <Leaderboard entries={sortedEntries} judges={appState.judges} />
        </section>
      </main>
    </div>
  );
}
