import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';

// Inline type definitions — will be replaced with imports once ReviewService exists
interface ReviewDoc {
  userId: string;
  authorName: string;
  role: 'normal' | 'critic';
  score: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

interface MediaSummary {
  normalCount: number;
  normalTotal: number;
  criticCount: number;
  criticTotal: number;
}

// TestableReviewService will be added in plan 04-02 when the class exists.
// For now the describe blocks are stubs.

describe('ReviewService', () => {
  describe('submitReview()', () => {
    xit('REVW-01: creates review doc and increments normalCount + normalTotal for normal user review', () => {});
    xit('REVW-01: creates review doc and increments criticCount + criticTotal for critic review', () => {});
    xit('REVW-01: initializes summary doc from zero when media/{mediaId} does not exist yet', () => {});
    xit('REVW-01: getUserReview returns null when no review exists for user', () => {});
    xit('REVW-01: getUserReview returns ReviewDoc when review exists', () => {});
  });

  describe('editReview()', () => {
    xit('REVW-02: updates summary totalScore by delta (new - old), not full recompute', () => {});
    xit('REVW-02: delta applies to criticTotal for critic role reviews', () => {});
  });

  describe('deleteReview()', () => {
    xit('REVW-03: decrements count and total for normal user review', () => {});
    xit('REVW-03: decrements criticCount and criticTotal for critic review', () => {});
  });

  describe('getReviews()', () => {
    xit('DETL-03: returns reviews ordered by createdAt desc', () => {});
  });
});
