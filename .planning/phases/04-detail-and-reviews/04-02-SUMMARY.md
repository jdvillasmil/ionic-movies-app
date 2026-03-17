---
phase: 04-detail-and-reviews
plan: "02"
subsystem: services
tags: [tdd, firestore, transactions, tmdb, review-service, aggregate]

# Dependency graph
requires:
  - phase: 04-detail-and-reviews
    plan: "01"
    provides: Wave 0 xit scaffolds for ReviewService and TmdbService.getDetail
provides:
  - ReviewService with submitReview, editReview, deleteReview, getReviews, getUserReview, getMediaSummary
  - MediaDetail and CastMember interfaces exported from TmdbService
  - TmdbService.getDetail(id, mediaType) returning normalized MediaDetail
  - TestableReviewService subclass with makeRef/runTx/getDocSnap/getDocsSnap overrides
affects: [04-03-media-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TestableReviewService subclass overrides makeRef/runTx/getDocSnap/getDocsSnap — avoids real Firestore in unit tests"
    - "runTransaction with ALL reads before ALL writes — Firestore transaction ordering requirement"
    - "Delta-based aggregate updates in editReview (new-old score) — no full recompute of all reviews"
    - "getDetail uses firstValueFrom with URL string embedding append_to_response=credits — avoids HttpParams interceptor collision"

key-files:
  created:
    - src/app/core/services/review.service.ts
  modified:
    - src/app/core/services/review.service.spec.ts
    - src/app/core/services/tmdb.service.ts
    - src/app/core/services/tmdb.service.spec.ts

key-decisions:
  - "TestableReviewService overrides makeRef to return plain {__path__} objects — Firestore doc() requires real Firestore instance, subclass workaround is cleaner than trying to mock Firestore itself"
  - "Protected methods pattern (makeRef, runTx, getDocSnap, getDocsSnap) enables full unit test isolation without constructor injection complexity"

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 4 Plan 02: ReviewService and TmdbService.getDetail Summary

**ReviewService with full CRUD + Firestore transaction aggregates and TmdbService.getDetail with movie/TV normalization, both fully tested with 21 tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T04:23:46Z
- **Completed:** 2026-03-17T04:28:22Z
- **Tasks:** 2 commits (ReviewService + TmdbService)
- **Files modified:** 4

## Accomplishments

- Created ReviewService with submitReview, editReview, deleteReview, getReviews, getUserReview, getMediaSummary
- All Firestore transactions use reads-before-writes pattern (prevents Firestore OUT_OF_RANGE error)
- submitReview defaults MediaSummary to zero counts on first review (summary doc doesn't exist yet)
- editReview computes delta (new - old score) without reading all reviews
- deleteReview decrements count and total atomically from the known review document
- TestableReviewService subclass overrides makeRef/runTx/getDocSnap/getDocsSnap for full test isolation
- Added CastMember and MediaDetail interfaces to TmdbService exports
- Implemented TmdbService.getDetail() normalizing both movie and TV responses
- append_to_response=credits embedded in URL string (not HttpParams) to avoid TmdbInterceptor param collision

## Task Commits

Each task was committed atomically:

1. **ReviewService implementation + tests** - `7587783` (feat)
2. **TmdbService getDetail implementation + tests** - `299597e` (feat)

## Files Created/Modified

- `src/app/core/services/review.service.ts` — new service with ReviewDoc, MediaSummary interfaces, and full CRUD
- `src/app/core/services/review.service.spec.ts` — converted Wave 0 xit stubs to real tests; added TestableReviewService; 10 tests GREEN
- `src/app/core/services/tmdb.service.ts` — added CastMember, MediaDetail interfaces + getDetail() method
- `src/app/core/services/tmdb.service.spec.ts` — converted 3 getDetail xit stubs to real tests; 11 tests total GREEN

## Test Results

- ReviewService: 10/10 GREEN (submitReview×3, editReview×2, deleteReview×2, getReviews×1, getUserReview×2)
- TmdbService: 11/11 GREEN (3 new getDetail + 8 existing; no regression)
- Combined: 21/21 GREEN
- Build: ng build --configuration=development exits 0

## Decisions Made

- TestableReviewService overrides `makeRef` to return `{ __path__: path }` objects instead of real Firestore DocumentReference — Firestore's `doc()` requires a real Firestore instance even when passed a mock `{}`. The protected method override pattern is the cleanest solution that matches the established TestableTmdbService pattern.
- Protected methods `makeRef`, `runTx`, `getDocSnap`, `getDocsSnap` in ReviewService enable full test isolation — Jasmine spies can't replace imported ES module functions, but subclass method overrides work cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spec's TestableReviewService needed makeRef override**

- **Found during:** RED phase — tests threw `FirebaseError: Expected first argument to collection() to be a CollectionReference` when tx.get() was called via the real `makeRef`
- **Issue:** TestableReviewService overrode runTx but makeRef still called real `doc(this.firestore, path)` with the mock `{}` Firestore
- **Fix:** Added `protected makeRef(path: string): any` to ReviewService and overrode it in TestableReviewService to return `{ __path__: path }` — the mock transaction's getSpy matches by `ref.__path__`
- **Files modified:** `review.service.ts`, `review.service.spec.ts`
- **Commit:** `7587783` (included in same commit)

## Issues Encountered

None — build and tests passed after the makeRef override fix.

## Next Phase Readiness

- ReviewService is fully implemented and tested — MediaDetailPage (plan 04-03) can inject and use all methods
- TmdbService.getDetail exports MediaDetail and CastMember types needed by MediaDetailPage
- plan 04-03 can replace the Phase 3 stub with full MediaDetailPage implementation

## Self-Check: PASSED

- `src/app/core/services/review.service.ts` — FOUND
- `src/app/core/services/review.service.spec.ts` — FOUND
- `src/app/core/services/tmdb.service.ts` — FOUND
- `.planning/phases/04-detail-and-reviews/04-02-SUMMARY.md` — FOUND
- Commit `7587783` — FOUND
- Commit `299597e` — FOUND

---
*Phase: 04-detail-and-reviews*
*Completed: 2026-03-17*
