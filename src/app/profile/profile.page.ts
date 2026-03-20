import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, SlicePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonListHeader,
  IonCard,
  IonCardContent,
  IonNote,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pencilOutline, checkmarkOutline, closeOutline, logOutOutline, trashOutline } from 'ionicons/icons';
import { Observable, of, Subscription, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { UserService, UserProfile } from '../core/services/user.service';
import { ReviewService, UserReview } from '../core/services/review.service';
import { UserAvatarComponent } from '../shared/components/user-avatar/user-avatar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AsyncPipe,
    NgIf,
    NgFor,
    SlicePipe,
    UserAvatarComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonListHeader,
    IonCard,
    IonCardContent,
    IonNote,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Perfil</ion-title>
        <ion-buttons slot="end">
          <ion-button
            *ngIf="!editMode"
            (click)="toggleEditMode()"
            aria-label="Editar perfil"
          >
            <ion-icon slot="icon-only" name="pencil-outline"></ion-icon>
          </ion-button>
          <ion-button
            *ngIf="editMode"
            (click)="toggleEditMode()"
            color="medium"
            aria-label="Cancelar edición"
          >
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="profile-content">

      <ng-container *ngIf="profile$ | async as profile">

        <!-- Profile Header Card -->
        <div class="profile-header-card">
          <app-user-avatar
            [displayName]="profile.displayName"
            [avatarUrl]="profile.avatarUrl"
            [size]="80"
          ></app-user-avatar>

          <div class="profile-info" *ngIf="!editMode">
            <h2 class="profile-name">{{ profile.displayName }}</h2>
            <ion-badge
              [color]="profile.role === 'critic' ? 'tertiary' : 'primary'"
              class="role-badge"
            >
              {{ profile.role === 'critic' ? 'Crítico' : 'Normal' }}
            </ion-badge>
            <p class="profile-email">{{ profile.email }}</p>
          </div>

          <!-- Edit Mode Form -->
          <div class="edit-form" *ngIf="editMode">
            <ion-item class="edit-item" lines="none">
              <ion-label position="stacked">Nombre de usuario</ion-label>
              <ion-input
                [formControl]="displayNameCtrl"
                placeholder="Tu nombre"
                autocomplete="name"
              ></ion-input>
            </ion-item>
            <ion-item class="edit-item" lines="none">
              <ion-label position="stacked">URL de avatar</ion-label>
              <ion-input
                [formControl]="avatarUrlCtrl"
                placeholder="https://..."
                type="url"
                autocomplete="off"
              ></ion-input>
            </ion-item>
            <ion-button
              expand="block"
              color="primary"
              class="save-btn"
              [disabled]="isSaving"
              (click)="saveProfile()"
            >
              <ion-icon slot="start" name="checkmark-outline"></ion-icon>
              {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
            </ion-button>
          </div>
        </div>

        <!-- Reviews Section -->
        <ion-list class="reviews-list" lines="none">
          <ion-list-header>
            <ion-label class="section-title">Mis Reseñas</ion-label>
          </ion-list-header>

          <ng-container *ngIf="reviews.length === 0; else reviewsList">
            <div class="empty-state">
              <ion-note class="empty-note">No hay reseñas aún</ion-note>
            </div>
          </ng-container>

          <ng-template #reviewsList>
            <ion-card *ngFor="let review of reviews" class="review-card">
              <ion-card-content>
                <div class="review-header">
                  <span class="review-title">{{ review.mediaId }}</span>
                  <ion-badge color="warning" class="score-badge">
                    {{ review.score }}/10
                  </ion-badge>
                </div>
                <p class="review-text">
                  {{ review.text.length > 100 ? (review.text | slice:0:100) + '...' : review.text }}
                </p>
              </ion-card-content>
            </ion-card>
          </ng-template>
        </ion-list>

        <!-- Logout Button -->
        <div class="action-buttons">
          <ion-button
            expand="block"
            color="danger"
            (click)="logout()"
            class="logout-btn"
          >
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            Cerrar sesión
          </ion-button>

          <!-- Delete Account Button -->
          <ion-button
            expand="block"
            color="danger"
            fill="outline"
            (click)="deleteAccount()"
            class="delete-btn"
          >
            <ion-icon slot="start" name="trash-outline"></ion-icon>
            Eliminar cuenta
          </ion-button>
        </div>

      </ng-container>

    </ion-content>
  `,
  styles: [`
    .profile-content {
      --background: var(--ion-background-color, #0f0f1a);
    }

    .profile-header-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 24px 24px;
      margin: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      gap: 16px;
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .profile-name {
      font-size: 1.375rem;
      font-weight: 600;
      color: var(--ion-text-color, #f8fafc);
      margin: 0;
      text-align: center;
    }

    .profile-email {
      font-size: 0.875rem;
      color: var(--ion-color-medium, #8899aa);
      margin: 0;
      text-align: center;
    }

    .role-badge {
      font-size: 0.75rem;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .edit-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .edit-item {
      --background: rgba(255, 255, 255, 0.06);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      --inner-padding-end: 0;
      margin-bottom: 4px;
      border-radius: 12px;
    }

    .save-btn {
      margin-top: 8px;
      --border-radius: 12px;
    }

    .reviews-list {
      margin: 0 16px 8px;
      padding: 0;
      background: transparent;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--ion-text-color, #f8fafc);
    }

    .empty-state {
      padding: 32px 16px;
      text-align: center;
    }

    .empty-note {
      font-size: 0.9375rem;
      color: var(--ion-color-medium, #8899aa);
    }

    .review-card {
      --background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 12px;
      box-shadow: none;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 8px;
    }

    .review-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ion-text-color, #f8fafc);
      flex: 1;
    }

    .score-badge {
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .review-text {
      font-size: 0.875rem;
      color: var(--ion-color-medium, #8899aa);
      margin: 0;
      line-height: 1.5;
    }

    .action-buttons {
      padding: 8px 16px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .logout-btn, .delete-btn {
      --border-radius: 12px;
    }
  `],
})
export class ProfilePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private reviewService = inject(ReviewService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  profile$!: Observable<UserProfile | undefined>;
  editMode = false;
  isSaving = false;
  reviews: UserReview[] = [];

  displayNameCtrl = new FormControl('', { nonNullable: true });
  avatarUrlCtrl = new FormControl('', { nonNullable: true });

  /** Holds the latest resolved profile for edit-mode and account deletion */
  private currentProfile: UserProfile | undefined;
  private profileSub?: Subscription;

  ngOnInit(): void {
    this.profile$ = this.authService.user$.pipe(
      switchMap((user) =>
        user ? this.userService.getUserDoc(user.uid) : of(undefined)
      )
    );

    // Track current profile for edit-mode pre-population and uid access
    this.profileSub = this.profile$.subscribe((profile) => {
      this.currentProfile = profile;
      if (profile && !this.editMode) {
        this.loadReviews(profile.uid);
      }
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode && this.currentProfile) {
      this.displayNameCtrl.setValue(this.currentProfile.displayName);
      this.avatarUrlCtrl.setValue(this.currentProfile.avatarUrl);
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.currentProfile) return;
    this.isSaving = true;

    const newName = this.displayNameCtrl.value.trim();
    const newAvatarUrl = this.avatarUrlCtrl.value.trim();
    const uid = this.currentProfile.uid;

    try {
      await firstValueFrom(this.authService.updateDisplayName(newName));
      await firstValueFrom(
        this.userService.updateUserDoc(uid, {
          displayName: newName,
          avatarUrl: newAvatarUrl,
        })
      );
      this.editMode = false;
      await this.showToast('Perfil actualizado', 'success');
    } catch {
      await this.showToast('Error al guardar el perfil. Intenta de nuevo.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.authService.logout());
    await this.router.navigate(['/login']);
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar cuenta',
      message:
        'Esta acción es irreversible. Se eliminarán tu cuenta y todas tus reseñas.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const uid = this.authService.currentUser?.uid;
            if (!uid) return;

            try {
              // Firestore first (security rules require auth to still be valid)
              await this.userService.deleteUserAndReviews(uid);
              // Auth record second
              await firstValueFrom(this.authService.deleteCurrentUser());
              await this.router.navigate(['/login']);
            } catch (err: any) {
              if (err?.code === 'auth/requires-recent-login') {
                await this.showToast(
                  'Por seguridad, cierra sesión e inicia de nuevo para eliminar tu cuenta.',
                  'warning'
                );
              } else {
                await this.showToast(
                  'Error al eliminar la cuenta. Intenta de nuevo.',
                  'danger'
                );
              }
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async loadReviews(uid: string): Promise<void> {
    this.reviews = await this.reviewService.getUserReviews(uid);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}
