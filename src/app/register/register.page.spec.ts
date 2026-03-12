import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular';
import { of, throwError, Subject } from 'rxjs';

import { RegisterPage } from './register.page';
import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'register',
      'updateDisplayName',
      'deleteCurrentUser',
    ], { currentUser: { uid: 'test-uid', email: 'test@example.com' } });
    userServiceSpy = jasmine.createSpyObj('UserService', ['createUserDoc']);
    // RouterSpy must have an `events` Subject so NavController can subscribe to it
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { events: new Subject() });
    toastSpy = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [RegisterPage, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with email, password, confirmPassword, and role controls', () => {
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
    expect(component.form.get('confirmPassword')).toBeTruthy();
    expect(component.form.get('role')).toBeTruthy();
  });

  it('should have role defaulting to "normal"', () => {
    expect(component.form.get('role')?.value).toBe('normal');
  });

  it('should be invalid when form is empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('should be invalid with mismatched passwords', () => {
    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different123',
      role: 'normal',
    });
    expect(component.form.hasError('passwordMismatch')).toBeTrue();
  });

  it('should be valid when all fields are correctly filled', () => {
    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'normal',
    });
    expect(component.form.valid).toBeTrue();
  });

  it('should not call Firebase if form is invalid on submit', fakeAsync(() => {
    component.form.patchValue({
      email: 'invalid-email',
      password: 'pass',
      confirmPassword: 'pass',
      role: 'normal',
    });
    component.onSubmit();
    tick();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  }));

  it('should not call Firebase if passwords do not match on submit', fakeAsync(() => {
    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'mismatch',
      role: 'normal',
    });
    component.onSubmit();
    tick();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  }));

  it('should call authService.register then updateDisplayName then userService.createUserDoc on valid submit', fakeAsync(() => {
    authServiceSpy.register.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    userServiceSpy.createUserDoc.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'normal',
    });

    component.onSubmit();
    tick();

    expect(authServiceSpy.register).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(authServiceSpy.updateDisplayName).toHaveBeenCalled();
    expect(userServiceSpy.createUserDoc).toHaveBeenCalled();
  }));

  it('should navigate to /tabs/home on successful registration', fakeAsync(() => {
    authServiceSpy.register.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    userServiceSpy.createUserDoc.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'normal',
    });

    component.onSubmit();
    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tabs/home']);
  }));

  it('should pass correct role to createUserDoc', fakeAsync(() => {
    authServiceSpy.register.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    userServiceSpy.createUserDoc.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'critic',
    });

    component.onSubmit();
    tick();

    const docArg = userServiceSpy.createUserDoc.calls.mostRecent().args[0];
    expect(docArg.role).toBe('critic');
  }));

  it('should call deleteCurrentUser on error after auth record created', fakeAsync(() => {
    authServiceSpy.register.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    userServiceSpy.createUserDoc.and.returnValue(throwError(() => new Error('Firestore error')));
    authServiceSpy.deleteCurrentUser.and.returnValue(of(void 0));

    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'normal',
    });

    component.onSubmit();
    tick();

    expect(authServiceSpy.deleteCurrentUser).toHaveBeenCalled();
  }));

  it('should mark all fields as touched on submit with invalid form', fakeAsync(() => {
    component.onSubmit();
    tick();
    expect(component.form.get('email')?.touched).toBeTrue();
    expect(component.form.get('password')?.touched).toBeTrue();
  }));

  it('should send role "normal" by default if role not changed', fakeAsync(() => {
    authServiceSpy.register.and.returnValue(of(void 0));
    authServiceSpy.updateDisplayName.and.returnValue(of(void 0));
    userServiceSpy.createUserDoc.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component.onSubmit();
    tick();

    const docArg = userServiceSpy.createUserDoc.calls.mostRecent().args[0];
    expect(docArg.role).toBe('normal');
  }));
});
