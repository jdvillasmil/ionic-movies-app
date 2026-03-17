import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { ReviewService, ReviewDoc, MediaSummary } from './review.service';

// ---------------------------------------------------------------------------
// Mock transaction object — simulates Firestore Transaction API
// ---------------------------------------------------------------------------
function makeMockTransaction(snapsByRef: Map<string, { exists: boolean; data?: any }>) {
  const getSpy = jasmine.createSpy('tx.get').and.callFake(async (ref: any) => {
    const entry = snapsByRef.get(ref.__path__) ?? { exists: false };
    return {
      exists: () => entry.exists,
      data: () => entry.data,
    };
  });
  const setSpy = jasmine.createSpy('tx.set');
  const deleteSpy = jasmine.createSpy('tx.delete');
  return { get: getSpy, set: setSpy, delete: deleteSpy };
}

// ---------------------------------------------------------------------------
// TestableReviewService — overrides runTransaction to run synchronously in tests
// ---------------------------------------------------------------------------
@Injectable()
class TestableReviewService extends ReviewService {
  // Snapshots to feed into the transaction callback
  snapshotMap: Map<string, { exists: boolean; data?: any }> = new Map();

  // Last transaction mock — inspect after calling submitReview/editReview/deleteReview
  lastTx: ReturnType<typeof makeMockTransaction> | null = null;

  // Captures for getDocs / getDoc overrides
  docsOverride: any[] = [];
  docSnap: { exists: boolean; data?: any } = { exists: false };

  // Override makeRef to return a plain object with __path__ — avoids real Firestore
  override makeRef(path: string): any {
    return { __path__: path };
  }

  override async runTx(fn: (tx: any) => Promise<void>): Promise<void> {
    this.lastTx = makeMockTransaction(this.snapshotMap);
    await fn(this.lastTx);
  }

  override async getDocSnap(path: string): Promise<any> {
    const entry = this.snapshotMap.get(path) ?? { exists: false };
    return { exists: () => entry.exists, data: () => entry.data };
  }

  override async getDocsSnap(path: string): Promise<any[]> {
    return this.docsOverride;
  }
}

// ---------------------------------------------------------------------------
// Helpers for making doc refs with __path__ for spy lookup
// ---------------------------------------------------------------------------
function makeRef(path: string): { __path__: string } {
  return { __path__: path };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const normalReview: ReviewDoc = {
  userId: 'user1',
  authorName: 'Alice',
  role: 'normal',
  score: 7,
  text: 'Good movie',
  createdAt: 1000,
  updatedAt: 1000,
};

const criticReview: ReviewDoc = {
  userId: 'critic1',
  authorName: 'Bob',
  role: 'critic',
  score: 9,
  text: 'Excellent',
  createdAt: 2000,
  updatedAt: 2000,
};

const baseSummary: MediaSummary = {
  normalCount: 2,
  normalTotal: 15,
  criticCount: 1,
  criticTotal: 9,
};

// ---------------------------------------------------------------------------
// ReviewService tests
// ---------------------------------------------------------------------------
describe('ReviewService', () => {
  let service: TestableReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ReviewService, useClass: TestableReviewService },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(ReviewService) as TestableReviewService;
  });

  describe('submitReview()', () => {
    it('REVW-01: creates review doc and increments normalCount + normalTotal for normal user review', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;
      const reviewPath = `media/${mediaId}/reviews/${normalReview.userId}`;

      // Summary exists with base data
      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });
      service.snapshotMap.set(reviewPath, { exists: false });

      await service.submitReview(mediaId, normalReview);

      const tx = service.lastTx!;
      // Should have called set twice: summaryRef and reviewRef
      expect(tx.set).toHaveBeenCalledTimes(2);

      // First set call is summaryRef — check updated summary
      const updatedSummary = tx.set.calls.argsFor(0)[1];
      expect(updatedSummary.normalCount).toBe(baseSummary.normalCount + 1);
      expect(updatedSummary.normalTotal).toBe(baseSummary.normalTotal + normalReview.score);
      // Critic fields unchanged
      expect(updatedSummary.criticCount).toBe(baseSummary.criticCount);
      expect(updatedSummary.criticTotal).toBe(baseSummary.criticTotal);
    });

    it('REVW-01: creates review doc and increments criticCount + criticTotal for critic review', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;

      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });

      await service.submitReview(mediaId, criticReview);

      const tx = service.lastTx!;
      const updatedSummary = tx.set.calls.argsFor(0)[1];
      expect(updatedSummary.criticCount).toBe(baseSummary.criticCount + 1);
      expect(updatedSummary.criticTotal).toBe(baseSummary.criticTotal + criticReview.score);
      // Normal fields unchanged
      expect(updatedSummary.normalCount).toBe(baseSummary.normalCount);
      expect(updatedSummary.normalTotal).toBe(baseSummary.normalTotal);
    });

    it('REVW-01: initializes summary doc from zero when media/{mediaId} does not exist yet', async () => {
      const mediaId = 'movie_new';
      const summaryPath = `media/${mediaId}`;

      // No existing summary doc
      service.snapshotMap.set(summaryPath, { exists: false });

      await service.submitReview(mediaId, normalReview);

      const tx = service.lastTx!;
      const updatedSummary = tx.set.calls.argsFor(0)[1];
      // Should start from zero and add the new review
      expect(updatedSummary.normalCount).toBe(1);
      expect(updatedSummary.normalTotal).toBe(normalReview.score);
      expect(updatedSummary.criticCount).toBe(0);
      expect(updatedSummary.criticTotal).toBe(0);
    });

    it('REVW-01: getUserReview returns null when no review exists for user', async () => {
      const mediaId = 'movie_550';
      service.snapshotMap.set(`media/${mediaId}/reviews/user1`, { exists: false });

      const result = await service.getUserReview(mediaId, 'user1');

      expect(result).toBeNull();
    });

    it('REVW-01: getUserReview returns ReviewDoc when review exists', async () => {
      const mediaId = 'movie_550';
      service.snapshotMap.set(`media/${mediaId}/reviews/user1`, {
        exists: true,
        data: normalReview,
      });

      const result = await service.getUserReview(mediaId, 'user1');

      expect(result).toEqual(normalReview);
    });
  });

  describe('editReview()', () => {
    it('REVW-02: updates summary totalScore by delta (new - old), not full recompute', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;
      const oldScore = 5;
      const updatedReview: ReviewDoc = { ...normalReview, score: 8 };

      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });

      await service.editReview(mediaId, oldScore, updatedReview);

      const tx = service.lastTx!;
      const patchedSummary = tx.set.calls.argsFor(0)[1];
      const expectedDelta = 8 - 5; // 3
      expect(patchedSummary.normalTotal).toBe(baseSummary.normalTotal + expectedDelta);
      // Count should NOT change
      expect(patchedSummary.normalCount).toBe(baseSummary.normalCount);
    });

    it('REVW-02: delta applies to criticTotal for critic role reviews', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;
      const oldScore = 7;
      const updatedCriticReview: ReviewDoc = { ...criticReview, score: 10 };

      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });

      await service.editReview(mediaId, oldScore, updatedCriticReview);

      const tx = service.lastTx!;
      const patchedSummary = tx.set.calls.argsFor(0)[1];
      const expectedDelta = 10 - 7; // 3
      expect(patchedSummary.criticTotal).toBe(baseSummary.criticTotal + expectedDelta);
      // normalTotal should NOT change
      expect(patchedSummary.normalTotal).toBe(baseSummary.normalTotal);
      // Counts should NOT change
      expect(patchedSummary.criticCount).toBe(baseSummary.criticCount);
      expect(patchedSummary.normalCount).toBe(baseSummary.normalCount);
    });
  });

  describe('deleteReview()', () => {
    it('REVW-03: decrements count and total for normal user review', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;

      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });

      await service.deleteReview(mediaId, normalReview);

      const tx = service.lastTx!;
      const patchedSummary = tx.set.calls.argsFor(0)[1];
      expect(patchedSummary.normalCount).toBe(baseSummary.normalCount - 1);
      expect(patchedSummary.normalTotal).toBe(baseSummary.normalTotal - normalReview.score);
      // Critic fields unchanged
      expect(patchedSummary.criticCount).toBe(baseSummary.criticCount);
      expect(patchedSummary.criticTotal).toBe(baseSummary.criticTotal);

      // Should have called delete on the review ref
      expect(tx.delete).toHaveBeenCalledTimes(1);
    });

    it('REVW-03: decrements criticCount and criticTotal for critic review', async () => {
      const mediaId = 'movie_550';
      const summaryPath = `media/${mediaId}`;

      service.snapshotMap.set(summaryPath, { exists: true, data: { ...baseSummary } });

      await service.deleteReview(mediaId, criticReview);

      const tx = service.lastTx!;
      const patchedSummary = tx.set.calls.argsFor(0)[1];
      expect(patchedSummary.criticCount).toBe(baseSummary.criticCount - 1);
      expect(patchedSummary.criticTotal).toBe(baseSummary.criticTotal - criticReview.score);
      // Normal fields unchanged
      expect(patchedSummary.normalCount).toBe(baseSummary.normalCount);
      expect(patchedSummary.normalTotal).toBe(baseSummary.normalTotal);
    });
  });

  describe('getReviews()', () => {
    it('DETL-03: returns reviews ordered by createdAt desc', async () => {
      const mediaId = 'movie_550';
      // Service will return docsOverride in order (already ordered by our override)
      service.docsOverride = [
        { data: () => criticReview },
        { data: () => normalReview },
      ];

      const result = await service.getReviews(mediaId);

      expect(result.length).toBe(2);
      // criticReview has createdAt 2000, normalReview has 1000 — critic should be first (desc order)
      expect(result[0].createdAt).toBe(2000);
      expect(result[1].createdAt).toBe(1000);
    });
  });
});
