---
phase: 02-auth-and-profiles
plan: "03"
subsystem: ui
tags: [ionic, angular, firebase, firestore, reactive-forms, glassmorphism, tdd]

# Dependency graph
requires:
  - phase: 02-auth-and-profiles/02-01
    provides: AuthService (user$, logout, updateDisplayName, deleteCurrentUser), UserService (getUserDoc, updateUserDoc, deleteUserAndReviews), UserAvatarComponent
provides:
  - Profile page with view mode, edit mode, reviews list, logout, and account deletion
  - ProfilePage standalone component at src/app/profile/profile.page.ts
  - Full profile.page.spec.ts test suite (13 tests, all passing)
affects: [03-movies-and-search, 04-reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spy on private async methods in beforeEach (before detectChanges) to prevent real Firestore calls in tests"
    - "Import controller providers from @ionic/angular/standalone in specs to match component injection tokens"
    - "switchMap on authService.user$ for live Firestore profile stream"
    - "Firestore deleted before Auth record in account deletion — security rules require valid auth"

key-files:
  created:
    - src/app/profile/profile.page.spec.ts
  modified:
    - src/app/profile/profile.page.ts

key-decisions:
  - "Import ToastController/AlertController from @ionic/angular/standalone in specs — different DI token than @ionic/angular"
  - "Spy on loadReviews in beforeEach (before detectChanges) to prevent real Firestore calls in tests"

patterns-established:
  - "ToastController/AlertController spec imports must match component's @ionic/angular/standalone import path"
  - "Private async methods that call Firestore directly should be spied on in beforeEach before detectChanges"

requirements-completed: [AUTH-03, PROF-01, PROF-02, PROF-03]

# Metrics
duration: 25min
completed: 2026-03-12
---

# Phase 2 Plan 03: Profile Page Summary

**Standalone profile page with glassmorphism design — live Firestore stream, edit mode, one-time reviews query, 2-step account deletion with Firestore-before-Auth ordering**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-12T17:35:00Z
- **Completed:** 2026-03-12T18:05:00Z
- **Tasks:** 2 (Tasks 1 and 2 implemented together in a single component)
- **Files modified:** 2

## Accomplishments
- Full profile page: avatar via UserAvatarComponent, display name, role badge (Normal/Crítico), email
- Edit mode with displayName and avatarUrl fields — saves to both Firebase Auth and Firestore, shows "Perfil actualizado" toast
- User reviews section with one-time getDocs query — "No hay reseñas aún" empty state
- Logout button (danger-styled, bottom) calls AuthService.logout() and navigates to /login
- 2-step account deletion: AlertController confirm dialog, Firestore first, Auth record second, handles auth/requires-recent-login error
- All 13 profile spec tests pass; 77 total suite tests pass; build clean

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Profile page display, edit, reviews, logout, account deletion** - `5057173` (feat)

**Plan metadata:** pending (docs: complete plan)

_Note: Task 1 and Task 2 were pre-implemented together in the same file. Spec fix (ToastController/AlertController import path) was part of the GREEN phase._

## Files Created/Modified
- `src/app/profile/profile.page.ts` - Full profile page: header card, edit form, reviews list, logout, account deletion
- `src/app/profile/profile.page.spec.ts` - 13 tests covering all behaviors

## Decisions Made
- `@ionic/angular/standalone` vs `@ionic/angular` DI tokens are different classes — spec must use `@ionic/angular/standalone` imports to match component injection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test spec using wrong IonicController import path**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `ToastController` and `AlertController` imported from `@ionic/angular` in spec, but component uses `@ionic/angular/standalone`. These are different classes and different DI tokens — mock was never injected into the component, so toast/alert tests always failed with "never called"
- **Fix:** Changed spec import to `@ionic/angular/standalone` to match the component's injection token
- **Files modified:** src/app/profile/profile.page.spec.ts
- **Verification:** All 13 spec tests pass after fix
- **Committed in:** 5057173 (Task 1 commit)

**2. [Rule 1 - Bug] Spy on loadReviews before detectChanges to prevent Firestore zone errors**
- **Found during:** Task 1 (TDD GREEN investigation)
- **Issue:** `loadReviews` called in `ngOnInit` subscription uses real Firestore functions (`collection`, `getDocs`) with a mocked `{}` Firestore token. Though caught internally, the rejection could cause Angular test zone interference
- **Fix:** Added `spyOn(component as any, 'loadReviews').and.returnValue(Promise.resolve())` in `beforeEach` after `createComponent` but before `detectChanges`
- **Files modified:** src/app/profile/profile.page.spec.ts
- **Verification:** Tests pass cleanly with no zone warnings
- **Committed in:** 5057173 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs — test correctness)
**Impact on plan:** Both fixes were necessary to make the written spec actually test the component. No functionality changes. No scope creep.

## Issues Encountered
- Tests 3, 9, 12-13 failed initially with "spy was never called" — traced to Angular DI token mismatch between `@ionic/angular` and `@ionic/angular/standalone`. These are separate compiled classes with separate `ɵprov` declarations, producing different DI tokens even though they have identical API surfaces.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Auth and Profiles) is now complete: AuthService + UserService + authGuard (02-01), Register + Login pages (02-02), Profile page (02-03)
- Phase 3 (Movies and Search) can begin — no blockers
- Note: Firestore reviews collection is queried in profile page but returns empty until Phase 4 (Reviews) creates it

## Self-Check: PASSED

- FOUND: src/app/profile/profile.page.ts
- FOUND: src/app/profile/profile.page.spec.ts
- FOUND: commit 5057173
- FOUND: .planning/phases/02-auth-and-profiles/02-03-SUMMARY.md
- All 77 tests pass
- Build clean

---
*Phase: 02-auth-and-profiles*
*Completed: 2026-03-12*
