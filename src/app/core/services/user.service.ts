import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  collectionGroup,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, from, defer } from 'rxjs';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;    // Empty string = use initials avatar
  role: 'normal' | 'critic';
  createdAt: number;    // Date.now() timestamp
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);

  createUserDoc(profile: UserProfile): Observable<void> {
    return defer(() => {
      const ref = doc(this.firestore, `users/${profile.uid}`);
      return from(setDoc(ref, profile));
    });
  }

  getUserDoc(uid: string): Observable<UserProfile | undefined> {
    return defer(() => {
      const ref = doc(this.firestore, `users/${uid}`);
      return docData(ref) as Observable<UserProfile | undefined>;
    });
  }

  updateUserDoc(uid: string, changes: Partial<UserProfile>): Observable<void> {
    return defer(() => {
      const ref = doc(this.firestore, `users/${uid}`);
      return from(setDoc(ref, changes, { merge: true }));
    });
  }

  async deleteUserAndReviews(uid: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Query reviews where userId == uid across subcollections
    const reviewsRef = collectionGroup(this.firestore, 'reviews');
    const reviewsQuery = query(reviewsRef, where('userId', '==', uid));
    const reviewsSnapshot = await getDocs(reviewsQuery);

    reviewsSnapshot.forEach((reviewDoc) => {
      batch.delete(reviewDoc.ref);
    });

    // Delete Firestore user doc BEFORE auth record
    // (Firestore security rules rely on auth; deleting auth first would cause permission errors)
    const userRef = doc(this.firestore, `users/${uid}`);
    batch.delete(userRef);

    await batch.commit();
  }
}
