// Mock project data. Replace with real API-backed data once the backend exists.

export const projects = [
  {
    id: 'payment-service',
    name: 'Payment Service',
    repositoryFullName: 'acme-corp/payment-service',
    description: 'Handles checkout, refunds, and payment provider integrations.',
    language: 'TypeScript',
    testFramework: 'Jest',
    defaultBranch: 'main',
    memoryCount: 128,
    openPullRequests: 4,
    syncStatus: 'synced',
    lastSyncedAt: '2026-07-18T13:05:00Z',
    metrics: {
      testsGenerated: 342,
      coverageEstimate: '78%',
      pullRequestsAnalyzed: 61,
    },
    pullRequests: [
      { id: 'PR-482', title: 'Add support for partial refunds', author: 'jchen', status: 'open', updatedAt: '2026-07-17T09:30:00Z' },
      { id: 'PR-479', title: 'Fix currency rounding in invoice totals', author: 'mrodriguez', status: 'open', updatedAt: '2026-07-16T18:12:00Z' },
      { id: 'PR-471', title: 'Retry logic for webhook delivery', author: 'skhan', status: 'merged', updatedAt: '2026-07-14T11:00:00Z' },
      { id: 'PR-465', title: 'Add Stripe idempotency keys', author: 'jchen', status: 'merged', updatedAt: '2026-07-10T15:45:00Z' },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Refund amounts could go negative when discounts were applied twice.', source: 'PR-402' },
      { id: 'mem-2', type: 'convention', summary: 'All monetary values are stored as integer cents, never floats.', source: 'CONTRIBUTING.md' },
      { id: 'mem-3', type: 'test-pattern', summary: 'Payment provider calls are mocked with a shared `fakeStripeClient` helper.', source: 'test/helpers' },
    ],
    generatedTests: [
      { id: 'gt-1', title: 'refundService.test.ts — partial refund does not exceed original charge', linkedPr: 'PR-482', status: 'ready' },
      { id: 'gt-2', title: 'invoiceTotals.test.ts — rounding stays consistent across currencies', linkedPr: 'PR-479', status: 'ready' },
      { id: 'gt-3', title: 'webhookRetry.test.ts — retries stop after max attempts', linkedPr: 'PR-471', status: 'draft' },
    ],
    recentActivity: [
      { id: 'act-1', message: 'Generated 3 tests for PR-482', timestamp: '2026-07-17T09:45:00Z' },
      { id: 'act-2', message: 'Indexed 12 new commits into repository memory', timestamp: '2026-07-16T20:00:00Z' },
      { id: 'act-3', message: 'Synced with acme-corp/payment-service', timestamp: '2026-07-18T13:05:00Z' },
    ],
  },
  {
    id: 'inventory-api',
    name: 'Inventory API',
    repositoryFullName: 'acme-corp/inventory-api',
    description: 'Tracks stock levels, warehouse transfers, and supplier orders.',
    language: 'Python',
    testFramework: 'Pytest',
    defaultBranch: 'develop',
    memoryCount: 76,
    openPullRequests: 2,
    syncStatus: 'syncing',
    lastSyncedAt: '2026-07-18T10:20:00Z',
    metrics: {
      testsGenerated: 198,
      coverageEstimate: '64%',
      pullRequestsAnalyzed: 33,
    },
    pullRequests: [
      { id: 'PR-210', title: 'Add low-stock alert thresholds', author: 'lwong', status: 'open', updatedAt: '2026-07-17T14:00:00Z' },
      { id: 'PR-207', title: 'Fix race condition in transfer reconciliation', author: 'apatel', status: 'open', updatedAt: '2026-07-15T08:20:00Z' },
      { id: 'PR-198', title: 'Bulk import for supplier catalogs', author: 'lwong', status: 'merged', updatedAt: '2026-07-08T16:30:00Z' },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Concurrent transfers between warehouses could double-count stock.', source: 'PR-190' },
      { id: 'mem-2', type: 'convention', summary: 'All DB writes to `stock_levels` go through the `StockLedger` service.', source: 'ARCHITECTURE.md' },
    ],
    generatedTests: [
      { id: 'gt-1', title: 'test_low_stock_alerts.py — alert fires at threshold boundary', linkedPr: 'PR-210', status: 'ready' },
      { id: 'gt-2', title: 'test_transfer_reconciliation.py — concurrent transfers stay consistent', linkedPr: 'PR-207', status: 'draft' },
    ],
    recentActivity: [
      { id: 'act-1', message: 'Sync in progress for acme-corp/inventory-api', timestamp: '2026-07-18T10:20:00Z' },
      { id: 'act-2', message: 'Generated 2 tests for PR-210', timestamp: '2026-07-17T14:20:00Z' },
    ],
  },
  {
    id: 'authentication-service',
    name: 'Authentication Service',
    repositoryFullName: 'acme-corp/authentication-service',
    description: 'Issues and validates session tokens across internal services.',
    language: 'Go',
    testFramework: 'Go test',
    defaultBranch: 'main',
    memoryCount: 54,
    openPullRequests: 1,
    syncStatus: 'error',
    lastSyncedAt: '2026-07-15T22:10:00Z',
    metrics: {
      testsGenerated: 87,
      coverageEstimate: '71%',
      pullRequestsAnalyzed: 19,
    },
    pullRequests: [
      { id: 'PR-93', title: 'Rotate signing keys on a schedule', author: 'tnguyen', status: 'open', updatedAt: '2026-07-15T12:00:00Z' },
      { id: 'PR-88', title: 'Add refresh token revocation list', author: 'tnguyen', status: 'merged', updatedAt: '2026-07-05T09:15:00Z' },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Expired tokens were briefly accepted due to a clock-skew edge case.', source: 'PR-81' },
      { id: 'mem-2', type: 'test-pattern', summary: 'Token expiry tests use an injectable clock, never real time.sleep.', source: 'internal/testutil' },
    ],
    generatedTests: [
      { id: 'gt-1', title: 'key_rotation_test.go — old keys remain valid during grace period', linkedPr: 'PR-93', status: 'draft' },
    ],
    recentActivity: [
      { id: 'act-1', message: 'Sync failed: repository connection timed out', timestamp: '2026-07-15T22:10:00Z' },
      { id: 'act-2', message: 'Generated 1 test for PR-93', timestamp: '2026-07-15T12:30:00Z' },
    ],
  },
]
