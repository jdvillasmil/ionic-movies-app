import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  User,
} from '@angular/fire/auth';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  readonly user$: Observable<User | null> = authState(this.auth);

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  register(email: string, password: string): Observable<void> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      map(() => void 0)
    );
  }

  login(email: string, password: string): Observable<void> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(() => void 0)
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  updateDisplayName(displayName: string): Observable<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return from(Promise.reject(new Error('No authenticated user')));
    }
    return from(updateProfile(currentUser, { displayName }));
  }

  deleteCurrentUser(): Observable<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return from(Promise.reject(new Error('No authenticated user')));
    }
    // auth/requires-recent-login errors are intentionally not caught here;
    // the caller (profile page) handles them with a user-facing message.
    return from(deleteUser(currentUser));
  }
}
