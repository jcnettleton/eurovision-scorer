import { useState } from 'react';

export default function JudgeManager({ judges, onAdd, onRename, onRemove }) {
  const [newJudge, setNewJudge] = useState('');
  const [editingJudge, setEditingJudge] = useState(null); // name being renamed
  const [editValue, setEditValue] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    onAdd(newJudge);
    setNewJudge('');
  };

  const startRename = (name) => {
    setEditingJudge(name);
    setEditValue(name);
  };

  const commitRename = (oldName) => {
    onRename(oldName, editValue);
    setEditingJudge(null);
    setEditValue('');
  };

  const cancelRename = () => {
    setEditingJudge(null);
    setEditValue('');
  };

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: 'var(--neon-purple)' }}
        >
          Judges
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {judges.length} / 10
        </span>
      </div>

      {/* Judge list */}
      <ul data-testid="judge-list" className="flex flex-col gap-1.5">
        {judges.map((judge) => (
          <li
            key={judge}
            data-testid="judge-item"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {editingJudge === judge ? (
              <>
                <input
                  autoFocus
                  className="ev-input flex-1 text-sm py-0.5"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(judge);
                    if (e.key === 'Escape') cancelRename();
                  }}
                />
                <button className="btn-ghost btn" onClick={() => commitRename(judge)}>✓</button>
                <button className="btn-ghost btn" onClick={cancelRename}>✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm truncate" title={judge}>{judge}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => startRename(judge)}
                  title="Rename judge"
                >
                  ✎
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => onRemove(judge)}
                  title="Remove judge"
                  style={{ color: '#ff3355' }}
                  disabled={judges.length <= 1}
                >
                  ✕
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Add judge */}
      {judges.length < 10 && (
        <form onSubmit={handleAdd} className="flex gap-2 mt-1">
          <input
            className="ev-input flex-1 text-sm"
            placeholder="New judge name…"
            value={newJudge}
            onChange={(e) => setNewJudge(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={!newJudge.trim() || judges.includes(newJudge.trim())}
            style={{
              opacity: !newJudge.trim() || judges.includes(newJudge.trim()) ? 0.4 : 1,
            }}
          >
            Add
          </button>
        </form>
      )}
      {judges.length >= 10 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Maximum of 10 judges reached.
        </p>
      )}
    </div>
  );
}
