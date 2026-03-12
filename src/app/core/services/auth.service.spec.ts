import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

/**
 * Auth mock factory — @angular/fire uses getModularInstance() which resolves _delegate.
 * We put all spied methods on _delegate so Firebase's modular functions can call them.
 */
function makeAuthMock(currentUser: object | null = null): Auth {
  const delegate = {
    signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
    signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword').and.returnValue(Promise.resolve({ user: currentUser })),
    createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword').and.returnValue(Promise.resolve({ user: currentUser })),
    currentUser,
    onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.returnValue(() => {}),
    _getRecaptchaConfig: jasmine.createSpy('_getRecaptchaConfig').and.returnValue(null),
    _initializationPromise: Promise.resolve(),
  };
  return {
    currentUser,
    _delegate: delegate,
    onAuthStateChanged: delegate.onAuthStateChanged,
    signOut: delegate.signOut,
    _getRecaptchaConfig: delegate._getRecaptchaConfig,
  } as unknown as Auth;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: makeAuthMock() },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'createUrlTree']) },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a user$ observable', () => {
    expect(service.user$).toBeDefined();
    expect(service.user$).toBeInstanceOf(Observable);
  });

  it('should expose currentUser getter returning null when not authenticated', () => {
    expect(service.currentUser).toBeNull();
  });
});

describe('AuthService - methods return Observable<void>', () => {
  let service: AuthService;

  beforeEach(() => {
    const userMock = {
      uid: 'test-uid',
      email: 'test@test.com',
      displayName: 'Test User',
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Auth,
          useValue: makeAuthMock(userMock),
        },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'createUrlTree']) },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('register() should return an Observable', () => {
    const result = service.register('test@test.com', 'password123');
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('login() should return an Observable', () => {
    const result = service.login('test@test.com', 'password123');
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('logout() should return an Observable', () => {
    const result = service.logout();
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('updateDisplayName() should return an Observable when user is authenticated', () => {
    const result = service.updateDisplayName('New Name');
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('deleteCurrentUser() should return an Observable when user is authenticated', () => {
    const result = service.deleteCurrentUser();
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });
});

describe('AuthService - no authenticated user', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: makeAuthMock(null) },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'createUrlTree']) },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('updateDisplayName() should emit an error when no authenticated user', (done) => {
    service.updateDisplayName('Name').subscribe({
      next: () => fail('Should not succeed'),
      error: (err: Error) => {
        expect(err.message).toBe('No authenticated user');
        done();
      },
    });
  });

  it('deleteCurrentUser() should emit an error when no authenticated user', (done) => {
    service.deleteCurrentUser().subscribe({
      next: () => fail('Should not succeed'),
      error: (err: Error) => {
        expect(err.message).toBe('No authenticated user');
        done();
      },
    });
  });
});
