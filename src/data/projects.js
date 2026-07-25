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
