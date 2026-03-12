---
phase: 02-auth-and-profiles
plan: "01"
subsystem: auth
tags: [firebase-auth, firestore, angular-fire, rxjs, guards, standalone-components]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Firebase project configured, @angular/fire@20.0.1 installed, provideAuth/provideFirestore in main.ts
provides:
  - AuthService with user$ observable and full auth lifecycle (register, login, logout, updateDisplayName, deleteCurrentUser)
  - UserService with Firestore CRUD and writeBatch delete (createUserDoc, getUserDoc, updateUserDoc, deleteUserAndReviews)
  - authGuard functional CanActivateFn using user() to avoid null-on-startup race condition
  - UserAvatarComponent standalone with initials fallback using deterministic HSL color hash
  - Profile route protected by authGuard in tabs.routes.ts
affects: [03-movie-discovery, 04-reviews-and-ratings, 02-02, 02-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modular Firebase SDK only — all imports from @angular/fire/auth and @angular/fire/firestore (no compat)"
    - "Functional CanActivateFn guard pattern — class-based guards avoided (deprecated since Angular 14)"
    - "user() instead of authState() in guard — avoids null-on-startup before Firebase session restore"
    - "defer() wrapping Firestore calls in UserService — defers Firebase validation to subscription time"
    - "deleteUserAndReviews: Firestore batch delete BEFORE Auth delete (security rules rely on auth)"
    - "from(Promise.reject()) for error Observables — errors surface on subscribe, not at construction"

key-files:
  created:
    - src/app/core/services/auth.service.ts
    - src/app/core/services/auth.service.spec.ts
    - src/app/core/services/user.service.ts
    - src/app/core/services/user.service.spec.ts
    - src/app/core/guards/auth.guard.ts
    - src/app/core/guards/auth.guard.spec.ts
    - src/app/shared/components/user-avatar/user-avatar.component.ts
  modified:
    - src/app/tabs/tabs.routes.ts

key-decisions:
  - "Used user() (not authState()) in authGuard to prevent redirect on initial null emit before Firebase restores session"
  - "deleteUserAndReviews deletes Firestore data before Auth record — Firestore security rules require authenticated user"
  - "UserAvatarComponent uses NgStyle for inline styling — no external SCSS needed for a utility component"
  - "defer() wraps Firestore calls so Firebase type validation happens at subscription time, not Observable construction"

patterns-established:
  - "Auth mock pattern: _delegate property required for @angular/fire's getModularInstance() resolution in tests"
  - "UserService methods return Observable via defer() — lazy Firebase invocation"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01, PROF-02, PROF-03]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 2 Plan 1: Auth and Data Services Summary

**Firebase Auth wrapper (AuthService), Firestore user CRUD (UserService), functional authGuard using user() to avoid null-on-startup, and standalone UserAvatarComponent with deterministic HSL initials — all tested with 25 passing unit tests.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T13:36:16Z
- **Completed:** 2026-03-12T13:41:10Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- AuthService: injectable with user$ Observable (authState), register/login/logout/updateDisplayName/deleteCurrentUser all return Observable<void>
- UserService: createUserDoc/getUserDoc/updateUserDoc/deleteUserAndReviews with writeBatch for atomic multi-doc deletion
- authGuard: functional CanActivateFn using user() (not authState()) to handle Firebase session restore race condition
- UserAvatarComponent: standalone, renders initials in a deterministic HSL-hashed color circle, or <img> when avatarUrl provided
- Profile tab route protected by authGuard in tabs.routes.ts
- All 25 unit tests green, build clean

## Task Commits

Each task was committed atomically:

1. **Task 1: AuthService, UserService, and auth guard** - `fbc1a05` (feat)
2. **Task 2: UserAvatar component and profile route guard wiring** - `b491bab` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 followed TDD — RED (tests written without implementation, build/test failed), then GREEN (implementations written, 25 tests pass)._

## Files Created/Modified

- `src/app/core/services/auth.service.ts` - Firebase Auth wrapper with user$ observable and all auth operations
- `src/app/core/services/auth.service.spec.ts` - 11 unit tests covering all public methods
- `src/app/core/services/user.service.ts` - Firestore CRUD service with UserProfile interface
- `src/app/core/services/user.service.spec.ts` - 11 unit tests covering all methods and UserProfile interface
- `src/app/core/guards/auth.guard.ts` - Functional authGuard redirecting to /login on null user
- `src/app/core/guards/auth.guard.spec.ts` - 3 unit tests for guard existence and behavior
- `src/app/shared/components/user-avatar/user-avatar.component.ts` - Standalone avatar with initials fallback
- `src/app/tabs/tabs.routes.ts` - Profile route now protected with canActivate: [authGuard]

## Decisions Made

- Used `user()` from @angular/fire/auth (not `authState()`) in authGuard — `authState()` emits null before Firebase restores the session from IndexedDB/localStorage, which would redirect logged-in users to /login on app reload
- `deleteUserAndReviews` deletes Firestore data before the Auth record — Firestore security rules check authentication, so deleting the Auth record first would cause permission errors on the subsequent Firestore delete
- Wrapped Firestore calls in `defer()` — Firebase's modular SDK validates the Firestore instance at call time; `defer()` defers that to subscription time, enabling proper unit testing with lightweight mocks
- `UserAvatarComponent` uses only `@angular/core` + Angular common directives — no Ionic imports, keeping it a pure utility component usable anywhere

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mock structure for @angular/fire's getModularInstance()**
- **Found during:** Task 1 (TDD GREEN phase — test run)
- **Issue:** Firebase auth functions like `signOut(auth)` call `getModularInstance(auth)` internally, which resolves `auth._delegate`. A plain mock object without `_delegate` caused `signOut is not a function` errors in tests.
- **Fix:** Updated `makeAuthMock()` factory to include `_delegate` with all required method spies and `_getRecaptchaConfig`. Also added `_getRecaptchaConfig` directly on the mock object to satisfy internal Firebase recaptcha checks.
- **Files modified:** `src/app/core/services/auth.service.spec.ts`
- **Verification:** 25/25 tests pass
- **Committed in:** fbc1a05 (Task 1 commit)

**2. [Rule 1 - Bug] Used defer() in UserService to defer Firebase Firestore validation**
- **Found during:** Task 1 (TDD GREEN phase — test run)
- **Issue:** `from(setDoc(doc(firestore, path), data))` calls `doc(firestore, ...)` immediately at Observable construction time. Firebase validates the Firestore instance synchronously, causing test failures when using a mock Firestore.
- **Fix:** Wrapped all Firestore operations in `defer(() => ...)` so the Firebase calls happen at subscription time, not construction time.
- **Files modified:** `src/app/core/services/user.service.ts`
- **Verification:** 25/25 tests pass, build clean
- **Committed in:** fbc1a05 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed test assertions for no-auth error scenarios**
- **Found during:** Task 1 (TDD GREEN phase — test run)
- **Issue:** Tests checking `typeof result.subscribe === 'function'` for `updateDisplayName()` and `deleteCurrentUser()` with no auth caused unhandled promise rejection warnings (not failures, but noisy). Tests also didn't verify the error message.
- **Fix:** Changed tests to subscribe with `error` handler and assert `err.message === 'No authenticated user'`.
- **Files modified:** `src/app/core/services/auth.service.spec.ts`
- **Verification:** 25/25 tests pass
- **Committed in:** fbc1a05 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes were test infrastructure corrections. Production implementation behavior unchanged. No scope creep.

## Issues Encountered

None beyond the auto-fixed test mock issues documented above.

## Next Phase Readiness

- AuthService, UserService, and authGuard are ready for Plan 02-02 (register/login pages) and 02-03 (profile page)
- UserAvatarComponent ready for use in profile page header
- All Phase 2 page plans can import from the established service/guard artifacts
- No blockers

---
*Phase: 02-auth-and-profiles*
*Completed: 2026-03-12*
