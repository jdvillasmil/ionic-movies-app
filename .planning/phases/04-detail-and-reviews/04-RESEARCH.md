# Phase 4: Detail and Reviews - Research

**Researched:** 2026-03-17
**Domain:** TMDB detail endpoints, Firestore subcollections, Firestore transactions for aggregate recalculation, Ionic form patterns for review submit/edit/delete
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DETL-01 | Tapping a movie or series opens a detail page showing title, poster, synopsis, release date, genres, and main cast | TMDB `GET /3/movie/{id}?append_to_response=credits` and `GET /3/tv/{id}?append_to_response=credits` return all required fields; normalize across movie/TV differences; `append_to_response` eliminates second HTTP call |
| DETL-02 | Detail page shows two separate rating averages: one for normal users and one for critics, each labeled with the count of contributing reviews | Firestore subcollection `media/{mediaId}/reviews/{userId}` queried with `getDocs` + client-side group-by `role`; or maintain summary doc in `media/{mediaId}` with `normalAvg`, `normalCount`, `criticAvg`, `criticCount` updated via `runTransaction` on every review write/delete |
| DETL-03 | Review list on detail page shows each review's author name, role badge (normal/critic), score, and text | `media/{mediaId}/reviews` subcollection documents must carry `authorName`, `role`, `score`, `text`; queried once per page load with `getDocs` ordered by `createdAt` |
| REVW-01 | Logged-in user can submit a review with a score (1-10) and text; submitting a second review to the same title is blocked | Document ID = `userId` enforces one-per-user at Firestore layer; Firestore security rules `isOwner(userId)` on write; UI checks `getDoc(media/{id}/reviews/{uid})` to determine if review already exists before showing form |
| REVW-02 | User can edit their review and the dual rating averages update immediately to reflect the new score | `setDoc(..., { merge: false })` replaces the review document; `runTransaction` on `media/{mediaId}` recalculates and writes new aggregates in the same atomic operation |
| REVW-03 | User can delete their review and the dual rating averages recalculate to exclude the deleted score | `deleteDoc(media/{mediaId}/reviews/{uid})` + `runTransaction` to re-fetch remaining reviews, recalculate, and write new aggregates atomically |
| REVW-04 | (Implicit from goal) Review list and dual averages are visible to both guests and logged-in users; only the review submission/edit/delete UI is gated on auth | Firestore rules: `media/{mediaId}/reviews/{userId}` reads `allow read: if true` (already in rules); no `authGuard` on the detail route |
</phase_requirements>

---

## Summary

Phase 4 completes the core product loop: detail pages pull rich TMDB data for any movie or series and surface the dual-perspective review system (normal user avg vs. critic avg) built on Firestore.

The TMDB detail endpoints — `GET /3/movie/{id}` and `GET /3/tv/{id}` — with `append_to_response=credits` return all fields required for DETL-01 in a single HTTP call. The response differences between movie and TV (e.g., `title` vs `name`, `release_date` vs `first_air_date`, genres as full objects rather than IDs) require a second normalization pass beyond what `MediaItem` already provides.

The dual-rating system (DETL-02, REVW-02, REVW-03) is the technically complex part. The project already decided that review document ID = `userId` — this is stored in `media/{mediaId}/reviews/{userId}` subcollections already reflected in `firestore.rules`. The key architectural decision is: **maintain a summary document** (`media/{mediaId}` root document) with pre-computed `normalAvg`, `normalCount`, `criticAvg`, `criticCount` updated via `runTransaction` on every review write/delete. This avoids querying all reviews on every page load just to compute averages, and eliminates the one-per-second write-rate concern because each media document's aggregate is only updated when its own reviews change.

**Primary recommendation:** Create a `ReviewService` that encapsulates all review CRUD + aggregate transaction logic. `MediaDetailPage` replaces the Phase 3 stub, calling `TmdbService` (extended with `getDetail`) and `ReviewService`. The media detail page is accessible to guests (no authGuard) — only the review form section is conditionally shown for authenticated users.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/fire/firestore` | ^20.0.1 (installed) | All Firestore operations: `getDoc`, `getDocs`, `setDoc`, `deleteDoc`, `docData`, `collection`, `runTransaction` | Already installed and established in project |
| `@ionic/angular/standalone` | ^8.0.0 (installed) | `IonRange`, `IonTextarea`, `IonButton`, `IonBadge`, `IonCard`, `IonChip`, `IonSpinner`, `AlertController`, `ToastController` | Already installed and established in project |
| `HttpClient` + `TmdbInterceptor` | Angular 20 (installed) | TMDB detail + credits API calls via existing interceptor | Already wired in project |
| `@angular/fire/auth` | ^20.0.1 (installed) | `AuthService.currentUser` and `user$` to gate review form | Already established in project |
| `rxjs` | ~7.8.0 (installed) | `combineLatest`, `switchMap`, `firstValueFrom`, `from` | Standard reactive patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `TmdbImagePipe` | project (installed) | Transform `poster_path` and `profile_path` to full URLs | Poster on detail page, cast avatars |
| `UserAvatarComponent` | project (installed) | Render reviewer avatar in review list | Can be reused in review cards if desired |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `runTransaction` for aggregate updates | Read all reviews at render-time and compute avg client-side | Simpler but reads entire subcollection on every page load; summary doc pattern is faster and scales |
| `runTransaction` for aggregate updates | Cloud Function triggers | Correct but requires deploying Cloud Functions infrastructure; overkill for this app size |
| `IonRange` for score input | Third-party star-rating component | `IonRange` is already installed, has min/max, works with `FormControl`; third-party components (ionic4-star-rating, etc.) target Ionic 4/5 and are not maintained for Ionic 8 |
| Subcollection `media/{id}/reviews/{uid}` | Root `reviews/{uid}` collection | Subcollection already declared in `firestore.rules`; scoped queries don't need composite indexes; rules can reference parent document |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   └── services/
│       ├── tmdb.service.ts          # Extended: add getDetail(id, mediaType)
│       └── review.service.ts        # NEW: review CRUD + aggregate transactions
├── media-detail/
│   └── media-detail.page.ts         # REPLACE stub with full implementation
└── shared/
    └── components/
        └── media-card/              # Unchanged from Phase 3
```

### Pattern 1: Firestore Data Structure for Reviews + Aggregates

**What:** Reviews stored as subcollection documents under `media/{mediaId}` with document ID = `userId`. A summary document at `media/{mediaId}` (root) holds pre-computed aggregate fields.

**Document paths:**
```
media/{mediaId}                          // Summary doc: normalAvg, normalCount, criticAvg, criticCount
media/{mediaId}/reviews/{userId}         // One per user. Already in firestore.rules.
```

**Review document shape:**
```typescript
interface ReviewDoc {
  userId: string;
  authorName: string;      // From UserProfile.displayName at time of submission
  role: 'normal' | 'critic';
  score: number;           // 1-10
  text: string;
  createdAt: number;       // Date.now()
  updatedAt: number;       // Date.now() on each edit
}
```

**Media summary document shape:**
```typescript
interface MediaSummary {
  normalCount: number;
  normalTotal: number;     // Sum of scores for normal users (avg = total/count)
  criticCount: number;
  criticTotal: number;     // Sum of scores for critics
}
// Computed: normalAvg = normalTotal / normalCount (or 0 if count === 0)
// Computed: criticAvg = criticTotal / criticCount (or 0 if count === 0)
```

**Why store total, not avg:** Recalculating avg on delete requires reading all remaining reviews, but storing `total` allows delta-based updates on add/edit (avoid re-reading all reviews). On delete, since the document being deleted is known before deletion, subtract its score from total, decrement count — no re-read needed.

### Pattern 2: ReviewService — CRUD with Aggregate Transactions

**What:** All review operations atomically update both the review document and the media summary document.

**When to use:** Any time a review is created, edited, or deleted.

```typescript
// Source: Firestore runTransaction pattern + project decisions
import {
  Firestore, doc, getDoc, setDoc, deleteDoc, getDocs,
  collection, orderBy, query, runTransaction
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private firestore = inject(Firestore);

  // GET: load all reviews for a media item (for display)
  async getReviews(mediaId: string): Promise<ReviewDoc[]> {
    const ref = collection(this.firestore, `media/${mediaId}/reviews`);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ReviewDoc);
  }

  // GET: check if current user already reviewed this media
  async getUserReview(mediaId: string, userId: string): Promise<ReviewDoc | null> {
    const ref = doc(this.firestore, `media/${mediaId}/reviews/${userId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as ReviewDoc) : null;
  }

  // GET: load media summary (for dual averages)
  async getMediaSummary(mediaId: string): Promise<MediaSummary | null> {
    const ref = doc(this.firestore, `media/${mediaId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as MediaSummary) : null;
  }

  // SUBMIT: create new review + update aggregate
  async submitReview(mediaId: string, review: ReviewDoc): Promise<void> {
    await runTransaction(this.firestore, async (tx) => {
      const summaryRef = doc(this.firestore, `media/${mediaId}`);
      const reviewRef = doc(this.firestore, `media/${mediaId}/reviews/${review.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing: MediaSummary = summarySnap.exists()
        ? (summarySnap.data() as MediaSummary)
        : { normalCount: 0, normalTotal: 0, criticCount: 0, criticTotal: 0 };

      // Add new review score to aggregate
      const updated = review.role === 'critic'
        ? { ...existing, criticCount: existing.criticCount + 1, criticTotal: existing.criticTotal + review.score }
        : { ...existing, normalCount: existing.normalCount + 1, normalTotal: existing.normalTotal + review.score };

      tx.set(summaryRef, updated);
      tx.set(reviewRef, review);
    });
  }

  // EDIT: update existing review + patch aggregate
  async editReview(mediaId: string, oldScore: number, updated: ReviewDoc): Promise<void> {
    await runTransaction(this.firestore, async (tx) => {
      const summaryRef = doc(this.firestore, `media/${mediaId}`);
      const reviewRef = doc(this.firestore, `media/${mediaId}/reviews/${updated.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing = summarySnap.data() as MediaSummary;

      // Replace old score with new score
      const scoreDelta = updated.score - oldScore;
      const patched = updated.role === 'critic'
        ? { ...existing, criticTotal: existing.criticTotal + scoreDelta }
        : { ...existing, normalTotal: existing.normalTotal + scoreDelta };

      tx.set(summaryRef, patched);
      tx.set(reviewRef, updated);
    });
  }

  // DELETE: remove review + update aggregate
  async deleteReview(mediaId: string, review: ReviewDoc): Promise<void> {
    await runTransaction(this.firestore, async (tx) => {
      const summaryRef = doc(this.firestore, `media/${mediaId}`);
      const reviewRef = doc(this.firestore, `media/${mediaId}/reviews/${review.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing = summarySnap.data() as MediaSummary;

      // Remove the deleted review score from aggregate
      const patched = review.role === 'critic'
        ? { ...existing, criticCount: existing.criticCount - 1, criticTotal: existing.criticTotal - review.score }
        : { ...existing, normalCount: existing.normalCount - 1, normalTotal: existing.normalTotal - review.score };

      tx.set(summaryRef, patched);
      tx.delete(reviewRef);
    });
  }
}
```

### Pattern 3: TMDB Detail with `append_to_response=credits`

**What:** A single TMDB call fetches full media details AND cast in one HTTP request. Movie and TV responses differ in field names and must be normalized.

**When to use:** On `MediaDetailPage` init, called once per page load.

```typescript
// Source: TMDB API v3 documentation — append_to_response pattern
// Extended TmdbService method
async getDetail(id: number, mediaType: 'movie' | 'tv'): Promise<MediaDetail> {
  const endpoint = mediaType === 'movie'
    ? `${this.BASE}/movie/${id}?append_to_response=credits`
    : `${this.BASE}/tv/${id}?append_to_response=credits`;

  const raw: any = await firstValueFrom(this.http.get<any>(endpoint));

  return {
    id: raw.id,
    mediaType,
    title: mediaType === 'tv' ? (raw.name ?? '') : (raw.title ?? ''),
    posterPath: raw.poster_path ?? null,
    overview: raw.overview ?? '',
    releaseDate: mediaType === 'tv' ? (raw.first_air_date ?? '') : (raw.release_date ?? ''),
    genres: (raw.genres ?? []).map((g: any) => g.name as string),
    cast: (raw.credits?.cast ?? [])
      .slice(0, 10)   // Top 10 cast members only
      .map((c: any) => ({
        name: c.name as string,
        character: c.character as string,
        profilePath: (c.profile_path ?? null) as string | null,
      })),
  };
}
```

**MediaDetail interface:**
```typescript
export interface CastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MediaDetail {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  overview: string;
  releaseDate: string;     // YYYY-MM-DD
  genres: string[];        // Full names (not IDs)
  cast: CastMember[];      // Top 10 only
}
```

**Note:** TMDB detail endpoints return `genres` as `[{ id: number, name: string }]` — not just IDs like list endpoints. Map to `string[]` of names for display.

### Pattern 4: MediaDetailPage — Replace Stub, Keep Route

**What:** The Phase 3 stub at `src/app/media-detail/media-detail.page.ts` is replaced in-place. The route `/tabs/media/:mediaType/:id` in `tabs.routes.ts` is unchanged.

**Key behaviors:**
- Page reads `mediaType` and `id` from `ActivatedRoute.snapshot.paramMap` (already done in stub)
- On init: fetch TMDB detail (cache-first optional — acceptable to skip cache here, detail pages are low-traffic) and fetch all reviews
- Auth-conditional section: if `AuthService.currentUser` exists, check for existing review; show submit form (no existing review) or edit/delete controls (existing review found)
- Guest sees reviews list and dual averages but no form

**Auth in template (not a guard — detail page is public):**
```typescript
// In component — use currentUser directly, not async pipe, for simplicity
get isLoggedIn(): boolean {
  return this.authService.currentUser !== null;
}
```

### Pattern 5: Dual Rating Display

**What:** Read `MediaSummary` from `media/{mediaId}`, compute averages in the component, render two labeled score sections.

```typescript
// In MediaDetailPage
get normalAvg(): number {
  if (!this.summary || this.summary.normalCount === 0) return 0;
  return Math.round((this.summary.normalTotal / this.summary.normalCount) * 10) / 10;
}

get criticAvg(): number {
  if (!this.summary || this.summary.criticCount === 0) return 0;
  return Math.round((this.summary.criticTotal / this.summary.criticCount) * 10) / 10;
}
```

**Template structure (illustrative):**
```html
<!-- Dual ratings bar -->
<div class="ratings-row">
  <div class="rating-block">
    <span class="rating-label">Usuarios</span>
    <span class="rating-score">{{ normalAvg | number:'1.1-1' }}</span>
    <span class="rating-count">({{ summary?.normalCount ?? 0 }} reseñas)</span>
  </div>
  <div class="rating-block">
    <span class="rating-label">Críticos</span>
    <span class="rating-score">{{ criticAvg | number:'1.1-1' }}</span>
    <span class="rating-count">({{ summary?.criticCount ?? 0 }} reseñas)</span>
  </div>
</div>
```

### Pattern 6: Review Form with IonRange (1-10 Score)

**What:** Use `IonRange` for numeric score input (1-10) and `IonTextarea` for review text. Bind both to a `FormGroup`.

**Rationale for IonRange over star components:** Third-party star-rating packages for Ionic (ionic4-star-rating, ionic-rating-component) target Ionic 4/5 and are not maintained for Ionic 8. `IonRange` is built into the already-installed `@ionic/angular` and supports min/max.

```typescript
reviewForm = new FormGroup({
  score: new FormControl(5, { validators: [Validators.min(1), Validators.max(10)], nonNullable: true }),
  text: new FormControl('', { validators: [Validators.required, Validators.minLength(1)], nonNullable: true }),
});
```

```html
<ion-item lines="none">
  <ion-label>Puntuación: {{ reviewForm.controls.score.value }}/10</ion-label>
  <ion-range
    [formControl]="reviewForm.controls.score"
    [min]="1"
    [max]="10"
    [step]="1"
    [ticks]="true"
    [snaps]="true"
    slot="end"
  ></ion-range>
</ion-item>
<ion-item lines="none">
  <ion-textarea
    [formControl]="reviewForm.controls.text"
    placeholder="Escribe tu reseña..."
    [rows]="4"
    autoGrow="true"
  ></ion-textarea>
</ion-item>
```

### Anti-Patterns to Avoid

- **Computing averages by querying all reviews at render-time:** Reads the entire subcollection on each page load. Instead use the pre-computed summary document — it's a single `getDoc` call.
- **Using `setDoc` without `runTransaction` for aggregate updates:** Race condition when two users submit at the same time — one write overwrites the other's aggregate update. Always use `runTransaction`.
- **Deleting review without updating aggregate:** Summary document becomes permanently incorrect. Always pair review delete with transaction that decrements count and total.
- **Showing the review form to guests:** Gate the form with `*ngIf="isLoggedIn"`. Show a "Log in to review" prompt instead.
- **Allowing a second review submission:** The document ID = `userId` at the Firestore layer prevents silent overwrite, but the Firestore write will fail. Pre-check with `getUserReview()` to give a user-friendly message and hide the form for users who already reviewed.
- **Not passing `role` on review submission:** The `role` must be read from `UserProfile` (Firestore `users/{uid}` doc), not from `AuthService.currentUser` — Firebase Auth does not store custom user roles.
- **Caching TMDB detail responses:** The existing `cacheFirst` is designed for lists. Detail pages have unique IDs and benefit less from caching; acceptable to call TMDB directly here (one call per page visit). Adding detail to the cache is optional and the planner can defer it.

---

## TMDB API Reference for Phase 4

### Detail Endpoints

| Endpoint | Response Key Differences | Notes |
|----------|-------------------------|-------|
| `GET /3/movie/{id}?append_to_response=credits` | `title`, `release_date`, `genres[].name` | genres array is full objects (id + name) |
| `GET /3/tv/{id}?append_to_response=credits` | `name`, `first_air_date`, `genres[].name` | Same genres structure; credits under `credits.cast[]` |

### Credits Response Shape (both movie and TV)

The `credits.cast` array is sorted by `order` (ascending, 0 = top billed). Each cast member:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Actor's real name |
| `character` | string | Character name |
| `profile_path` | string \| null | Actor photo path (use `TmdbImagePipe` with `w185`) |
| `order` | number | Billing order (0 = top billed) |

**Recommendation:** Slice to top 10 (`cast.slice(0, 10)`) — full cast can be 100+ members; detail page only needs main cast.

### TV vs. Movie Field Normalization (Detail Page)

| Movie Field | TV Field | Normalized Name | Notes |
|-------------|----------|-----------------|-------|
| `title` | `name` | `title` | |
| `release_date` | `first_air_date` | `releaseDate` | Both YYYY-MM-DD |
| `genres[].name` | `genres[].name` | `genres` (string[]) | Same structure |
| `overview` | `overview` | `overview` | Same |
| `poster_path` | `poster_path` | `posterPath` | Same |
| `credits.cast` | `credits.cast` | `cast` | Same after append_to_response |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TMDB detail + credits fetch | Separate HTTP calls for details and credits | `append_to_response=credits` on single detail call | One HTTP call vs. two; interceptor already handles auth/language |
| Average calculation across review roles | Cloud Function or background job | Client-side `total/count` math using `MediaSummary` doc fields | No infrastructure needed; summary doc updated atomically with each review write |
| One-review-per-user enforcement | Application-level duplicate check | Document ID = `userId` in Firestore subcollection + `isOwner(userId)` security rule | Already decided at project level; Firestore write fails on duplicate |
| Score range input | Custom range component | `IonRange` with `[min]="1" [max]="10" [snaps]="true"` | Already installed, handles touch/keyboard, works with `FormControl` |
| TMDB image URLs | Custom URL builder | `TmdbImagePipe` (already exists) with `w500` for poster, `w185` for cast avatars | Already implemented in Phase 1 |

**Key insight:** The one-review-per-user rule is enforced at two layers: Firestore security rules (`isOwner(userId)`) and document-ID uniqueness. The UI check (`getUserReview`) is a UX layer only — it prevents confusing error messages.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Read `role` from Firestore, Not from Firebase Auth
**What goes wrong:** `this.authService.currentUser.role` — `User` from Firebase Auth has no custom `role` field. TypeScript won't catch this; it returns `undefined` at runtime.
**Why it happens:** Firebase Auth stores basic identity fields only (`uid`, `email`, `displayName`). Custom fields (like `role`) live in the Firestore `users/{uid}` document.
**How to avoid:** Always `getUserDoc(uid)` from `UserService` to get the `UserProfile` with `role` before submitting a review.
**Warning signs:** Reviews submitted with `role: undefined` cause aggregate grouping to fail silently.

### Pitfall 2: Transaction Reads Before All Writes
**What goes wrong:** Calling `tx.set()` or `tx.update()` before `tx.get()` in a Firestore transaction throws a runtime error: "Firestore transactions require all reads to be executed before all writes."
**Why it happens:** Firestore transactions enforce read-then-write ordering.
**How to avoid:** In the `runTransaction` callback, always do all `tx.get()` calls first, then all `tx.set()`/`tx.delete()` calls after. See Pattern 2 code above.
**Warning signs:** `FirebaseError: 11 OUT_OF_RANGE: All writes must come after all reads in a Firestore transaction.`

### Pitfall 3: `append_to_response` Ignored by Interceptor's `HttpParams`
**What goes wrong:** The `TmdbInterceptor` adds its own `HttpParams`. If the detail call also adds `HttpParams`, they may collide.
**Why it happens:** `HttpParams` is immutable — creating a new instance doesn't merge with the interceptor's params.
**How to avoid:** Pass `append_to_response` as a query string in the URL itself (not via `HttpParams`). The interceptor only appends `language` and `api_key`, it does not strip existing query params from the URL string.
**Implementation:** `GET /3/movie/${id}?append_to_response=credits` as a plain URL string. The interceptor will add its params alongside.

### Pitfall 4: Summary Document Not Initialized on First Review
**What goes wrong:** When the first review is submitted for a media item, `media/{mediaId}` doesn't exist yet. `runTransaction` reads `summarySnap.exists()` as `false`. If the code does `summarySnap.data()` without an existence check, it returns `undefined` and property access throws.
**Why it happens:** Firestore documents don't auto-create; they only exist after the first write.
**How to avoid:** In the transaction callback, always default to zero values when `summarySnap.exists()` is false (see Pattern 2 code above).
**Warning signs:** `TypeError: Cannot read properties of undefined` on first review submission.

### Pitfall 5: Profile Page Review List Uses Wrong Collection Path
**What goes wrong:** The `ProfilePage` currently queries `collection(firestore, 'reviews')` with `where('userId', '==', uid)`. This is a flat `reviews` root collection — but Phase 4 stores reviews in `media/{mediaId}/reviews/{userId}` subcollections. These are different paths.
**Why it happens:** The profile page was written in Phase 2 with a placeholder `reviews` root collection. Phase 4 changes the schema.
**How to avoid:** Use a **collection group query** in the profile page. `collectionGroup(firestore, 'reviews')` + `where('userId', '==', uid)` queries across all `reviews` subcollections. This requires a Firestore composite index for `collectionGroup`.
**Resolution:** Either update `ProfilePage.loadReviews()` to use `collectionGroup`, or add a denormalized flat `reviews` collection in parallel. **Recommendation: use `collectionGroup`** — Firestore supports this natively and it aligns with the subcollection data model.
**Warning signs:** Profile page shows 0 reviews even after submitting through the detail page.

### Pitfall 6: Firestore Security Rules — `collectionGroup` Needs Explicit Rule
**What goes wrong:** `collectionGroup` queries require a matching security rule at the collection group level. The current `firestore.rules` only covers `match /media/{mediaId}/reviews/{userId}` — this does NOT automatically allow collection group reads.
**Why it happens:** Firestore security rules for collection groups use a different syntax.
**How to avoid:** Add a collection group rule:
```
match /{path=**}/reviews/{userId} {
  allow read: if true;
  allow write: if isOwner(userId);
}
```
This must be added alongside (or replace) the subcollection-specific rule in `firestore.rules`.
**Warning signs:** Profile page throws `FirebaseError: Missing or insufficient permissions` when querying reviews after Phase 4.

### Pitfall 7: `IonRange` Value Type with FormControl
**What goes wrong:** `IonRange` fires `ionChange` with a `CustomEvent` whose `detail.value` is an object `{ lower, upper }` when using dual-knob mode, or a plain number for single-knob. If the `FormControl` receives the event object instead of the number, the score stores as `[object Object]`.
**Why it happens:** Using `(ionChange)` event binding directly instead of `formControlName`/`[formControl]`.
**How to avoid:** Use `[formControl]` binding directly on `ion-range`. Do NOT use `(ionChange)` for FormControl updates. The Ionic 8 `IonRange` correctly propagates numeric values through `ControlValueAccessor` when bound via `[formControl]`.

---

## Code Examples

Verified patterns from official sources and established project patterns:

### ReviewService Submit (complete runTransaction)
```typescript
// Source: Firestore runTransaction docs + project patterns
async submitReview(mediaId: string, review: ReviewDoc): Promise<void> {
  await runTransaction(this.firestore, async (tx) => {
    const summaryRef = doc(this.firestore, `media/${mediaId}`);
    const reviewRef = doc(this.firestore, `media/${mediaId}/reviews/${review.userId}`);

    // ALL reads before writes (Firestore requirement)
    const summarySnap = await tx.get(summaryRef);

    const existing: MediaSummary = summarySnap.exists()
      ? (summarySnap.data() as MediaSummary)
      : { normalCount: 0, normalTotal: 0, criticCount: 0, criticTotal: 0 };

    const updated: MediaSummary = review.role === 'critic'
      ? { ...existing, criticCount: existing.criticCount + 1, criticTotal: existing.criticTotal + review.score }
      : { ...existing, normalCount: existing.normalCount + 1, normalTotal: existing.normalTotal + review.score };

    // ALL writes after reads
    tx.set(summaryRef, updated);
    tx.set(reviewRef, review);
  });
}
```

### MediaDetailPage Init
```typescript
// Source: established project patterns (inject, ActivatedRoute, standalone)
export class MediaDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private tmdbService = inject(TmdbService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  mediaType = this.route.snapshot.paramMap.get('mediaType') as 'movie' | 'tv';
  id = Number(this.route.snapshot.paramMap.get('id'));

  detail: MediaDetail | null = null;
  summary: MediaSummary | null = null;
  reviews: ReviewDoc[] = [];
  userReview: ReviewDoc | null = null;
  currentProfile: UserProfile | undefined;
  isLoading = true;

  async ngOnInit(): Promise<void> {
    const mediaId = `${this.mediaType}_${this.id}`;
    const [detail, summary, reviews] = await Promise.all([
      this.tmdbService.getDetail(this.id, this.mediaType),
      this.reviewService.getMediaSummary(mediaId),
      this.reviewService.getReviews(mediaId),
    ]);
    this.detail = detail;
    this.summary = summary;
    this.reviews = reviews;

    const uid = this.authService.currentUser?.uid;
    if (uid) {
      this.userReview = await this.reviewService.getUserReview(mediaId, uid);
      this.currentProfile = await firstValueFrom(this.userService.getUserDoc(uid));
    }
    this.isLoading = false;
  }

  get isLoggedIn(): boolean {
    return this.authService.currentUser !== null;
  }
}
```

**Note on `mediaId` composite key:** Use `${mediaType}_${id}` (e.g., `movie_550`, `tv_1396`) as the Firestore document ID for the `media` collection. This avoids collisions between TMDB movie ID 550 and TV ID 550.

### Collection Group Query for Profile Page (fix existing code)
```typescript
// Source: Firestore collectionGroup docs
// Replace the existing getDocs query in profile.page.ts
import { collectionGroup, query, where, getDocs } from '@angular/fire/firestore';

private async loadReviews(uid: string): Promise<void> {
  try {
    const reviewsRef = collectionGroup(this.firestore, 'reviews');
    const reviewsQuery = query(reviewsRef, where('userId', '==', uid));
    const snapshot = await getDocs(reviewsQuery);
    this.reviews = snapshot.docs.map((d) => d.data() as ReviewPreview);
  } catch {
    this.reviews = [];
  }
}
```

---

## Firestore Rules Update Required

The existing `firestore.rules` already covers `media/{mediaId}/reviews/{userId}`, but needs:
1. A collection group rule for the profile page query
2. Verify `media/{mediaId}` (summary document) allows read for guests and write for authenticated users

**Current rules (from Phase 1):**
```
match /media/{mediaId} {
  allow read: if true;
  allow write: if isAuthenticated();

  match /reviews/{userId} {
    allow read: if true;
    allow write: if isOwner(userId);
  }
}
```

**Required addition for collection group:**
```
// Collection group rule — enables collectionGroup('reviews') queries from profile page
match /{path=**}/reviews/{userId} {
  allow read: if true;
  allow write: if isOwner(userId);
}
```

**Impact:** Add this rule to `firestore.rules` in Wave 0 / first plan of Phase 4.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cloud Functions for aggregate recalculation | Client-side `runTransaction` on summary doc | Firestore transactions became reliable for client-side use cases (Firebase 9+) | No Cloud Function deployment needed |
| `firebase/compat` Firestore | Modular `@angular/fire/firestore` functions | AngularFire v7 / Firebase v9 | Already adopted in project; `runTransaction` from modular SDK is `import { runTransaction } from '@angular/fire/firestore'` |
| Star-rating third-party packages | Built-in `IonRange` with snaps | Ionic 8 | Old packages (ionic4-star-rating) are not maintained for Ionic 8 |
| Querying all reviews to compute averages | Pre-computed summary document updated by transaction | Best practice since 2020 | Eliminates full-collection reads on every page load |

**Deprecated/outdated:**
- `firebase/compat` imports: use modular SDK only (already done in project)
- Third-party Ionic star-rating packages (ionic4-star-rating, ionic-rating-component): last maintained for Ionic 4/5 — not compatible with Ionic 8 standalone components

---

## Open Questions

1. **Should TMDB detail responses be cached in Firestore?**
   - What we know: The existing `cacheFirst` pattern in `TmdbService` works for list endpoints. Detail pages have high cardinality (unique IDs) and are typically viewed once per session.
   - What's unclear: Whether users frequently re-visit the same detail page within the 30-minute cache window.
   - Recommendation: Skip detail caching in Phase 4. Add one TMDB call per detail page visit. This keeps the implementation simpler and the cache doesn't provide meaningful benefit for single-item lookups. The planner can add it as a stretch task if desired.

2. **`mediaId` composite key format**
   - What we know: TMDB movie IDs and TV IDs can collide (e.g., a movie and a TV show can both have ID 550). The `media` collection uses `mediaId` as document ID.
   - What's unclear: Whether the project has any convention for this.
   - Recommendation: Use `${mediaType}_${id}` (e.g., `movie_550`, `tv_1396`) as the Firestore document ID. This must be consistent across `ReviewService` and `MediaDetailPage`.

3. **Profile page `loadReviews` migration**
   - What we know: `ProfilePage.loadReviews` queries a flat `reviews` root collection. Phase 4 uses subcollection `media/{mediaId}/reviews/{userId}`. These are different paths.
   - What's unclear: Whether the planner treats this as a bug fix in Phase 4 or defers it.
   - Recommendation: Fix in Wave 0 of Phase 4 — change to `collectionGroup('reviews')` + update `firestore.rules`. The profile page will show 0 reviews if this is not updated.

4. **`runTransaction` import source in @angular/fire v20**
   - What we know: The project uses `@angular/fire@20.0.1` with modular SDK. `runTransaction` is in `@angular/fire/firestore`.
   - What's unclear: Exact import path not confirmed in project codebase (Phase 3 didn't use transactions).
   - Recommendation: Use `import { runTransaction } from '@angular/fire/firestore'` — matches all other `@angular/fire/firestore` modular imports already in `user.service.ts` and `tmdb.service.ts`. Confidence: HIGH based on AngularFire v7+ modular API consistency.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jasmine + Karma (karma-jasmine ~5.1.0, karma-chrome-launcher ~3.2.0) |
| Config file | `karma.conf.js` (root) |
| Quick run command | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` |
| Full suite command | `ng test --watch=false --browsers=ChromeHeadless` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DETL-01 | `getDetail()` normalizes movie fields (title, releaseDate, genres, cast) | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/tmdb.service.spec.ts` | ✅ (extend existing) |
| DETL-01 | `getDetail()` normalizes TV fields (name→title, first_air_date→releaseDate) | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/tmdb.service.spec.ts` | ✅ (extend existing) |
| DETL-02 | `normalAvg` and `criticAvg` computed correctly from MediaSummary | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/media-detail/media-detail.page.spec.ts` | ❌ Wave 0 |
| DETL-03 | `getReviews()` returns reviews ordered by `createdAt` desc | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` | ❌ Wave 0 |
| REVW-01 | `submitReview()` writes review doc + updates summary with correct count/total | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` | ❌ Wave 0 |
| REVW-01 | `getUserReview()` returns `null` when no review exists | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` | ❌ Wave 0 |
| REVW-02 | `editReview()` updates summary totalScore delta only (not full recompute) | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` | ❌ Wave 0 |
| REVW-03 | `deleteReview()` decrements count and total in summary | unit | `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/review.service.spec.ts`
- **Per wave merge:** `ng test --watch=false --browsers=ChromeHeadless`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/core/services/review.service.spec.ts` — covers DETL-03, REVW-01, REVW-02, REVW-03 (CRUD + transaction aggregates); use spy pattern from `TestableTmdbService` — create `TestableReviewService` subclass with Firestore overrides
- [ ] `src/app/media-detail/media-detail.page.spec.ts` — covers DETL-02 (dual avg computation from summary), DETL-01 (detail loaded and rendered)
- [ ] Update `src/app/core/services/tmdb.service.spec.ts` — add tests for `getDetail()` method once implemented
- [ ] `firestore.rules` — add collection group rule for `reviews` before review queries work from profile page

---

## Sources

### Primary (HIGH confidence)
- TMDB official API docs (developer.themoviedb.org/reference/movie-details) — movie detail endpoint fields
- TMDB official API docs (developer.themoviedb.org/reference/tv-series-details) — TV detail endpoint fields
- TMDB official API docs (developer.themoviedb.org/docs/append-to-response) — `append_to_response` parameter mechanics
- TMDB community docs — cast array fields: `name`, `character`, `profile_path`, `order`
- Firebase official docs (firebase.google.com/docs/firestore/manage-data/transactions) — `runTransaction` pattern, reads-before-writes requirement
- Firebase official docs (firebase.google.com/docs/firestore/solutions/aggregation) — write-time aggregation with summary documents
- Project codebase — `firestore.rules`, `user.service.ts`, `tmdb.service.ts`, `profile.page.ts`, `tabs.routes.ts` read directly

### Secondary (MEDIUM confidence)
- WebSearch cross-verified — TMDB `credits.cast` array field names (`name`, `character`, `profile_path`, `order`) — multiple TMDB community sources agree
- WebSearch cross-verified — Firestore `collectionGroup` query requires explicit security rule at `/{path=**}/collectionName/{docId}`
- WebSearch — Ionic `IonRange` as preferred 1-10 score input (third-party star packages verified as Ionic 4/5 only)

### Tertiary (LOW confidence)
- None — all key findings have multiple source verification

---

## Metadata

**Confidence breakdown:**
- TMDB API endpoints and fields: HIGH — confirmed from official TMDB docs and multiple community sources
- Firestore transaction pattern: HIGH — confirmed from Firebase official docs; `runTransaction` semantics are stable
- Aggregate summary document approach: HIGH — Firebase official recommendation for write-time aggregations
- Collection group query + rules: MEDIUM — pattern verified from Firebase docs; exact AngularFire v20 import path inferred from consistency with existing project imports
- `IonRange` for score: HIGH — part of `@ionic/angular` already installed; third-party alternatives verified as incompatible with Ionic 8
- Profile page migration (`collectionGroup`): HIGH — required consequence of subcollection data model decision

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (TMDB v3 stable; Firestore transactions stable; Ionic 8 stable)
