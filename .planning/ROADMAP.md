# Roadmap: CineApp

## Overview

CineApp is built in four phases that follow the natural dependency chain of the product. The foundation must be solid before any feature is built: Firebase and TMDB must be configured and secured first. User identity (auth + profile) comes second, since review authorship depends on it. Media browsing comes third, giving guests a useful experience before login exists in the UI. The review system and detail pages come last — they are the core differentiator and depend on everything before them. Each phase delivers a self-contained, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Firebase + TMDB configured, secured, and ready for feature development (2026-03-08)
- [ ] **Phase 2: Auth and Profiles** - Users can register, log in, manage their profile, and delete their account
- [ ] **Phase 3: Media Browsing** - Guests and logged-in users can search, browse, filter, and sort movies and series
- [ ] **Phase 4: Detail and Reviews** - Users can view full media detail and submit, edit, and delete reviews with dual ratings

## Phase Details

### Phase 1: Foundation
**Goal**: The project infrastructure is secure and connected — Firebase Auth and Firestore are live, TMDB API is integrated, all environment keys are in place, and security rules prevent unauthorized access before any data is written.
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04
**Success Criteria** (what must be TRUE):
  1. The app builds and runs without errors with Firebase and AngularFire installed and configured in `app.config.ts`
  2. Firestore security rules are deployed and reject unauthenticated writes to user and review documents
  3. A TMDB API call returns Spanish-language results (verified via browser dev tools showing `language=es-ES` in request)
  4. All UI text appears in Spanish and no English placeholder strings are visible in the app shell
**Plans:** 2/2 plans executed

Plans:
- [x] 01-01-PLAN.md — Install Firebase, configure providers + emulators, create Firestore security rules
- [x] 01-02-PLAN.md — Create TMDB interceptor + image pipe, set up tab routing with Spanish UI shell

### Phase 2: Auth and Profiles
**Goal**: Users can create an account with a role, log in, stay logged in across sessions, log out from anywhere, manage their name and avatar, view their own reviews on their profile, and delete their account entirely.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. User can register with email, password, and a role selection (normal or critic) and is redirected to home on success
  2. User can log in with valid credentials and the session persists after a full browser refresh
  3. User can log out from any page and is redirected to the login or guest view
  4. User can update their display name and avatar on the profile page and see the changes reflected immediately
  5. User can delete their account and all their Firestore data (user document and reviews) is removed along with the Auth record
**Plans:** 1/3 plans executed

Plans:
- [ ] 02-01-PLAN.md — AuthService, UserService, auth guard, UserAvatar component, profile route protection
- [ ] 02-02-PLAN.md — Register page (email/password/role form) and Login page
- [ ] 02-03-PLAN.md — Profile page (display, edit mode, reviews list, logout, account deletion)

### Phase 3: Media Browsing
**Goal**: Any visitor (with or without an account) can see a list of movies and series on the home page, search by title, filter by genre, release date, and score, and sort by highest score or most recent — with TMDB data loaded via cache-first strategy.
**Depends on**: Phase 2
**Requirements**: BROW-01, BROW-02, BROW-03, BROW-04, BROW-05
**Success Criteria** (what must be TRUE):
  1. Guest (unauthenticated) user can open the app, see a populated home page list, and use search without being prompted to log in
  2. Searching for a movie title returns up to 20 results from TMDB, and a second identical search loads from Firestore cache (no TMDB network call visible in dev tools)
  3. User can filter the home list by genre, release date range, and score, and the list updates to match the selected criteria
  4. User can sort the home list by highest score and by most recent, and the order changes accordingly
**Plans**: TBD

### Phase 4: Detail and Reviews
**Goal**: Users can view the full detail page for any movie or series (including dual ratings and the review list), and logged-in users can submit one review per title, edit it, and delete it — with dual ratings recalculating automatically on every change.
**Depends on**: Phase 3
**Requirements**: DETL-01, DETL-02, DETL-03, REVW-01, REVW-02, REVW-03, REVW-04
**Success Criteria** (what must be TRUE):
  1. Tapping a movie or series opens a detail page showing title, poster, synopsis, release date, genres, and main cast
  2. Detail page shows two separate rating averages: one for normal users and one for critics, each labeled with the count of contributing reviews
  3. Review list on detail page shows each review's author name, role badge (normal/critic), score, and text
  4. Logged-in user can submit a review with a score (1-10) and text; submitting a second review to the same title is blocked
  5. User can edit their review and the dual rating averages update immediately to reflect the new score
  6. User can delete their review and the dual rating averages recalculate to exclude the deleted score

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-03-08 |
| 2. Auth and Profiles | 1/3 | In Progress|  |
| 3. Media Browsing | 0/TBD | Not started | - |
| 4. Detail and Reviews | 0/TBD | Not started | - |
