/**
 * Calculate average from a scores object, ignoring judges with no submission.
 * Returns null if no scores have been submitted yet.
 */
export function calculateAverage(scores) {
  const values = Object.values(scores).filter((v) => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + Number(v), 0);
  return sum / values.length;
}

/**
 * Sort entries descending by average. Entries with no scores go to the bottom.
 * Ties are broken by country name (alphabetical) for stability.
 */
export function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.average === null && b.average === null) return a.country.localeCompare(b.country);
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    if (b.average !== a.average) return b.average - a.average;
    return a.country.localeCompare(b.country);
  });
}

/**
 * Format a number to 2 decimal places, or return '—' for null.
 */
export function formatScore(average) {
  if (average === null || average === undefined) return '—';
  return average.toFixed(2);
}
