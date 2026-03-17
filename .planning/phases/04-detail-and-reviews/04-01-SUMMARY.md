---
phase: 04-detail-and-reviews
plan: "01"
subsystem: testing
tags: [jasmine, karma, firestore, collectionGroup, tdd, wave0]

# Dependency graph
requires:
  - phase: 03-media-browsing
    provides: TmdbService with firestoreGet/firestoreSet spy pattern, ProfilePage with review loading
provides:
  - Wave 0 test scaffold for ReviewService (xit stubs for REVW-01, REVW-02, REVW-03, DETL-03)
  - Wave 0 test scaffold for MediaDetailPage (xit stubs for DETL-01, DETL-02, REVW-04)
  - getDetail() xit stubs appended to tmdb.service.spec.ts
  - Firestore collection group rule enabling collectionGroup('reviews') queries
  - ProfilePage.loadReviews and UserService.deleteUserAndReviews updated to use collectionGroup
affects: [04-02-review-service, 04-03-media-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 xit scaffold pattern: spec files with all-pending xit stubs exist before production code to support TDD in subsequent plans"
    - "collectionGroup('reviews') pattern: subcollection reviews queried across all media documents via Firestore collection group API"

key-files:
  created:
    - src/app/core/services/review.service.spec.ts
    - src/app/media-detail/media-detail.page.spec.ts
  modified:
    - src/app/core/services/tmdb.service.spec.ts
    - firestore.rules
    - src/app/profile/profile.page.ts
    - src/app/core/services/user.service.ts

key-decisions:
  - "Review documents stored at media/{mediaId}/reviews/{userId} subcollection path — collectionGroup query required for cross-media review lookup in ProfilePage"
  - "Wave 0 spec scaffolds use xit (not it) so pending tests don't block CI while production code is absent"

patterns-established:
  - "Wave 0 scaffold pattern: create spec file with xit stubs before implementing the service/component"
  - "collectionGroup import replaces flat collection import in any file querying reviews across media documents"

requirements-completed: [REVW-01, REVW-02, REVW-03, DETL-01, DETL-02, DETL-03, REVW-04]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 4 Plan 01: Wave 0 Test Scaffolds and CollectionGroup Fix Summary

**TDD Wave 0 scaffolds for ReviewService and MediaDetailPage created as xit stubs, plus Firestore collectionGroup rule and query fix so ProfilePage shows reviews written to subcollections**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T04:18:56Z
- **Completed:** 2026-03-17T04:22:49Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created review.service.spec.ts Wave 0 scaffold with 10 xit stubs covering submitReview, editReview, deleteReview, getReviews
- Created media-detail.page.spec.ts Wave 0 scaffold with 9 xit stubs covering normalAvg, criticAvg, ngOnInit behaviors
- Appended 3 getDetail() xit stubs to tmdb.service.spec.ts; all 8 existing tests remain GREEN
- Added /{path=**}/reviews/{userId} collection group rule to firestore.rules enabling collectionGroup queries
- Updated profile.page.ts and user.service.ts to use collectionGroup('reviews') instead of flat collection('reviews')

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 test scaffold for ReviewService** - `d46aa34` (test)
2. **Task 2: Add getDetail xit stubs and MediaDetailPage spec scaffold** - `5443c42` (test)
3. **Task 3: Add Firestore collection group rule and fix collectionGroup queries** - `d96a248` (feat)

## Files Created/Modified
- `src/app/core/services/review.service.spec.ts` - Wave 0 xit scaffolds for ReviewService CRUD and aggregate tests
- `src/app/media-detail/media-detail.page.spec.ts` - Wave 0 xit scaffolds for normalAvg, criticAvg, ngOnInit behaviors
- `src/app/core/services/tmdb.service.spec.ts` - Added getDetail() describe block with 3 xit stubs appended at end
- `firestore.rules` - Added collection group rule at /{path=**}/reviews/{userId} before the deny-all rule
- `src/app/profile/profile.page.ts` - Replaced collection('reviews') with collectionGroup('reviews') in loadReviews
- `src/app/core/services/user.service.ts` - Replaced collection('reviews') with collectionGroup('reviews') in deleteUserAndReviews

## Decisions Made
- Review documents are in media/{mediaId}/reviews/{userId} subcollections (not a flat root reviews collection), so collectionGroup is required for cross-media queries — ProfilePage and account deletion both need this
- Wave 0 xit scaffolds committed before implementation so plan 04-02 starts with failing stubs ready to be converted to it

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None — build and tests passed on first attempt.

## Next Phase Readiness
- All Wave 0 spec scaffolds in place for plan 04-02 (ReviewService implementation)
- Firestore rules updated; collectionGroup queries will work once reviews are written in plan 04-02
- plan 04-02 will implement ReviewService, converting xit to it in review.service.spec.ts

---
*Phase: 04-detail-and-reviews*
*Completed: 2026-03-17*
