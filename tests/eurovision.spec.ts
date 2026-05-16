import { test, expect, Page } from '@playwright/test';

// ── helpers ─────────────────────────────────────────────────────────────────

async function clearStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Wait for the app to fully render
  await page.waitForSelector('[data-testid="submit-btn"]');
}

/** Select a country by its exact value (country name) */
async function selectCountry(page: Page, country: string) {
  await page.selectOption('select', { value: country });
}

/** Fill a score for a named judge inside the Control Desk */
async function fillScore(page: Page, judge: string, score: number) {
  const label = page.locator('label', { hasText: new RegExp(`^${judge}$`) });
  const input = label.locator('..').locator('input[type="number"]');
  await input.fill(String(score));
}

async function submitScore(page: Page) {
  await page.locator('[data-testid="submit-btn"]').click();
}

// ── Judge list helpers (scoped to judges panel) ──────────────────────────────

function judgeItems(page: Page) {
  return page.locator('[data-testid="judge-item"]');
}

// ── test suite ───────────────────────────────────────────────────────────────

test.describe('Eurovision 2026 Scorer', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
  });

  // ── Page load & structure ─────────────────────────────────────────────────

  test('renders header with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('EUROVISION 2026');
  });

  test('renders Judges panel with 4 default judges', async ({ page }) => {
    await expect(judgeItems(page)).toHaveCount(4);
    await expect(judgeItems(page).nth(0)).toContainText('Alice');
    await expect(judgeItems(page).nth(1)).toContainText('Bob');
    await expect(judgeItems(page).nth(2)).toContainText('Charlie');
    await expect(judgeItems(page).nth(3)).toContainText('Dave');
  });

  test('renders Control Desk with country dropdown', async ({ page }) => {
    const select = page.locator('select');
    await expect(select).toBeVisible();
    await expect(select).toContainText('— Select a country —');
  });

  test('country dropdown contains all 25 countries', async ({ page }) => {
    const options = await page.locator('select option').allTextContents();
    const countryOptions = options.filter(o => !o.includes('Select a country'));
    expect(countryOptions).toHaveLength(25);
  });

  test('dropdown shows song and artist for each country', async ({ page }) => {
    const options = await page.locator('select option').allTextContents();
    const swedenOpt = options.find(o => o.includes('Sweden'));
    expect(swedenOpt).toContain('My System');
    expect(swedenOpt).toContain('Felicia');
    const ukOpt = options.find(o => o.includes('United Kingdom'));
    expect(ukOpt).toContain('Eins, Zwei, Drei');
  });

  test('shows empty leaderboard message before any scores', async ({ page }) => {
    await expect(page.getByText(/No scores yet/)).toBeVisible();
  });

  test('submit button is disabled when no country selected', async ({ page }) => {
    const submitBtn = page.locator('[data-testid="submit-btn"]');
    await expect(submitBtn).toBeDisabled();
  });

  // ── Score submission ──────────────────────────────────────────────────────

  test('score inputs appear after selecting a country', async ({ page }) => {
    await selectCountry(page, 'Sweden');
    // 4 number inputs — one per default judge
    const inputs = page.locator('input[type="number"]');
    await expect(inputs).toHaveCount(4);
  });

  test('submitting scores adds country to leaderboard', async ({ page }) => {
    await selectCountry(page, 'Sweden');
    await fillScore(page, 'Alice', 9);
    await fillScore(page, 'Bob', 8);
    await submitScore(page);

    const rows = page.locator('.leaderboard-row');
    await expect(rows.first()).toContainText('Sweden');
  });

  test('average is calculated and displayed correctly', async ({ page }) => {
    await selectCountry(page, 'Norway');
    await fillScore(page, 'Alice', 8);
    await fillScore(page, 'Bob', 6);
    await fillScore(page, 'Charlie', 10);
    await fillScore(page, 'Dave', 8);
    await submitScore(page);

    // Average of 8,6,10,8 = 8.00
    const row = page.locator('.leaderboard-row').filter({ hasText: 'Norway' });
    await expect(row).toContainText('8.00');
  });

  test('score clamped to 0–10 range (above max)', async ({ page }) => {
    await selectCountry(page, 'Italy');
    const input = page.locator('input[type="number"]').first();
    await input.fill('15');
    await input.blur();
    const val = await input.inputValue();
    expect(Number(val)).toBeLessThanOrEqual(10);
  });

  test('score clamped to 0–10 range (below min)', async ({ page }) => {
    await selectCountry(page, 'Italy');
    const input = page.locator('input[type="number"]').first();
    await input.fill('-3');
    await input.blur();
    const val = await input.inputValue();
    expect(Number(val)).toBeGreaterThanOrEqual(0);
  });

  test('submitting for the same country updates instead of duplicating', async ({ page }) => {
    // First submission
    await selectCountry(page, 'Austria');
    await fillScore(page, 'Alice', 5);
    await submitScore(page);
    await page.waitForTimeout(1500); // wait for form reset

    // Second submission (update)
    await selectCountry(page, 'Austria');
    await fillScore(page, 'Alice', 9);
    await submitScore(page);
    await page.waitForTimeout(500);

    // Must have exactly 1 Austria row in the leaderboard
    const austriaRows = page.locator('.leaderboard-row').filter({ hasText: 'Austria' });
    await expect(austriaRows).toHaveCount(1);
    await expect(austriaRows).toContainText('9.00');
  });

  // ── Leaderboard sorting ───────────────────────────────────────────────────

  test('leaderboard sorts countries by average descending', async ({ page }) => {
    await selectCountry(page, 'Sweden');
    await fillScore(page, 'Alice', 4);
    await submitScore(page);
    await page.waitForTimeout(1500);

    await selectCountry(page, 'Norway');
    await fillScore(page, 'Alice', 9);
    await submitScore(page);
    await page.waitForTimeout(500);

    const rows = page.locator('[data-testid="leaderboard-list"] li');
    const firstText = await rows.first().textContent();
    expect(firstText).toContain('Norway');

    const secondText = await rows.nth(1).textContent();
    expect(secondText).toContain('Sweden');
  });

  test('unscored countries appear below a divider', async ({ page }) => {
    await selectCountry(page, 'France');
    await fillScore(page, 'Alice', 7);
    await submitScore(page);
    await page.waitForTimeout(500);

    await expect(page.getByText('Not yet scored')).toBeVisible();
    await expect(page.locator('[data-testid="unscored-list"]')).toBeVisible();
  });

  test('first place row has gold styling (rank-1 class)', async ({ page }) => {
    await selectCountry(page, 'Finland');
    await fillScore(page, 'Alice', 10);
    await submitScore(page);
    await page.waitForTimeout(500);

    const firstRow = page.locator('[data-testid="leaderboard-list"] li').first();
    await expect(firstRow.locator('.leaderboard-row')).toHaveClass(/rank-1/);
  });

  test('leaderboard counter shows correct scored / total', async ({ page }) => {
    await expect(page.getByText(/0 \/ 25 scored/)).toBeVisible();

    await selectCountry(page, 'Greece');
    await fillScore(page, 'Alice', 7);
    await submitScore(page);
    await page.waitForTimeout(500);

    await expect(page.getByText(/1 \/ 25 scored/)).toBeVisible();
  });

  // ── Judge management ──────────────────────────────────────────────────────

  test('can add a new judge', async ({ page }) => {
    await page.getByPlaceholder('New judge name…').fill('Eve');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(judgeItems(page)).toHaveCount(5);
    await expect(judgeItems(page).last()).toContainText('Eve');
  });

  test('cannot add a duplicate judge name', async ({ page }) => {
    await page.getByPlaceholder('New judge name…').fill('Alice');
    const addBtn = page.getByRole('button', { name: 'Add' });
    await expect(addBtn).toBeDisabled();
  });

  test('can rename a judge', async ({ page }) => {
    const firstJudge = judgeItems(page).first();
    await firstJudge.getByTitle('Rename judge').click();

    const renameInput = firstJudge.locator('input');
    await renameInput.fill('Alicia');
    await firstJudge.getByRole('button', { name: '✓' }).click();

    await expect(judgeItems(page).first()).toContainText('Alicia');
  });

  test('rename propagates to score inputs in Control Desk', async ({ page }) => {
    const firstJudge = judgeItems(page).first();
    await firstJudge.getByTitle('Rename judge').click();
    const renameInput = firstJudge.locator('input');
    await renameInput.fill('Alicia');
    await firstJudge.getByRole('button', { name: '✓' }).click();

    await selectCountry(page, 'Malta');
    await expect(page.locator('label', { hasText: 'Alicia' })).toBeVisible();
  });

  test('can remove a judge', async ({ page }) => {
    const firstJudge = judgeItems(page).first();
    await firstJudge.getByTitle('Remove judge').click();

    await expect(judgeItems(page)).toHaveCount(3);
    await expect(judgeItems(page).first()).not.toContainText('Alice');
  });

  test('removing a judge recalculates existing averages', async ({ page }) => {
    // Score Denmark: Alice=10, Bob=0 → avg 5.00
    await selectCountry(page, 'Denmark');
    await fillScore(page, 'Alice', 10);
    await fillScore(page, 'Bob', 0);
    await submitScore(page);
    await page.waitForTimeout(1500);

    // Remove Bob — avg should become 10.00
    const bobJudge = judgeItems(page).filter({ hasText: 'Bob' });
    await bobJudge.getByTitle('Remove judge').click();
    await page.waitForTimeout(300);

    const denmarkRow = page.locator('.leaderboard-row').filter({ hasText: 'Denmark' });
    await expect(denmarkRow).toContainText('10.00');
  });

  test('cannot remove last remaining judge', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await judgeItems(page).first().getByTitle('Remove judge').click();
      await page.waitForTimeout(100);
    }
    const lastRemove = judgeItems(page).first().getByTitle('Remove judge');
    await expect(lastRemove).toBeDisabled();
  });

  test('judge cap: add button disappears at 10 judges', async ({ page }) => {
    const names = ['Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
    for (const name of names) {
      await page.getByPlaceholder('New judge name…').fill(name);
      await page.getByRole('button', { name: 'Add' }).click();
    }
    await expect(page.getByText('Maximum of 10 judges reached.')).toBeVisible();
    await expect(page.getByPlaceholder('New judge name…')).not.toBeVisible();
  });

  // ── LocalStorage persistence ──────────────────────────────────────────────

  test('scores persist after page reload', async ({ page }) => {
    await selectCountry(page, 'Ukraine');
    await fillScore(page, 'Alice', 8);
    await fillScore(page, 'Bob', 9);
    await submitScore(page);
    await page.waitForTimeout(1500);

    await page.reload();
    await page.waitForSelector('.leaderboard-row');

    const ukraineRow = page.locator('.leaderboard-row').filter({ hasText: 'Ukraine' });
    await expect(ukraineRow).toContainText('8.50');
  });

  test('judges persist after page reload', async ({ page }) => {
    await page.getByPlaceholder('New judge name…').fill('Zelda');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(judgeItems(page)).toHaveCount(5);

    await page.reload();
    await page.waitForSelector('[data-testid="judge-item"]');

    await expect(judgeItems(page)).toHaveCount(5);
    await expect(judgeItems(page).last()).toContainText('Zelda');
  });

  // ── Hard Reset ───────────────────────────────────────────────────────────

  test('hard reset clears all scores (confirm dialog accepted)', async ({ page }) => {
    await selectCountry(page, 'Croatia');
    await fillScore(page, 'Alice', 9);
    await submitScore(page);
    await page.waitForTimeout(1500);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Hard Reset' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/No scores yet/)).toBeVisible();
  });

  test('hard reset is cancelled when dialog dismissed', async ({ page }) => {
    await selectCountry(page, 'Croatia');
    await fillScore(page, 'Alice', 9);
    await submitScore(page);
    await page.waitForTimeout(1500);

    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Hard Reset' }).click();
    await page.waitForTimeout(300);

    const croatiaRow = page.locator('.leaderboard-row').filter({ hasText: 'Croatia' });
    await expect(croatiaRow).toBeVisible();
  });

  // ── Already-scored indicator ─────────────────────────────────────────────

  test('shows "editing" notice when re-selecting a scored country', async ({ page }) => {
    await selectCountry(page, 'Serbia');
    await fillScore(page, 'Alice', 7);
    await submitScore(page);
    await page.waitForTimeout(1500);

    await selectCountry(page, 'Serbia');
    await expect(page.getByText(/Already scored/)).toBeVisible();
    await expect(page.locator('[data-testid="submit-btn"]')).toContainText('Update Score');
  });

  test('pre-fills existing scores when re-selecting a scored country', async ({ page }) => {
    await selectCountry(page, 'Bulgaria');
    await fillScore(page, 'Alice', 6);
    await submitScore(page);
    await page.waitForTimeout(1500);

    await selectCountry(page, 'Bulgaria');
    const aliceInput = page.locator('input[type="number"]').first();
    await expect(aliceInput).toHaveValue('6');
  });

});
