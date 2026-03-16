---
phase: 03-media-browsing
plan: "03"
subsystem: search
tags: [search, tmdb, debounce, reactive-forms, routing, stub]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [search-page, media-detail-stub-route]
  affects: [tabs-routing, home-card-navigation]
tech_stack:
  added: []
  patterns: [debounceTime+switchMap, FormControl.valueChanges, TDD-red-green, Promise-based-service]
key_files:
  created:
    - src/app/search/search.page.ts
    - src/app/media-detail/media-detail.page.ts
  modified:
    - src/app/search/search.page.spec.ts
    - src/app/tabs/tabs.routes.ts
decisions:
  - "Use FormControl.valueChanges (not ionChange) — Ionic v7+ breaking change; ionChange fires inconsistently"
  - "from() wraps Promise in switchMap — allows proper Observable cancellation on new keystrokes"
  - "MediaDetailPage is a stub with no authGuard — Phase 4 will add real implementation"
metrics:
  duration: 3 min
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_changed: 4
---

# Phase 3 Plan 03: Search Page Summary

Search page with debounced FormControl + switchMap driving TmdbService, plus a media detail stub route enabling card tap navigation from Home and Search without 404.

## What Was Built

### Task 1: Search Page with Debounced TmdbService Wiring

`SearchPage` replaces the scaffold placeholder with full reactive search:

- `FormControl('')` bound to `IonSearchbar` — uses `valueChanges` pipeline (not `ionChange`)
- `debounceTime(300) + distinctUntilChanged() + switchMap` drives TMDB calls
- Query empty or < 2 chars: calls `getTrending(1)` (trending content shown while idle)
- Query >= 2 chars: calls `searchMulti(query, 1)`
- `loadMore()` appends results for infinite scroll; `event.target.complete()` always called (in both `.then` and `.catch`)
- `ngOnDestroy` with `Subject.takeUntil` prevents subscription leaks

### Task 2: Media Detail Stub Route

- `MediaDetailPage` — minimal standalone component that displays `mediaType` and `id` params with a back button defaulting to `/tabs/home`
- Route `/tabs/media/:mediaType/:id` added to `tabs.routes.ts` — no `authGuard` (Phase 3 guests can browse)
- Enables card tap navigation from both `HomePage` and `SearchPage` without 404

## Tests

9 tests in `search.page.spec.ts` — all green:
- Component creates as guest (no auth guard)
- `getTrending(1)` called on init, items populated
- Empty query → `getTrending`; short query (<2 chars) → `getTrending`, not `searchMulti`
- Query >=2 chars → `searchMulti` fires after 300ms debounce
- Rapid typing (debounce cancellation) → only one `searchMulti` call
- `loadMore()` with active query → calls `searchMulti(query, page+1)` and appends
- `loadMore()` with empty query → calls `getTrending(page+1)` and appends
- `allLoaded` getter logic verified

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Verified:
- `src/app/search/search.page.ts` — exists
- `src/app/search/search.page.spec.ts` — exists
- `src/app/media-detail/media-detail.page.ts` — exists
- `src/app/tabs/tabs.routes.ts` — exists with media route
- Commit `08b9add` — Task 1
- Commit `b5c0e92` — Task 2

## Self-Check: PASSED
