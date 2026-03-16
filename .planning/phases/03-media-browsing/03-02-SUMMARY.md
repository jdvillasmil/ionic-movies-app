---
phase: 03-media-browsing
plan: "02"
subsystem: ui
tags: [ionic, angular, tmdb, grid, infinite-scroll, filter-modal, skeleton]

# Dependency graph
requires:
  - phase: 03-01
    provides: TmdbService with getTrending, discoverMedia, getGenres, and TmdbImagePipe
provides:
  - MediaCardComponent (standalone, reusable poster card with tap output)
  - HomePage with 2-column grid, skeleton loading, infinite scroll, and live-filter IonModal
affects:
  - 03-03-search (uses MediaCardComponent)
  - 03-04-detail (navigation target /tabs/media/:mediaType/:id)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD red/green with fakeAsync+flushMicrotasks for Promise-based component methods
    - CSS grid (repeat 2, 1fr) for 2-column media layout
    - IonModal with ng-template for lazy-rendered filter panel
    - Absolute-positioned ion-badge on toolbar button for active filter indicator

key-files:
  created:
    - src/app/shared/components/media-card/media-card.component.ts
    - src/app/shared/components/media-card/media-card.component.spec.ts
  modified:
    - src/app/home/home.page.ts
    - src/app/home/home.page.html
    - src/app/home/home.page.scss
    - src/app/home/home.page.spec.ts

key-decisions:
  - "IonModal uses ng-template wrapper so filter panel DOM is lazy-created (Ionic requirement for dynamic content)"
  - "toggleGenre creates new object reference via spread to trigger Angular change detection cleanly"
  - "loadMore always calls event.target.complete() in finally block to prevent infinite scroll spinner hang"

patterns-established:
  - "Filter state uses immutable spread pattern: activeFilters = { ...activeFilters, field: value }"
  - "loadItems(reset=false) dual-mode: reset=true clears and refetches, reset=false appends (infinite scroll)"
  - "hasActiveFilters getter drives both badge visibility and getTrending vs discoverMedia routing"

requirements-completed: [BROW-01, BROW-03, BROW-04, BROW-05]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 3 Plan 02: MediaCardComponent and Home Page Summary

**Standalone MediaCardComponent with poster/title/year, plus full HomePage with 2-column CSS grid, skeleton loading, infinite scroll pagination, and live-filter IonModal (genre chips, year range, score slider, sort order)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T21:33:37Z
- **Completed:** 2026-03-16T21:37:37Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- MediaCardComponent renders poster at w185 via TmdbImagePipe, shows title and year, emits cardTap output
- HomePage bootstraps without auth guard; getTrending called on init; items array populated from mock
- Skeleton 10-card grid shown while isLoading; replaced by real MediaCardComponent grid after data arrives
- Infinite scroll calls loadMore() which increments page, appends items, always calls event.target.complete()
- Filter modal with genre chips (toggle highlights), year range number inputs, IonRange for minScore, sort order chips
- Any filter interaction triggers immediate loadItems(true) reset — no Apply button
- Red badge showing count of active filter criteria appears on filter toolbar button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MediaCardComponent** - `a3eb858` (feat)
2. **Task 2: Implement Home page** - `00ec6c9` (feat)

## Files Created/Modified
- `src/app/shared/components/media-card/media-card.component.ts` - Standalone card component with IonCard, TmdbImagePipe, cardTap EventEmitter
- `src/app/shared/components/media-card/media-card.component.spec.ts` - 3 tests: title/year render, null posterPath, @Input existence
- `src/app/home/home.page.ts` - Full implementation: grid state, infinite scroll, filter state, genre toggle, navigation
- `src/app/home/home.page.html` - Skeleton grid, real grid, IonInfiniteScroll, IonModal with all filter controls
- `src/app/home/home.page.scss` - 2-column grid, skeleton styles, filter modal layout, year input styling
- `src/app/home/home.page.spec.ts` - 8 tests covering BROW-01, BROW-05, discoverMedia routing, hasActiveFilters

## Decisions Made
- IonModal uses `ng-template` wrapper as required for Ionic's dynamic content rendering pattern
- `loadMore` has a `finally` block to guarantee `event.target.complete()` runs even on error — prevents spinner hanging indefinitely
- Filter state mutations use spread operator to produce new object references, ensuring Angular change detection fires

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Warning] Removed unused NgIf import from MediaCardComponent**
- **Found during:** Task 2 (ng build verification)
- **Issue:** NgIf was imported but never used in MediaCardComponent template, causing NG8113 build warning
- **Fix:** Removed NgIf from imports array and import statement
- **Files modified:** src/app/shared/components/media-card/media-card.component.ts
- **Verification:** ng build --configuration=development completes with no warnings
- **Committed in:** 00ec6c9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - cleanup warning)
**Impact on plan:** Minor cleanup only. No scope creep.

## Issues Encountered
- `ng build` (default) fails with "environment.prod.ts path in file replacements does not exist" — this is a pre-existing project issue unrelated to this plan. Build verified using `--configuration=development` which succeeds. Logged to deferred-items.

## Next Phase Readiness
- MediaCardComponent ready to import in search page (plan 03-03)
- Navigation target `/tabs/media/:mediaType/:id` wired from card taps — Phase 4 detail page stub needed
- getGenres results cached in TmdbService genreCache — subsequent filter modal opens are instant

---
*Phase: 03-media-browsing*
*Completed: 2026-03-16*
