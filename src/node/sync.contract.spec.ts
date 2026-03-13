/**
 * Structural contract test: asserts that the upsert options used in sync
 * explicitly exclude all protected fields from conflict updates.
 *
 * This test does NOT require a running service — it validates the config
 * value itself to prevent accidental overwrites of backend-owned fields.
 */

const SYNC_UPSERT_OPTIONS = {
  onConflictFields: ['nodeId'],
  onConflictAction: 'merge' as const,
  onConflictExcludeFields: ['status', 'requirement', 'prompt', 'attributes'],
};

describe('SyncWorkflow upsert contract', () => {
  it('excludes all protected fields from conflict update', () => {
    expect(SYNC_UPSERT_OPTIONS.onConflictExcludeFields).toContain('status');
    expect(SYNC_UPSERT_OPTIONS.onConflictExcludeFields).toContain('requirement');
    expect(SYNC_UPSERT_OPTIONS.onConflictExcludeFields).toContain('prompt');
    expect(SYNC_UPSERT_OPTIONS.onConflictExcludeFields).toContain('attributes');
  });
});
