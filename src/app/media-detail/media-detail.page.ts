import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonButton,
  IonSkeletonText, IonChip, IonBadge, IonRange, IonTextarea, IonItem, IonLabel,
  IonList, IonListHeader, IonCard, IonCardContent, IonSpinner,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TmdbService, MediaDetail } from '../core/services/tmdb.service';
import { ReviewService, ReviewDoc, MediaSummary } from '../core/services/review.service';
import { AuthService } from '../core/services/auth.service';
import { UserService, UserProfile } from '../core/services/user.service';
import { TmdbImagePipe } from '../core/pipes/tmdb-image.pipe';

@Component({
  selector: 'app-media-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe,
    ReactiveFormsModule,
    TmdbImagePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonButton,
    IonSkeletonText, IonChip, IonBadge, IonRange, IonTextarea, IonItem, IonLabel,
    IonList, IonListHeader, IonCard, IonCardContent, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ detail?.title ?? 'Detalle' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Loading skeleton -->
      <ng-container *ngIf="isLoading">
        <ion-skeleton-text animated style="width: 100%; height: 300px;"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 60%; height: 24px; margin-top: 16px;"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 40%; height: 16px; margin-top: 8px;"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 100%; height: 80px; margin-top: 8px;"></ion-skeleton-text>
      </ng-container>

      <!-- Detail content -->
      <ng-container *ngIf="!isLoading && detail">
        <!-- Poster -->
        <img
          *ngIf="detail.posterPath"
          [src]="detail.posterPath | tmdbImage:'w500'"
          [alt]="detail.title"
          style="width: 100%; border-radius: 8px; margin-bottom: 16px;"
        />

        <!-- Title and release date -->
        <h1>{{ detail.title }}</h1>
        <p *ngIf="detail.releaseDate"><strong>Fecha de estreno:</strong> {{ detail.releaseDate }}</p>

        <!-- Genres -->
        <div style="margin-bottom: 12px;">
          <ion-chip *ngFor="let genre of detail.genres" color="primary">{{ genre }}</ion-chip>
        </div>

        <!-- Overview -->
        <p>{{ detail.overview }}</p>

        <!-- Dual ratings -->
        <ion-card>
          <ion-card-content>
            <h2>Calificaciones</h2>
            <p>
              <strong>Usuarios:</strong>
              {{ normalAvg | number:'1.1-1' }} ({{ summary?.normalCount ?? 0 }} reseñas)
            </p>
            <p>
              <strong>Críticos:</strong>
              {{ criticAvg | number:'1.1-1' }} ({{ summary?.criticCount ?? 0 }} reseñas)
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Reviews list -->
        <ion-list>
          <ion-list-header>
            <ion-label>Reseñas</ion-label>
          </ion-list-header>

          <ion-item *ngFor="let review of reviews">
            <ion-label class="ion-text-wrap">
              <h3>
                {{ review.authorName }}
                <ion-badge [color]="review.role === 'critic' ? 'tertiary' : 'primary'">
                  {{ review.role === 'critic' ? 'Crítico' : 'Usuario' }}
                </ion-badge>
                <ion-badge color="success">{{ review.score }}/10</ion-badge>
              </h3>
              <p>{{ review.text }}</p>
            </ion-label>
          </ion-item>

          <ion-item *ngIf="reviews.length === 0">
            <ion-label color="medium">No hay reseñas todavía. ¡Sé el primero!</ion-label>
          </ion-item>
        </ion-list>

        <!-- Auth-conditional review section -->
        <ng-container *ngIf="isLoggedIn">
          <!-- User has NOT reviewed yet: show submit form -->
          <ion-card *ngIf="!userReview">
            <ion-card-content>
              <h2>Escribe una reseña</h2>
              <form [formGroup]="reviewForm">
                <ion-item>
                  <ion-label>Puntuación: {{ reviewForm.controls.score.value }}/10</ion-label>
                  <ion-range
                    [formControl]="reviewForm.controls.score"
                    [min]="1"
                    [max]="10"
                    [snaps]="true"
                    [ticks]="true"
                    color="primary"
                  ></ion-range>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">Tu reseña</ion-label>
                  <ion-textarea
                    [formControl]="reviewForm.controls.text"
                    rows="4"
                    placeholder="Escribe tu reseña aquí..."
                  ></ion-textarea>
                </ion-item>
                <ion-button
                  expand="block"
                  [disabled]="reviewForm.invalid || isSubmitting"
                  (click)="submitReview()"
                  style="margin-top: 12px;"
                >
                  <ion-spinner *ngIf="isSubmitting" name="crescent"></ion-spinner>
                  <span *ngIf="!isSubmitting">Enviar reseña</span>
                </ion-button>
              </form>
            </ion-card-content>
          </ion-card>

          <!-- User HAS reviewed: show edit/delete -->
          <ion-card *ngIf="userReview">
            <ion-card-content>
              <h2>Tu reseña</h2>
              <form [formGroup]="reviewForm">
                <ion-item>
                  <ion-label>Puntuación: {{ reviewForm.controls.score.value }}/10</ion-label>
                  <ion-range
                    [formControl]="reviewForm.controls.score"
                    [min]="1"
                    [max]="10"
                    [snaps]="true"
                    [ticks]="true"
                    color="primary"
                  ></ion-range>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">Tu reseña</ion-label>
                  <ion-textarea
                    [formControl]="reviewForm.controls.text"
                    rows="4"
                  ></ion-textarea>
                </ion-item>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                  <ion-button
                    expand="block"
                    [disabled]="reviewForm.invalid || isSubmitting"
                    (click)="editReview()"
                    style="flex: 1;"
                  >Guardar cambios</ion-button>
                  <ion-button
                    expand="block"
                    color="danger"
                    [disabled]="isSubmitting"
                    (click)="deleteReview()"
                    style="flex: 1;"
                  >Eliminar</ion-button>
                </div>
              </form>
            </ion-card-content>
          </ion-card>
        </ng-container>

        <!-- Guest: login prompt -->
        <ng-container *ngIf="!isLoggedIn">
          <ion-card>
            <ion-card-content>
              <p color="medium">Inicia sesión para escribir una reseña.</p>
            </ion-card-content>
          </ion-card>
        </ng-container>

        <!-- Cast section -->
        <ion-list *ngIf="detail.cast.length > 0">
          <ion-list-header>
            <ion-label>Reparto principal</ion-label>
          </ion-list-header>
          <ion-item *ngFor="let actor of detail.cast">
            <img
              slot="start"
              [src]="actor.profilePath | tmdbImage:'w185'"
              [alt]="actor.name"
              style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px;"
            />
            <ion-label>
              <h3>{{ actor.name }}</h3>
              <p>{{ actor.character }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ng-container>
    </ion-content>
  `,
})
export class MediaDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private tmdbService = inject(TmdbService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  mediaType = this.route.snapshot.paramMap.get('mediaType') as 'movie' | 'tv';
  id = Number(this.route.snapshot.paramMap.get('id'));
  mediaId = `${this.mediaType}_${this.id}`;

  detail: MediaDetail | null = null;
  summary: MediaSummary | null = null;
  reviews: ReviewDoc[] = [];
  userReview: ReviewDoc | null = null;
  currentProfile: UserProfile | undefined;
  isLoading = true;
  isSubmitting = false;

  reviewForm = new FormGroup({
    score: new FormControl(5, {
      validators: [Validators.min(1), Validators.max(10)],
      nonNullable: true,
    }),
    text: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  get isLoggedIn(): boolean {
    return this.authService.currentUser !== null;
  }

  get normalAvg(): number {
    if (!this.summary || this.summary.normalCount === 0) return 0;
    return Math.round((this.summary.normalTotal / this.summary.normalCount) * 10) / 10;
  }

  get criticAvg(): number {
    if (!this.summary || this.summary.criticCount === 0) return 0;
    return Math.round((this.summary.criticTotal / this.summary.criticCount) * 10) / 10;
  }

  async ngOnInit(): Promise<void> {
    const [detail, summary, reviews] = await Promise.all([
      this.tmdbService.getDetail(this.id, this.mediaType),
      this.reviewService.getMediaSummary(this.mediaId),
      this.reviewService.getReviews(this.mediaId),
    ]);

    this.detail = detail;
    this.summary = summary;
    this.reviews = reviews;

    const currentUser = this.authService.currentUser;
    if (currentUser) {
      const uid = currentUser.uid;
      const [userReview, profile] = await Promise.all([
        this.reviewService.getUserReview(this.mediaId, uid),
        firstValueFrom(this.userService.getUserDoc(uid)),
      ]);
      this.userReview = userReview;
      this.currentProfile = profile;

      // Pre-populate form if user already has a review
      if (userReview) {
        this.reviewForm.setValue({ score: userReview.score, text: userReview.text });
      }
    }

    this.isLoading = false;
  }

  async submitReview(): Promise<void> {
    if (this.reviewForm.invalid || !this.currentProfile || !this.authService.currentUser) return;
    this.isSubmitting = true;
    try {
      const now = Date.now();
      const reviewDoc: ReviewDoc = {
        userId: this.authService.currentUser.uid,
        authorName: this.currentProfile.displayName,
        role: this.currentProfile.role,
        score: this.reviewForm.controls.score.value,
        text: this.reviewForm.controls.text.value,
        createdAt: now,
        updatedAt: now,
      };
      await this.reviewService.submitReview(this.mediaId, reviewDoc);
      this.userReview = reviewDoc;
      await this.reloadSummaryAndReviews();
      await this.showToast('Reseña enviada con éxito');
    } finally {
      this.isSubmitting = false;
    }
  }

  async editReview(): Promise<void> {
    if (this.reviewForm.invalid || !this.userReview || !this.currentProfile) return;
    this.isSubmitting = true;
    try {
      const oldScore = this.userReview.score;
      const updated: ReviewDoc = {
        ...this.userReview,
        score: this.reviewForm.controls.score.value,
        text: this.reviewForm.controls.text.value,
        updatedAt: Date.now(),
      };
      await this.reviewService.editReview(this.mediaId, oldScore, updated);
      this.userReview = updated;
      await this.reloadSummaryAndReviews();
      await this.showToast('Reseña actualizada');
    } finally {
      this.isSubmitting = false;
    }
  }

  async deleteReview(): Promise<void> {
    if (!this.userReview) return;

    const alert = await this.alertController.create({
      header: 'Eliminar reseña',
      message: '¿Estás seguro de que quieres eliminar tu reseña?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.isSubmitting = true;
            try {
              await this.reviewService.deleteReview(this.mediaId, this.userReview!);
              this.userReview = null;
              this.reviewForm.reset({ score: 5, text: '' });
              await this.reloadSummaryAndReviews();
              await this.showToast('Reseña eliminada');
            } finally {
              this.isSubmitting = false;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async reloadSummaryAndReviews(): Promise<void> {
    const [summary, reviews] = await Promise.all([
      this.reviewService.getMediaSummary(this.mediaId),
      this.reviewService.getReviews(this.mediaId),
    ]);
    this.summary = summary;
    this.reviews = reviews;
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }
}
