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
      {
        id: 'PR-482',
        number: 482,
        title: 'Add support for partial refunds',
        author: 'jchen',
        status: 'open',
        branch: { head: 'feature/partial-refunds', base: 'main' },
        description:
          'Adds the ability to issue partial refunds on a charge. Previously only full refunds were supported. This change updates `RefundService`, adds a `partial` metadata flag on Stripe refund objects, and validates that the requested amount is positive and does not exceed the original charge.',
        additions: 124,
        deletions: 38,
        commitsCount: 5,
        labels: ['enhancement', 'payments'],
        createdAt: '2026-07-15T11:00:00Z',
        updatedAt: '2026-07-17T09:30:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'src/payments/refundService.ts', additions: 67, deletions: 12, status: 'modified' },
          { path: 'src/payments/refundService.test.ts', additions: 45, deletions: 10, status: 'modified' },
          { path: 'src/types/payment.ts', additions: 12, deletions: 16, status: 'modified' },
        ],
        diff: `diff --git a/src/payments/refundService.ts b/src/payments/refundService.ts
--- a/src/payments/refundService.ts
+++ b/src/payments/refundService.ts
@@ -45,7 +45,19 @@ export class RefundService {
   async processRefund(chargeId: string, amount: number): Promise<Refund> {
     const charge = await this.stripe.charges.retrieve(chargeId)
-    if (amount > charge.amount) throw new Error('Refund exceeds charge')
-    return this.stripe.refunds.create({ charge: chargeId, amount })
+    if (amount <= 0) throw new Error('Refund amount must be positive')
+    if (amount > charge.amount) {
+      throw new Error('Refund amount exceeds original charge')
+    }
+    const isPartial = amount < charge.amount
+    return this.stripe.refunds.create({
+      charge: chargeId,
+      amount,
+      metadata: { partial: String(isPartial) },
+    })
   }
 }

diff --git a/src/types/payment.ts b/src/types/payment.ts
--- a/src/types/payment.ts
+++ b/src/types/payment.ts
@@ -12,6 +12,7 @@ export interface Refund {
   chargeId: string
   amount: number
   currency: string
+  partial: boolean
   createdAt: string
 }`,
        generatedTestIds: ['gt-1'],
      },
      {
        id: 'PR-479',
        number: 479,
        title: 'Fix currency rounding in invoice totals',
        author: 'mrodriguez',
        status: 'open',
        branch: { head: 'fix/currency-rounding', base: 'main' },
        description:
          'Invoice totals were off by ±1 cent in certain multi-line scenarios due to floating-point accumulation. This fix switches all intermediate calculations to integer-cent arithmetic and only converts to decimal at the final display layer.',
        additions: 58,
        deletions: 31,
        commitsCount: 3,
        labels: ['bug', 'invoicing'],
        createdAt: '2026-07-14T08:00:00Z',
        updatedAt: '2026-07-16T18:12:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'src/invoicing/totalsCalculator.ts', additions: 34, deletions: 20, status: 'modified' },
          { path: 'src/invoicing/totalsCalculator.test.ts', additions: 24, deletions: 11, status: 'modified' },
        ],
        diff: `diff --git a/src/invoicing/totalsCalculator.ts b/src/invoicing/totalsCalculator.ts
--- a/src/invoicing/totalsCalculator.ts
+++ b/src/invoicing/totalsCalculator.ts
@@ -18,9 +18,11 @@ export function calculateTotal(lines: LineItem[]): number {
-  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
+  // Accumulate in integer cents to avoid floating-point drift
+  const totalCents = lines.reduce(
+    (sum, line) => sum + Math.round(line.unitPriceCents * line.quantity),
+    0,
+  )
+  return totalCents
 }`,
        generatedTestIds: ['gt-2'],
      },
      {
        id: 'PR-471',
        number: 471,
        title: 'Retry logic for webhook delivery',
        author: 'skhan',
        status: 'merged',
        branch: { head: 'feature/webhook-retry', base: 'main' },
        description:
          'Implements exponential back-off retry for outbound webhook deliveries. Stops retrying after five attempts and marks the delivery as failed so the dashboard can surface it.',
        additions: 210,
        deletions: 45,
        commitsCount: 8,
        labels: ['enhancement', 'reliability'],
        createdAt: '2026-07-10T09:00:00Z',
        updatedAt: '2026-07-14T11:00:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'src/webhooks/deliveryService.ts', additions: 110, deletions: 30, status: 'modified' },
          { path: 'src/webhooks/retryScheduler.ts', additions: 78, deletions: 0, status: 'added' },
          { path: 'src/webhooks/deliveryService.test.ts', additions: 22, deletions: 15, status: 'modified' },
        ],
        diff: `diff --git a/src/webhooks/retryScheduler.ts b/src/webhooks/retryScheduler.ts
--- /dev/null
+++ b/src/webhooks/retryScheduler.ts
@@ -0,0 +1,24 @@
+const MAX_ATTEMPTS = 5
+const BASE_DELAY_MS = 1_000
+
+export async function scheduleRetry(
+  deliveryId: string,
+  attempt: number,
+): Promise<void> {
+  if (attempt >= MAX_ATTEMPTS) {
+    await markDeliveryFailed(deliveryId)
+    return
+  }
+  const delay = BASE_DELAY_MS * 2 ** attempt
+  await enqueueAfter(deliveryId, delay)
+}`,
        generatedTestIds: ['gt-3'],
      },
      {
        id: 'PR-465',
        number: 465,
        title: 'Add Stripe idempotency keys',
        author: 'jchen',
        status: 'merged',
        branch: { head: 'feature/idempotency-keys', base: 'main' },
        description:
          'All Stripe charge and refund calls now include an idempotency key derived from the internal request ID. This prevents double-charges if our Lambda retries after a transient network error.',
        additions: 76,
        deletions: 22,
        commitsCount: 4,
        labels: ['enhancement', 'payments', 'reliability'],
        createdAt: '2026-07-08T10:00:00Z',
        updatedAt: '2026-07-10T15:45:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'src/payments/chargeService.ts', additions: 42, deletions: 15, status: 'modified' },
          { path: 'src/payments/refundService.ts', additions: 18, deletions: 7, status: 'modified' },
          { path: 'src/utils/idempotency.ts', additions: 16, deletions: 0, status: 'added' },
        ],
        diff: `diff --git a/src/utils/idempotency.ts b/src/utils/idempotency.ts
--- /dev/null
+++ b/src/utils/idempotency.ts
@@ -0,0 +1,7 @@
+import { randomUUID } from 'crypto'
+
+export function idempotencyKey(requestId?: string): string {
+  return requestId ?? randomUUID()
+}`,
        generatedTestIds: [],
      },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Refund amounts could go negative when discounts were applied twice.', source: 'PR-402', indexedAt: '2026-07-10T08:00:00Z' },
      { id: 'mem-2', type: 'convention', summary: 'All monetary values are stored as integer cents, never floats.', source: 'CONTRIBUTING.md', indexedAt: '2026-07-10T08:00:00Z' },
      { id: 'mem-3', type: 'test-pattern', summary: 'Payment provider calls are mocked with a shared `fakeStripeClient` helper.', source: 'test/helpers', indexedAt: '2026-07-10T08:00:00Z' },
    ],
    generatedTests: [
      {
        id: 'gt-1',
        title: 'refundService.test.ts — partial refund does not exceed original charge',
        linkedPr: 'PR-482',
        linkedPrId: 'PR-482',
        status: 'ready',
        generatedAt: '2026-07-17T09:45:00Z',
        reasoning:
          'The diff introduces a new branch where `amount < charge.amount` marks the refund as partial. The existing test only checks that a full refund succeeds. This test covers the new partial path and verifies the boundary condition — requesting exactly the original amount should not be partial, and requesting more should throw.',
        testCode: `import { RefundService } from '../refundService'
import { fakeStripeClient } from '../../test/helpers'

describe('RefundService — partial refunds', () => {
  let service: RefundService

  beforeEach(() => {
    service = new RefundService(fakeStripeClient({ amount: 10000 }))
  })

  it('marks refund as partial when amount < original charge', async () => {
    const refund = await service.processRefund('ch_123', 5000)
    expect(refund.partial).toBe(true)
    expect(fakeStripeClient.lastCall.metadata.partial).toBe('true')
  })

  it('does not mark as partial when amount equals original charge', async () => {
    const refund = await service.processRefund('ch_123', 10000)
    expect(refund.partial).toBe(false)
  })

  it('throws when refund amount exceeds original charge', async () => {
    await expect(service.processRefund('ch_123', 10001)).rejects.toThrow(
      'Refund amount exceeds original charge',
    )
  })

  it('throws when refund amount is zero or negative', async () => {
    await expect(service.processRefund('ch_123', 0)).rejects.toThrow('must be positive')
    await expect(service.processRefund('ch_123', -1)).rejects.toThrow('must be positive')
  })
})`,
      },
      {
        id: 'gt-2',
        title: 'invoiceTotals.test.ts — rounding stays consistent across currencies',
        linkedPr: 'PR-479',
        linkedPrId: 'PR-479',
        status: 'ready',
        generatedAt: '2026-07-16T19:10:00Z',
        reasoning:
          'The diff switches from float accumulation to integer-cent accumulation. The key risk is rounding divergence across currencies with non-cent subunits (JPY, KWD) or very large line counts. This test checks that the total is deterministic for known inputs and matches the expected cent value.',
        testCode: `import { calculateTotal } from '../totalsCalculator'

describe('calculateTotal — integer-cent arithmetic', () => {
  it('returns correct total for a simple two-line invoice', () => {
    const lines = [
      { unitPriceCents: 999, quantity: 2 },
      { unitPriceCents: 1500, quantity: 1 },
    ]
    expect(calculateTotal(lines)).toBe(3498)
  })

  it('is stable across 1000 identical lines (no float drift)', () => {
    const lines = Array.from({ length: 1000 }, () => ({ unitPriceCents: 1, quantity: 1 }))
    expect(calculateTotal(lines)).toBe(1000)
  })

  it('returns 0 for an empty invoice', () => {
    expect(calculateTotal([])).toBe(0)
  })
})`,
      },
      {
        id: 'gt-3',
        title: 'webhookRetry.test.ts — retries stop after max attempts',
        linkedPr: 'PR-471',
        linkedPrId: 'PR-471',
        status: 'draft',
        generatedAt: '2026-07-14T12:00:00Z',
        reasoning:
          'The new `scheduleRetry` function introduces a `MAX_ATTEMPTS` cap and exponential back-off delay. The critical behaviour to test is: (1) the function enqueues at the right delay for each attempt, and (2) it marks the delivery failed and does not enqueue again once MAX_ATTEMPTS is reached.',
        testCode: `import { scheduleRetry } from '../retryScheduler'
import { mockEnqueueAfter, mockMarkDeliveryFailed } from '../../test/helpers'

describe('scheduleRetry', () => {
  beforeEach(() => {
    mockEnqueueAfter.mockClear()
    mockMarkDeliveryFailed.mockClear()
  })

  it('enqueues with exponential back-off delay', async () => {
    await scheduleRetry('del_1', 0)
    expect(mockEnqueueAfter).toHaveBeenCalledWith('del_1', 1000)

    await scheduleRetry('del_1', 2)
    expect(mockEnqueueAfter).toHaveBeenCalledWith('del_1', 4000)
  })

  it('marks delivery failed and does not enqueue on max attempt', async () => {
    await scheduleRetry('del_1', 5)
    expect(mockMarkDeliveryFailed).toHaveBeenCalledWith('del_1')
    expect(mockEnqueueAfter).not.toHaveBeenCalled()
  })
})`,
      },
    ],
    analytics: {
      memoryCount: 128,
      retrievalHits: 847,
      avgSimilarity: 0.74,
      acceptanceRate: 0.81,
      similarExamples: [
        {
          id: 'se-1',
          sourceRef: 'PR-402 · refundService.test.ts',
          testTitle: 'processRefund — discount applied twice does not go negative',
          summary: 'Tests the guard that prevents double-discount application from producing a negative refund amount.',
          similarity: 0.91,
        },
        {
          id: 'se-2',
          sourceRef: 'PR-388 · chargeService.test.ts',
          testTitle: 'createCharge — idempotency key prevents duplicate charges',
          summary: 'Verifies that sending the same request twice with the same idempotency key returns the first result.',
          similarity: 0.83,
        },
        {
          id: 'se-3',
          sourceRef: 'PR-360 · stripeClient.test.ts',
          testTitle: 'refunds.create — passes correct metadata fields',
          summary: 'Checks that all required metadata fields are forwarded to the Stripe SDK.',
          similarity: 0.72,
        },
      ],
    },
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
      {
        id: 'PR-210',
        number: 210,
        title: 'Add low-stock alert thresholds',
        author: 'lwong',
        status: 'open',
        branch: { head: 'feature/low-stock-alerts', base: 'develop' },
        description:
          'Allows warehouse managers to set a minimum threshold per SKU. When stock falls at or below the threshold, an alert event is emitted to SNS for downstream notification handlers.',
        additions: 143,
        deletions: 9,
        commitsCount: 6,
        labels: ['feature', 'alerts'],
        createdAt: '2026-07-15T09:00:00Z',
        updatedAt: '2026-07-17T14:00:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'inventory/models/threshold.py', additions: 42, deletions: 0, status: 'added' },
          { path: 'inventory/services/stock_checker.py', additions: 65, deletions: 9, status: 'modified' },
          { path: 'inventory/tests/test_low_stock_alerts.py', additions: 36, deletions: 0, status: 'added' },
        ],
        diff: `diff --git a/inventory/models/threshold.py b/inventory/models/threshold.py
--- /dev/null
+++ b/inventory/models/threshold.py
@@ -0,0 +1,12 @@
+from dataclasses import dataclass
+
+@dataclass
+class StockThreshold:
+    sku: str
+    warehouse_id: str
+    minimum_quantity: int
+
+    def is_breached(self, current_quantity: int) -> bool:
+        return current_quantity <= self.minimum_quantity`,
        generatedTestIds: ['gt-1'],
      },
      {
        id: 'PR-207',
        number: 207,
        title: 'Fix race condition in transfer reconciliation',
        author: 'apatel',
        status: 'open',
        branch: { head: 'fix/transfer-race-condition', base: 'develop' },
        description:
          'Concurrent transfers between warehouses could double-count available stock due to a missing row-level lock. This PR wraps the read-modify-write into a `SELECT FOR UPDATE` transaction.',
        additions: 87,
        deletions: 42,
        commitsCount: 4,
        labels: ['bug', 'critical'],
        createdAt: '2026-07-13T07:30:00Z',
        updatedAt: '2026-07-15T08:20:00Z',
        webhookStatus: 'analyzing',
        changedFiles: [
          { path: 'inventory/services/transfer_service.py', additions: 55, deletions: 38, status: 'modified' },
          { path: 'inventory/tests/test_transfer_reconciliation.py', additions: 32, deletions: 4, status: 'modified' },
        ],
        diff: `diff --git a/inventory/services/transfer_service.py b/inventory/services/transfer_service.py
--- a/inventory/services/transfer_service.py
+++ b/inventory/services/transfer_service.py
@@ -30,8 +30,12 @@ class TransferService:
   def transfer(self, from_wh: str, to_wh: str, sku: str, qty: int):
-      source = StockLedger.get(warehouse=from_wh, sku=sku)
-      if source.quantity < qty:
-          raise InsufficientStockError()
-      source.quantity -= qty
+      with transaction.atomic():
+          source = StockLedger.select_for_update().get(
+              warehouse=from_wh, sku=sku
+          )
+          if source.quantity < qty:
+              raise InsufficientStockError()
+          source.quantity -= qty`,
        generatedTestIds: ['gt-2'],
      },
      {
        id: 'PR-198',
        number: 198,
        title: 'Bulk import for supplier catalogs',
        author: 'lwong',
        status: 'merged',
        branch: { head: 'feature/bulk-import', base: 'develop' },
        description:
          'Supports CSV uploads for supplier product catalogs. Validates each row, upserts SKU records, and streams a result summary back to the caller.',
        additions: 312,
        deletions: 18,
        commitsCount: 11,
        labels: ['feature', 'import'],
        createdAt: '2026-07-04T11:00:00Z',
        updatedAt: '2026-07-08T16:30:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'inventory/importers/csv_importer.py', additions: 180, deletions: 0, status: 'added' },
          { path: 'inventory/api/import_view.py', additions: 90, deletions: 18, status: 'modified' },
          { path: 'inventory/tests/test_csv_import.py', additions: 42, deletions: 0, status: 'added' },
        ],
        diff: `diff --git a/inventory/importers/csv_importer.py b/inventory/importers/csv_importer.py
--- /dev/null
+++ b/inventory/importers/csv_importer.py
@@ -0,0 +1,22 @@
+import csv, io
+from inventory.models import Product
+
+def import_catalog(file_bytes: bytes) -> dict:
+    reader = csv.DictReader(io.StringIO(file_bytes.decode()))
+    created, updated, errors = 0, 0, []
+    for i, row in enumerate(reader):
+        try:
+            _, was_created = Product.objects.update_or_create(
+                sku=row['sku'], defaults={'name': row['name'], 'unit_cost': row['cost']}
+            )
+            if was_created: created += 1
+            else: updated += 1
+        except Exception as e:
+            errors.append({'row': i + 2, 'error': str(e)})
+    return {'created': created, 'updated': updated, 'errors': errors}`,
        generatedTestIds: [],
      },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Concurrent transfers between warehouses could double-count stock.', source: 'PR-190', indexedAt: '2026-07-08T09:00:00Z' },
      { id: 'mem-2', type: 'convention', summary: 'All DB writes to `stock_levels` go through the `StockLedger` service.', source: 'ARCHITECTURE.md', indexedAt: '2026-07-08T09:00:00Z' },
    ],
    generatedTests: [
      {
        id: 'gt-1',
        title: 'test_low_stock_alerts.py — alert fires at threshold boundary',
        linkedPr: 'PR-210',
        linkedPrId: 'PR-210',
        status: 'ready',
        generatedAt: '2026-07-17T14:20:00Z',
        reasoning:
          'The new `StockThreshold.is_breached` method uses `<=` (at-or-below), not `<`. This is a common off-by-one. The test should verify that an alert fires exactly at the threshold, not just below it.',
        testCode: `import pytest
from inventory.models.threshold import StockThreshold

class TestStockThreshold:
    def setup_method(self):
        self.threshold = StockThreshold(sku='SKU-001', warehouse_id='WH-A', minimum_quantity=10)

    def test_is_breached_when_stock_equals_threshold(self):
        assert self.threshold.is_breached(10) is True

    def test_is_breached_when_stock_below_threshold(self):
        assert self.threshold.is_breached(5) is True

    def test_not_breached_when_stock_above_threshold(self):
        assert self.threshold.is_breached(11) is False

    def test_not_breached_at_zero_minimum(self):
        t = StockThreshold(sku='SKU-002', warehouse_id='WH-A', minimum_quantity=0)
        assert t.is_breached(1) is False`,
      },
      {
        id: 'gt-2',
        title: 'test_transfer_reconciliation.py — concurrent transfers stay consistent',
        linkedPr: 'PR-207',
        linkedPrId: 'PR-207',
        status: 'draft',
        generatedAt: '2026-07-15T09:00:00Z',
        reasoning:
          'The diff introduces `SELECT FOR UPDATE` to prevent race conditions. The test needs to verify that two concurrent transfers from the same source warehouse do not both succeed when only enough stock exists for one.',
        testCode: `import threading
import pytest
from inventory.services.transfer_service import TransferService
from inventory.exceptions import InsufficientStockError

def test_concurrent_transfers_do_not_double_count(db_with_stock):
    """Only one of two competing transfers should succeed when stock is tight."""
    service = TransferService()
    results = []
    errors = []

    def run_transfer():
        try:
            service.transfer('WH-A', 'WH-B', 'SKU-001', qty=5)
            results.append('success')
        except InsufficientStockError:
            errors.append('insufficient')

    # Start 2 threads simultaneously, each trying to move 5 units (only 5 available)
    t1 = threading.Thread(target=run_transfer)
    t2 = threading.Thread(target=run_transfer)
    t1.start(); t2.start()
    t1.join(); t2.join()

    assert len(results) == 1, 'Exactly one transfer should succeed'
    assert len(errors) == 1, 'Exactly one transfer should fail'`,
      },
    ],
    analytics: {
      memoryCount: 76,
      retrievalHits: 412,
      avgSimilarity: 0.68,
      acceptanceRate: 0.73,
      similarExamples: [
        {
          id: 'se-1',
          sourceRef: 'PR-190 · test_stock_transfer.py',
          testTitle: 'transfer — insufficient stock raises error',
          summary: 'Verifies the guard that prevents transfers when source warehouse has insufficient quantity.',
          similarity: 0.88,
        },
        {
          id: 'se-2',
          sourceRef: 'PR-175 · test_stock_levels.py',
          testTitle: 'StockLedger.get — returns correct quantity after update',
          summary: 'Checks read-after-write consistency for the StockLedger service.',
          similarity: 0.71,
        },
      ],
    },
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
      {
        id: 'PR-93',
        number: 93,
        title: 'Rotate signing keys on a schedule',
        author: 'tnguyen',
        status: 'open',
        branch: { head: 'feature/key-rotation', base: 'main' },
        description:
          'Implements automatic HMAC signing-key rotation on a configurable schedule (default: 30 days). Old keys remain valid for a configurable grace period so in-flight tokens are not rejected during the transition window.',
        additions: 198,
        deletions: 54,
        commitsCount: 9,
        labels: ['security', 'enhancement'],
        createdAt: '2026-07-13T10:00:00Z',
        updatedAt: '2026-07-15T12:00:00Z',
        webhookStatus: 'failed',
        changedFiles: [
          { path: 'internal/auth/key_rotator.go', additions: 120, deletions: 0, status: 'added' },
          { path: 'internal/auth/token_validator.go', additions: 48, deletions: 40, status: 'modified' },
          { path: 'internal/auth/key_rotator_test.go', additions: 30, deletions: 14, status: 'modified' },
        ],
        diff: `diff --git a/internal/auth/key_rotator.go b/internal/auth/key_rotator.go
--- /dev/null
+++ b/internal/auth/key_rotator.go
@@ -0,0 +1,28 @@
+package auth
+
+import (
+    "time"
+    "crypto/rand"
+)
+
+type KeyRotator struct {
+    store       KeyStore
+    interval    time.Duration
+    gracePeriod time.Duration
+}
+
+func (r *KeyRotator) Rotate(ctx context.Context) error {
+    newKey := make([]byte, 32)
+    if _, err := rand.Read(newKey); err != nil {
+        return err
+    }
+    return r.store.SetActive(ctx, newKey)
+}`,
        generatedTestIds: ['gt-1'],
      },
      {
        id: 'PR-88',
        number: 88,
        title: 'Add refresh token revocation list',
        author: 'tnguyen',
        status: 'merged',
        branch: { head: 'feature/revocation-list', base: 'main' },
        description:
          'Stores revoked refresh token IDs in a CockroachDB table with a TTL index. The token validator checks this list before issuing a new access token.',
        additions: 156,
        deletions: 28,
        commitsCount: 7,
        labels: ['security', 'feature'],
        createdAt: '2026-07-02T08:00:00Z',
        updatedAt: '2026-07-05T09:15:00Z',
        webhookStatus: 'analyzed',
        changedFiles: [
          { path: 'internal/auth/revocation_store.go', additions: 88, deletions: 0, status: 'added' },
          { path: 'internal/auth/token_validator.go', additions: 40, deletions: 20, status: 'modified' },
          { path: 'migrations/0012_add_revoked_tokens.sql', additions: 28, deletions: 8, status: 'modified' },
        ],
        diff: `diff --git a/internal/auth/revocation_store.go b/internal/auth/revocation_store.go
--- /dev/null
+++ b/internal/auth/revocation_store.go
@@ -0,0 +1,18 @@
+package auth
+
+type RevocationStore struct{ db *sql.DB }
+
+func (s *RevocationStore) Revoke(ctx context.Context, tokenID string, expiresAt time.Time) error {
+    _, err := s.db.ExecContext(ctx,
+        "INSERT INTO revoked_tokens (id, expires_at) VALUES ($1, $2)",
+        tokenID, expiresAt,
+    )
+    return err
+}
+
+func (s *RevocationStore) IsRevoked(ctx context.Context, tokenID string) (bool, error) {
+    var count int
+    err := s.db.QueryRowContext(ctx,
+        "SELECT COUNT(1) FROM revoked_tokens WHERE id = $1 AND expires_at > NOW()",
+        tokenID,
+    ).Scan(&count)
+    return count > 0, err
+}`,
        generatedTestIds: [],
      },
    ],
    memoryEntries: [
      { id: 'mem-1', type: 'bug-fix', summary: 'Expired tokens were briefly accepted due to a clock-skew edge case.', source: 'PR-81', indexedAt: '2026-07-05T09:00:00Z' },
      { id: 'mem-2', type: 'test-pattern', summary: 'Token expiry tests use an injectable clock, never real time.sleep.', source: 'internal/testutil', indexedAt: '2026-07-05T09:00:00Z' },
    ],
    generatedTests: [
      {
        id: 'gt-1',
        title: 'key_rotation_test.go — old keys remain valid during grace period',
        linkedPr: 'PR-93',
        linkedPrId: 'PR-93',
        status: 'draft',
        generatedAt: '2026-07-15T12:30:00Z',
        reasoning:
          'The `KeyRotator` has a `gracePeriod` field, but no test verifies that tokens signed with the previous key are still accepted during that window. This is the critical correctness property: users should not be logged out during a rotation.',
        testCode: `package auth_test

import (
    "context"
    "testing"
    "time"
    "github.com/acme-corp/authentication-service/internal/auth"
    "github.com/acme-corp/authentication-service/internal/testutil"
)

func TestKeyRotator_GracePeriod(t *testing.T) {
    clock := testutil.NewFakeClock(time.Now())
    store := auth.NewInMemoryKeyStore()
    rotator := auth.NewKeyRotator(store, 30*24*time.Hour, 1*time.Hour, clock)

    // Sign a token with the initial key
    oldToken, _ := rotator.Sign(context.Background(), "user-123")

    // Rotate to a new key
    if err := rotator.Rotate(context.Background()); err != nil {
        t.Fatalf("rotate: %v", err)
    }

    // Token signed with old key should still validate within grace period
    if _, err := rotator.Validate(context.Background(), oldToken); err != nil {
        t.Errorf("old token rejected during grace period: %v", err)
    }

    // Advance past grace period — old token should now be rejected
    clock.Advance(2 * time.Hour)
    if _, err := rotator.Validate(context.Background(), oldToken); err == nil {
        t.Error("old token should be rejected after grace period")
    }
}`,
      },
    ],
    analytics: {
      memoryCount: 54,
      retrievalHits: 203,
      avgSimilarity: 0.79,
      acceptanceRate: 0.67,
      similarExamples: [
        {
          id: 'se-1',
          sourceRef: 'PR-81 · clock_skew_test.go',
          testTitle: 'TokenValidator — rejects token expired by 1 second with clock-skew tolerance',
          summary: 'Tests the clock-skew tolerance window to ensure tokens are not rejected prematurely.',
          similarity: 0.85,
        },
      ],
    },
    recentActivity: [
      { id: 'act-1', message: 'Sync failed: repository connection timed out', timestamp: '2026-07-15T22:10:00Z' },
      { id: 'act-2', message: 'Generated 1 test for PR-93', timestamp: '2026-07-15T12:30:00Z' },
    ],
  },
]
