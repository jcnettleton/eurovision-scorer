import { useState, useEffect } from 'react';
import { COUNTRIES } from '../data/countries';

export default function ControlDesk({ judges, entries, onSubmit }) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [scores, setScores] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill scores when a country with existing scores is selected
  useEffect(() => {
    if (!selectedCountry) {
      setScores({});
      setSubmitted(false);
      return;
    }
    const entry = entries.find((e) => e.country === selectedCountry);
    const prefilled = {};
    judges.forEach((judge) => {
      prefilled[judge] = entry?.scores?.[judge] ?? '';
    });
    setScores(prefilled);
    setSubmitted(false);
  }, [selectedCountry, judges]); // eslint-disable-line react-hooks/exhaustive-deps

  // When judges list changes, sync score keys
  useEffect(() => {
    setScores((prev) => {
      const next = {};
      judges.forEach((j) => { next[j] = prev[j] ?? ''; });
      return next;
    });
  }, [judges]);

  const handleScoreChange = (judge, value) => {
    // Clamp to 0-10
    let v = value;
    if (v !== '' && !isNaN(Number(v))) {
      v = Math.max(0, Math.min(10, Number(v)));
    }
    setScores((prev) => ({ ...prev, [judge]: v }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCountry) return;
    onSubmit(selectedCountry, scores);
    setSubmitted(true);
    // Reset after brief flash
    setTimeout(() => {
      setSelectedCountry('');
      setScores({});
      setSubmitted(false);
    }, 1200);
  };

  const hasAnyScore = Object.values(scores).some((v) => v !== '' && v !== null);
  const entryForSelected = entries.find((e) => e.country === selectedCountry);
  const alreadyScored = entryForSelected?.average !== null;

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <h2
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color: 'var(--neon-cyan)' }}
      >
        Control Desk
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Country selector */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Country
          </label>
          <select
            className="ev-input"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="">— Select a country —</option>
            {COUNTRIES.map(({ country, song, artist, order }) => (
              <option key={country} value={country}>
                #{order} {country} — {song} ({artist})
              </option>
            ))}
          </select>
          {alreadyScored && (
            <p className="text-xs mt-1" style={{ color: 'var(--neon-yellow)' }}>
              ✎ Already scored — editing will update the average.
            </p>
          )}
        </div>

        {/* Judge score inputs */}
        {selectedCountry && (
          <div className="flex flex-col gap-2">
            <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
              Scores (0–10 per judge)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {judges.map((judge) => (
                <div key={judge}>
                  <label
                    className="block text-xs mb-0.5 truncate"
                    style={{ color: 'var(--text-primary)' }}
                    title={judge}
                  >
                    {judge}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="0–10"
                    className="ev-input text-center"
                    value={scores[judge] ?? ''}
                    onChange={(e) => handleScoreChange(judge, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          data-testid="submit-btn"
          className={`btn w-full mt-1 ${submitted ? 'btn-secondary' : 'btn-primary'}`}
          disabled={!selectedCountry || !hasAnyScore}
          style={{ opacity: !selectedCountry || !hasAnyScore ? 0.45 : 1 }}
        >
          {submitted ? '✓ Saved!' : alreadyScored ? 'Update Score' : 'Submit Score'}
        </button>
      </form>
    </div>
  );
}
