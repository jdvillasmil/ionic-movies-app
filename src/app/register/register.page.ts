import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonNote,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  if (password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonText,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Crear cuenta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="register-content">
      <div class="register-container">
        <div class="register-header">
          <h1 class="register-title">Únete a CineApp</h1>
          <p class="register-subtitle">Crea tu cuenta y empieza a explorar</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="register-form" novalidate>

          <!-- Email -->
          <div class="field-group">
            <ion-item
              lines="none"
              class="form-item"
              [class.item-error]="form.get('email')?.invalid && form.get('email')?.touched"
            >
              <ion-label position="stacked">Correo electrónico</ion-label>
              <ion-input
                type="email"
                formControlName="email"
                placeholder="tu@correo.com"
                autocomplete="email"
                inputmode="email"
                aria-label="Correo electrónico"
              ></ion-input>
            </ion-item>
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <ion-note color="danger" class="field-error">El correo es obligatorio</ion-note>
            } @else if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <ion-note color="danger" class="field-error">Correo electrónico inválido</ion-note>
            }
          </div>

          <!-- Password -->
          <div class="field-group">
            <ion-item
              lines="none"
              class="form-item"
              [class.item-error]="form.get('password')?.invalid && form.get('password')?.touched"
            >
              <ion-label position="stacked">Contraseña</ion-label>
              <ion-input
                type="password"
                formControlName="password"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
                aria-label="Contraseña"
              ></ion-input>
            </ion-item>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <ion-note color="danger" class="field-error">La contraseña es obligatoria</ion-note>
            } @else if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
              <ion-note color="danger" class="field-error">La contraseña debe tener al menos 6 caracteres</ion-note>
            }
          </div>

          <!-- Confirm Password -->
          <div class="field-group">
            <ion-item
              lines="none"
              class="form-item"
              [class.item-error]="(form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.touched) || (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched)"
            >
              <ion-label position="stacked">Confirmar contraseña</ion-label>
              <ion-input
                type="password"
                formControlName="confirmPassword"
                placeholder="Repite tu contraseña"
                autocomplete="new-password"
                aria-label="Confirmar contraseña"
              ></ion-input>
            </ion-item>
            @if (form.get('confirmPassword')?.hasError('required') && form.get('confirmPassword')?.touched) {
              <ion-note color="danger" class="field-error">Confirma tu contraseña</ion-note>
            } @else if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <ion-note color="danger" class="field-error">Las contraseñas no coinciden</ion-note>
            }
          </div>

          <!-- Role -->
          <div class="field-group role-group">
            <p class="role-label">Tipo de cuenta</p>
            <ion-segment
              [value]="form.get('role')?.value"
              (ionChange)="form.get('role')?.setValue($event.detail.value)"
              class="role-segment"
              aria-label="Tipo de cuenta"
            >
              <ion-segment-button value="normal">
                <ion-label>Normal</ion-label>
              </ion-segment-button>
              <ion-segment-button value="critic">
                <ion-label>Crítico</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <!-- Submit -->
          <ion-button
            type="submit"
            expand="block"
            class="submit-btn"
            [disabled]="isLoading"
            aria-label="Crear cuenta"
          >
            @if (isLoading) {
              <ion-spinner name="crescent" slot="start"></ion-spinner>
              Creando cuenta...
            } @else {
              Crear cuenta
            }
          </ion-button>

          <!-- Auth error -->
          @if (authError) {
            <ion-text color="danger" class="auth-error">
              <p>{{ authError }}</p>
            </ion-text>
          }

        </form>

        <div class="login-link">
          <p>¿Ya tienes cuenta? <a routerLink="/login" (click)="goToLogin()">Inicia sesión</a></p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .register-content {
      --background: var(--ion-background-color, #0F0F23);
    }

    .register-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 24px 16px 40px;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .register-header {
      text-align: center;
      padding: 32px 0 24px;
    }

    .register-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--ion-text-color, #F8FAFC);
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }

    .register-subtitle {
      font-size: 15px;
      color: var(--ion-color-medium, #94a3b8);
      margin: 0;
    }

    .register-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-group {
      margin-bottom: 8px;
    }

    .form-item {
      --background: rgba(255, 255, 255, 0.06);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 10px;
      --padding-bottom: 10px;
      --highlight-color-focused: var(--ion-color-primary, #4338CA);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      transition: border-color 200ms;
    }

    .form-item.item-error {
      border-color: var(--ion-color-danger, #f04141);
    }

    .field-error {
      display: block;
      font-size: 12px;
      padding: 4px 16px 0;
    }

    .role-group {
      margin-top: 4px;
      margin-bottom: 12px;
    }

    .role-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--ion-color-medium, #94a3b8);
      margin: 0 0 8px 4px;
    }

    .role-segment {
      --background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .submit-btn {
      margin-top: 16px;
      --border-radius: 12px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      font-size: 16px;
      font-weight: 600;
      height: 52px;
    }

    .auth-error {
      display: block;
      text-align: center;
      margin-top: 8px;
      font-size: 14px;
    }

    .login-link {
      text-align: center;
      margin-top: 24px;

      p {
        color: var(--ion-color-medium, #94a3b8);
        font-size: 14px;
        margin: 0;
      }

      a {
        color: var(--ion-color-primary, #4338CA);
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
      }
    }
  `],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  isLoading = false;
  authError = '';

  form: FormGroup = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['normal', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  async onSubmit(): Promise<void> {
    this.authError = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const { email, password, role } = this.form.value as {
      email: string;
      password: string;
      role: 'normal' | 'critic';
    };

    this.isLoading = true;
    let authRecordCreated = false;

    try {
      await firstValueFrom(this.authService.register(email, password));
      authRecordCreated = true;

      const user = this.authService.currentUser!;
      const displayName = email.split('@')[0];

      await firstValueFrom(this.authService.updateDisplayName(displayName));

      await firstValueFrom(
        this.userService.createUserDoc({
          uid: user.uid,
          email,
          displayName,
          avatarUrl: '',
          role,
          createdAt: Date.now(),
        })
      );

      await this.router.navigate(['/tabs/home']);
      await this.showToast('Registro exitoso');
    } catch (error: unknown) {
      if (authRecordCreated) {
        try {
          await firstValueFrom(this.authService.deleteCurrentUser());
        } catch {
          // Cleanup failed — ignore to surface original error
        }
      }
      this.authError = this.getErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }

  private getErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'auth/email-already-in-use') {
      return 'Este correo ya está registrado';
    }
    if (code === 'auth/invalid-email') {
      return 'Correo electrónico inválido';
    }
    return 'Ocurrió un error. Inténtalo de nuevo';
  }
}
