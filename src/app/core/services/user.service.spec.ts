import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { UserService, UserProfile } from './user.service';

const mockProfile: UserProfile = {
  uid: 'user123',
  email: 'test@test.com',
  displayName: 'Test User',
  avatarUrl: '',
  role: 'normal',
  createdAt: 1234567890,
};

/**
 * We test the contract (method signatures, return types) without requiring
 * a real Firebase connection. Firebase's modular SDK validates the Firestore
 * instance internally, so for contract tests we verify method existence and
 * return type characteristics only.
 */
describe('UserService - contract', () => {
  let service: UserService;

  beforeEach(() => {
    // Minimal Firestore-shaped mock — Firebase SDK validates internally on call
    const firestoreMock = {} as unknown as Firestore;

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Firestore, useValue: firestoreMock },
      ],
    });

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose createUserDoc method', () => {
    expect(typeof service.createUserDoc).toBe('function');
  });

  it('should expose getUserDoc method', () => {
    expect(typeof service.getUserDoc).toBe('function');
  });

  it('should expose updateUserDoc method', () => {
    expect(typeof service.updateUserDoc).toBe('function');
  });

  it('should expose deleteUserAndReviews method', () => {
    expect(typeof service.deleteUserAndReviews).toBe('function');
  });

  it('createUserDoc() should return an Observable (may error without real Firestore)', () => {
    // The return value is always Observable — errors surface inside the stream
    const result = service.createUserDoc(mockProfile);
    expect(typeof result.subscribe).toBe('function');
  });

  it('getUserDoc() should return an Observable', () => {
    const result = service.getUserDoc('user123');
    expect(typeof result.subscribe).toBe('function');
  });

  it('updateUserDoc() should return an Observable', () => {
    const result = service.updateUserDoc('user123', { displayName: 'Updated' });
    expect(typeof result.subscribe).toBe('function');
  });

  it('deleteUserAndReviews() should return a Promise', () => {
    const result = service.deleteUserAndReviews('user123');
    expect(result).toBeDefined();
    expect(typeof result.then).toBe('function');
  });
});

describe('UserProfile interface', () => {
  it('should allow creating a valid UserProfile with role normal', () => {
    const profile: UserProfile = {
      uid: 'abc',
      email: 'a@b.com',
      displayName: 'Alice',
      avatarUrl: '',
      role: 'normal',
      createdAt: Date.now(),
    };
    expect(profile.uid).toBe('abc');
    expect(profile.role).toBe('normal');
  });

  it('should allow creating a valid UserProfile with role critic', () => {
    const profile: UserProfile = {
      uid: 'xyz',
      email: 'critic@test.com',
      displayName: 'Bob Critic',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'critic',
      createdAt: Date.now(),
    };
    expect(profile.role).toBe('critic');
    expect(profile.avatarUrl).toBeTruthy();
  });

  it('should enforce uid, email, displayName, avatarUrl, role, createdAt fields', () => {
    const profile: UserProfile = {
      uid: 'u1',
      email: 'e@test.com',
      displayName: 'User One',
      avatarUrl: '',
      role: 'normal',
      createdAt: 0,
    };
    expect(Object.keys(profile)).toContain('uid');
    expect(Object.keys(profile)).toContain('email');
    expect(Object.keys(profile)).toContain('displayName');
    expect(Object.keys(profile)).toContain('avatarUrl');
    expect(Object.keys(profile)).toContain('role');
    expect(Object.keys(profile)).toContain('createdAt');
  });
});
