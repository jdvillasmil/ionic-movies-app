import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePage } from './profile.page';
import { AuthService } from '../core/services/auth.service';
import { UserService, UserProfile } from '../core/services/user.service';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;

  const mockUser = { uid: 'test-uid-123', email: 'test@test.com' } as any;
  const mockProfile: UserProfile = {
    uid: 'test-uid-123',
    email: 'test@test.com',
    displayName: 'Test User',
    avatarUrl: '',
    role: 'normal',
    createdAt: Date.now(),
  };

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
  const mockAlert = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['logout', 'updateDisplayName', 'deleteCurrentUser'],
      { user$: of(mockUser), currentUser: mockUser }
    );
    authServiceSpy.logout.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    authServiceSpy.deleteCurrentUser.and.returnValue(of(void 0));

    userServiceSpy = jasmine.createSpyObj<UserService>('UserService', [
      'getUserDoc',
      'updateUserDoc',
      'deleteUserAndReviews',
    ]);
    userServiceSpy.getUserDoc.and.returnValue(of(mockProfile));
    userServiceSpy.updateUserDoc.and.returnValue(of(void 0));
    userServiceSpy.deleteUserAndReviews.and.returnValue(Promise.resolve());

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert as any));

    await TestBed.configureTestingModule({
      imports: [ProfilePage, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: Firestore, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    // Prevent loadReviews from calling real Firestore functions in tests
    spyOn(component as any, 'loadReviews').and.returnValue(Promise.resolve());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build profile$ by switching on user$ and calling getUserDoc', () => {
    expect(userServiceSpy.getUserDoc).toHaveBeenCalledWith('test-uid-123');
  });

  it('should start with editMode = false', () => {
    expect(component.editMode).toBeFalse();
  });

  it('should toggle editMode to true when toggleEditMode() is called', () => {
    component.toggleEditMode();
    expect(component.editMode).toBeTrue();
  });

  it('should toggle editMode back to false on second call', () => {
    component.toggleEditMode();
    component.toggleEditMode();
    expect(component.editMode).toBeFalse();
  });

  it('should pre-populate form when entering edit mode', () => {
    component['currentProfile'] = mockProfile;
    component.toggleEditMode();
    expect(component.displayNameCtrl.value).toBe('Test User');
    expect(component.avatarUrlCtrl.value).toBe('');
  });

  it('should call updateDisplayName and updateUserDoc on saveProfile()', async () => {
    component['currentProfile'] = mockProfile;
    component.toggleEditMode();
    component.displayNameCtrl.setValue('New Name');
    component.avatarUrlCtrl.setValue('https://example.com/avatar.png');

    await component.saveProfile();

    expect(authServiceSpy.updateDisplayName).toHaveBeenCalledWith('New Name');
    expect(userServiceSpy.updateUserDoc).toHaveBeenCalledWith('test-uid-123', {
      displayName: 'New Name',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('should exit editMode after saveProfile()', async () => {
    component['currentProfile'] = mockProfile;
    component.toggleEditMode();
    expect(component.editMode).toBeTrue();

    await component.saveProfile();

    expect(component.editMode).toBeFalse();
  });

  it('should show "Perfil actualizado" toast on saveProfile()', async () => {
    component['currentProfile'] = mockProfile;
    component.toggleEditMode();

    await component.saveProfile();

    expect(toastControllerSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: 'Perfil actualizado' })
    );
    expect(mockToast.present).toHaveBeenCalled();
  });

  it('should call logout() and navigate to /login on logout()', async () => {
    await component.logout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should initialize reviews as empty array', () => {
    expect(component.reviews).toEqual([]);
  });

  it('should show alert and call deleteUserAndReviews + deleteCurrentUser on confirmed deleteAccount()', async () => {
    let confirmHandler: ((...args: any[]) => any) | undefined;
    alertControllerSpy.create.and.callFake((opts: any) => {
      confirmHandler = opts.buttons.find((b: any) => b.text === 'Eliminar')?.handler;
      return Promise.resolve(mockAlert as any);
    });

    const deletePromise = component.deleteAccount();
    // Let the alert creation resolve
    await Promise.resolve();

    if (confirmHandler) await confirmHandler();

    await deletePromise;

    expect(userServiceSpy.deleteUserAndReviews).toHaveBeenCalledWith('test-uid-123');
    expect(authServiceSpy.deleteCurrentUser).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should show relogin toast when deleteCurrentUser fails with auth/requires-recent-login', async () => {
    const reloginError = { code: 'auth/requires-recent-login' };
    authServiceSpy.deleteCurrentUser.and.returnValue(throwError(() => reloginError));

    let confirmHandler: ((...args: any[]) => any) | undefined;
    alertControllerSpy.create.and.callFake((opts: any) => {
      confirmHandler = opts.buttons.find((b: any) => b.text === 'Eliminar')?.handler;
      return Promise.resolve(mockAlert as any);
    });

    const deletePromise = component.deleteAccount();
    await Promise.resolve();

    if (confirmHandler) {
      try {
        await confirmHandler();
      } catch { /* error is handled inside component */ }
    }

    try {
      await deletePromise;
    } catch { /* ok */ }

    expect(toastControllerSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: jasmine.stringContaining('cierra sesión'),
      })
    );
  });
});
