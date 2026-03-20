import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  runTransaction,
} from '@angular/fire/firestore';

export interface ReviewDoc {
  userId: string;
  authorName: string;
  role: 'normal' | 'critic';
  score: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserReview extends ReviewDoc {
  mediaId: string;
}

export interface MediaSummary {
  normalCount: number;
  normalTotal: number;
  criticCount: number;
  criticTotal: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private firestore = inject(Firestore);

  async getReviews(mediaId: string): Promise<ReviewDoc[]> {
    const docs = await this.getDocsSnap(`media/${mediaId}/reviews`);
    return docs.map((d) => d.data() as ReviewDoc);
  }

  async getUserReview(mediaId: string, userId: string): Promise<ReviewDoc | null> {
    const snap = await this.getDocSnap(`media/${mediaId}/reviews/${userId}`);
    return snap.exists() ? (snap.data() as ReviewDoc) : null;
  }

  async getUserReviews(uid: string): Promise<UserReview[]> {
    try {
      const q = query(collectionGroup(this.firestore, 'reviews'), where('userId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        ...(d.data() as ReviewDoc),
        mediaId: d.ref.parent.parent?.id ?? '',
      }));
    } catch {
      return [];
    }
  }

  async getMediaSummary(mediaId: string): Promise<MediaSummary | null> {
    const snap = await this.getDocSnap(`media/${mediaId}`);
    return snap.exists() ? (snap.data() as MediaSummary) : null;
  }

  async submitReview(mediaId: string, review: ReviewDoc): Promise<void> {
    await this.runTx(async (tx) => {
      const summaryRef = this.makeRef(`media/${mediaId}`);
      const reviewRef = this.makeRef(`media/${mediaId}/reviews/${review.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing: MediaSummary = summarySnap.exists()
        ? (summarySnap.data() as MediaSummary)
        : { normalCount: 0, normalTotal: 0, criticCount: 0, criticTotal: 0 };

      const updated: MediaSummary =
        review.role === 'critic'
          ? {
              ...existing,
              criticCount: existing.criticCount + 1,
              criticTotal: existing.criticTotal + review.score,
            }
          : {
              ...existing,
              normalCount: existing.normalCount + 1,
              normalTotal: existing.normalTotal + review.score,
            };

      tx.set(summaryRef, updated);
      tx.set(reviewRef, review);
    });
  }

  async editReview(mediaId: string, oldScore: number, updated: ReviewDoc): Promise<void> {
    await this.runTx(async (tx) => {
      const summaryRef = this.makeRef(`media/${mediaId}`);
      const reviewRef = this.makeRef(`media/${mediaId}/reviews/${updated.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing = summarySnap.data() as MediaSummary;

      const scoreDelta = updated.score - oldScore;
      const patched: MediaSummary =
        updated.role === 'critic'
          ? { ...existing, criticTotal: existing.criticTotal + scoreDelta }
          : { ...existing, normalTotal: existing.normalTotal + scoreDelta };

      tx.set(summaryRef, patched);
      tx.set(reviewRef, updated);
    });
  }

  async deleteReview(mediaId: string, review: ReviewDoc): Promise<void> {
    await this.runTx(async (tx) => {
      const summaryRef = this.makeRef(`media/${mediaId}`);
      const reviewRef = this.makeRef(`media/${mediaId}/reviews/${review.userId}`);
      const summarySnap = await tx.get(summaryRef);
      const existing = summarySnap.data() as MediaSummary;

      const patched: MediaSummary =
        review.role === 'critic'
          ? {
              ...existing,
              criticCount: existing.criticCount - 1,
              criticTotal: existing.criticTotal - review.score,
            }
          : {
              ...existing,
              normalCount: existing.normalCount - 1,
              normalTotal: existing.normalTotal - review.score,
            };

      tx.set(summaryRef, patched);
      tx.delete(reviewRef);
    });
  }

  // Protected methods — overridable in tests without needing a real Firestore instance

  protected makeRef(path: string): any {
    const ref = doc(this.firestore, path);
    // Attach __path__ for test spy lookup
    (ref as any).__path__ = path;
    return ref;
  }

  protected async runTx(fn: (tx: any) => Promise<void>): Promise<void> {
    await runTransaction(this.firestore, fn);
  }

  protected async getDocSnap(path: string): Promise<any> {
    const ref = doc(this.firestore, path);
    return getDoc(ref);
  }

  protected async getDocsSnap(collectionPath: string): Promise<any[]> {
    const ref = collection(this.firestore, collectionPath);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs;
  }
}
