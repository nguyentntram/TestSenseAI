// Mock "similar examples" results, keyed by pull request id.
//
// This stands in for what the real pipeline will return once it exists:
// an embedding of the PR's diff/description is compared (cosine similarity)
// against embeddings of past bug fixes, PRs, and test patterns stored in
// CockroachDB. For now these are hand-written scores/snippets so the panel
// UI can be designed before that endpoint exists.
//
// Shape mirrors what `backend/scripts/prototype-similarity.mjs` prints for
// a real Bedrock embedding query, so wiring this up later should not
// require changing the component's props.

export const similarExamplesByPrId = {
  'PR-482': [
    {
      id: 'se-1',
      score: 0.91,
      type: 'bug-fix',
      title: 'Refund amounts could go negative when discounts were applied twice',
      source: 'PR-402',
      snippet:
        "if (amount <= 0) throw new Error('Refund amount must be positive')",
    },
    {
      id: 'se-2',
      score: 0.84,
      type: 'test-pattern',
      title: 'Payment provider calls are mocked with a shared fakeStripeClient helper',
      source: 'test/helpers/fakeStripeClient.ts',
      snippet: "const client = fakeStripeClient({ refunds: { create: jest.fn() } })",
    },
    {
      id: 'se-3',
      score: 0.77,
      type: 'convention',
      title: 'All monetary values are stored as integer cents, never floats',
      source: 'CONTRIBUTING.md',
      snippet: 'amountCents: number // never a float dollar amount',
    },
  ],
  'PR-479': [
    {
      id: 'se-4',
      score: 0.88,
      type: 'convention',
      title: 'All monetary values are stored as integer cents, never floats',
      source: 'CONTRIBUTING.md',
      snippet: 'const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)',
    },
    {
      id: 'se-5',
      score: 0.72,
      type: 'bug-fix',
      title: 'Refund amounts could go negative when discounts were applied twice',
      source: 'PR-402',
      snippet: 'expect(calculateTotal(lines)).toBe(1999) // integer cents, not 19.99',
    },
  ],
  'PR-210': [
    {
      id: 'se-6',
      score: 0.86,
      type: 'convention',
      title: 'All DB writes to stock_levels go through the StockLedger service',
      source: 'ARCHITECTURE.md',
      snippet: 'StockLedger.select_for_update().get(warehouse=from_wh, sku=sku)',
    },
    {
      id: 'se-7',
      score: 0.69,
      type: 'bug-fix',
      title: 'Concurrent transfers between warehouses could double-count stock',
      source: 'PR-190',
      snippet: 'with transaction.atomic(): source = StockLedger.select_for_update()...',
    },
  ],
  'PR-93': [
    {
      id: 'se-8',
      score: 0.8,
      type: 'test-pattern',
      title: 'Token expiry tests use an injectable clock, never real time.sleep',
      source: 'internal/testutil',
      snippet: 'clock := testutil.NewFakeClock(baseTime); rotator := KeyRotator{clock: clock}',
    },
  ],
}

export function getSimilarExamplesForPr(prId) {
  return similarExamplesByPrId[prId] ?? []
}
