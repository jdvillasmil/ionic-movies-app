import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonNote,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';
import { getAuthErrorMessage } from '../core/utils/auth-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Iniciar sesión</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="login-content">
      <div class="login-container">
        <div class="login-header">
          <h1 class="login-title">Bienvenido de nuevo</h1>
          <p class="login-subtitle">Inicia sesión para continuar</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form" novalidate>

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
              [class.item-error]="(form.get('password')?.invalid && form.get('password')?.touched) || loginError"
            >
              <ion-label position="stacked">Contraseña</ion-label>
              <ion-input
                type="password"
                formControlName="password"
                placeholder="Tu contraseña"
                autocomplete="current-password"
                aria-label="Contraseña"
              ></ion-input>
            </ion-item>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <ion-note color="danger" class="field-error">La contraseña es obligatoria</ion-note>
            }
            @if (loginError) {
              <ion-note color="danger" class="field-error">{{ loginError }}</ion-note>
            }
          </div>

          <!-- Submit -->
          <ion-button
            type="submit"
            expand="block"
            class="submit-btn"
            [disabled]="isLoading"
            aria-label="Iniciar sesión"
          >
            @if (isLoading) {
              <ion-spinner name="crescent" slot="start"></ion-spinner>
              Iniciando sesión...
            } @else {
              Iniciar sesión
            }
          </ion-button>

        </form>

        <div class="register-link">
          <p>¿No tienes cuenta? <a (click)="goToRegister()" class="link-btn">Regístrate</a></p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-content {
      --background: var(--ion-background-color, #0F0F23);
    }

    .login-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 24px 16px 40px;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      justify-content: center;
    }

    .login-header {
      text-align: center;
      padding: 32px 0 32px;
    }

    .login-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--ion-text-color, #F8FAFC);
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }

    .login-subtitle {
      font-size: 15px;
      color: var(--ion-color-medium, #94a3b8);
      margin: 0;
    }

    .login-form {
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

    .submit-btn {
      margin-top: 16px;
      --border-radius: 12px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      font-size: 16px;
      font-weight: 600;
      height: 52px;
    }

    .register-link {
      text-align: center;
      margin-top: 32px;

      p {
        color: var(--ion-color-medium, #94a3b8);
        font-size: 14px;
        margin: 0;
      }

      .link-btn {
        color: var(--ion-color-primary, #4338CA);
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
      }
    }
  `],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  loginError = '';
  isLoading = false;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async onSubmit(): Promise<void> {
    this.loginError = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const { email, password } = this.form.value as { email: string; password: string };
    this.isLoading = true;

    try {
      await firstValueFrom(this.authService.login(email, password));
      await this.router.navigate(['/tabs/home']);
    } catch (error: unknown) {
      this.loginError = getAuthErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
