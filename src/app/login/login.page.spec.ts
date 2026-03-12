import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular';
import { of, throwError, Subject } from 'rxjs';

import { LoginPage } from './login.page';
import { AuthService } from '../core/services/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    // RouterSpy must have an `events` Subject so NavController can subscribe to it
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { events: new Subject() });
    toastSpy = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [LoginPage, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with email and password controls', () => {
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
  });

  it('should start with loginError = false', () => {
    expect(component.loginError).toBeFalse();
  });

  it('should be invalid when form is empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('should be invalid with wrong email format', () => {
    component.form.patchValue({ email: 'not-an-email', password: 'password123' });
    expect(component.form.invalid).toBeTrue();
  });

  it('should be valid with correct email and password', () => {
    component.form.patchValue({ email: 'user@example.com', password: 'password123' });
    expect(component.form.valid).toBeTrue();
  });

  it('should not call Firebase if form is invalid on submit', fakeAsync(() => {
    component.form.patchValue({ email: 'invalid', password: '' });
    component.onSubmit();
    tick();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  }));

  it('should call authService.login with email and password on valid submit', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({ email: 'user@example.com', password: 'password123' });
    component.onSubmit();
    tick();

    expect(authServiceSpy.login).toHaveBeenCalledWith('user@example.com', 'password123');
  }));

  it('should navigate to /tabs/home on successful login', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({ email: 'user@example.com', password: 'password123' });
    component.onSubmit();
    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tabs/home']);
  }));

  it('should set loginError = true on auth error', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(
      throwError(() => ({ code: 'auth/invalid-credential' }))
    );

    component.form.patchValue({ email: 'user@example.com', password: 'wrongpassword' });
    component.onSubmit();
    tick();

    expect(component.loginError).toBeTrue();
  }));

  it('should reset loginError to false on each new submit attempt', fakeAsync(() => {
    component.loginError = true;
    authServiceSpy.login.and.returnValue(of(void 0));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.form.patchValue({ email: 'user@example.com', password: 'password123' });
    component.onSubmit();
    tick();

    expect(component.loginError).toBeFalse();
  }));

  it('should mark all fields as touched on invalid submit', fakeAsync(() => {
    component.onSubmit();
    tick();
    expect(component.form.get('email')?.touched).toBeTrue();
    expect(component.form.get('password')?.touched).toBeTrue();
  }));

  it('should not navigate on auth error', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(
      throwError(() => ({ code: 'auth/wrong-password' }))
    );

    component.form.patchValue({ email: 'user@example.com', password: 'wrongpassword' });
    component.onSubmit();
    tick();

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));
});
