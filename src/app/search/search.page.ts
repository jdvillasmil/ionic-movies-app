import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { from } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { TmdbService, MediaItem } from '../core/services/tmdb.service';
import { TmdbImagePipe } from '../core/pipes/tmdb-image.pipe';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSkeletonText,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    DecimalPipe,
    TmdbImagePipe,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Buscar</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-searchbar
        [formControl]="searchCtrl"
        placeholder="Buscar películas y series..."
        debounce="0"
      ></ion-searchbar>

      <!-- Skeleton -->
      <ng-container *ngIf="isLoading">
        <div class="result-list">
          <div *ngFor="let _ of [1,2,3,4,5,6,7,8]" class="result-skeleton">
            <ion-skeleton-text animated class="skeleton-poster"></ion-skeleton-text>
            <div class="skeleton-info">
              <ion-skeleton-text animated class="skeleton-title"></ion-skeleton-text>
              <ion-skeleton-text animated class="skeleton-meta"></ion-skeleton-text>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Results -->
      <ng-container *ngIf="!isLoading">
        <ng-container *ngIf="items.length > 0; else emptyState">
          <div class="result-list">
            <div
              *ngFor="let item of items"
              class="result-item"
              (click)="navigateToDetail(item)"
            >
              <div class="result-poster">
                <img
                  *ngIf="item.posterPath"
                  [src]="item.posterPath | tmdbImage:'w92'"
                  [alt]="item.title"
                  class="result-img"
                  loading="lazy"
                />
                <div *ngIf="!item.posterPath" class="result-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2"/>
                    <line x1="7" y1="2" x2="7" y2="22"/>
                    <line x1="17" y1="2" x2="17" y2="22"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <line x1="2" y1="7" x2="7" y2="7"/>
                    <line x1="17" y1="7" x2="22" y2="7"/>
                    <line x1="2" y1="17" x2="7" y2="17"/>
                    <line x1="17" y1="17" x2="22" y2="17"/>
                  </svg>
                </div>
              </div>
              <div class="result-info">
                <p class="result-title">{{ item.title }}</p>
                <p class="result-meta">
                  <span class="meta-type">{{ item.mediaType === 'movie' ? 'Película' : 'Serie' }}</span>
                  <span class="meta-dot">·</span>
                  <span class="meta-year">{{ item.year }}</span>
                  <span class="meta-dot">·</span>
                  <span class="meta-score">★ {{ item.voteAverage | number:'1.1-1' }}</span>
                </p>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state">
            <p class="empty-text">No se encontraron resultados</p>
          </div>
        </ng-template>
      </ng-container>

      <ion-infinite-scroll (ionInfinite)="loadMore($event)" [disabled]="allLoaded">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: [`
    .result-list {
      display: flex;
      flex-direction: column;
      padding: 8px 12px;
      gap: 4px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 150ms;

      &:active {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .result-poster {
      flex-shrink: 0;
      width: 60px;
      height: 90px;
      border-radius: 6px;
      overflow: hidden;
      background: #1a1a2e;
    }

    .result-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .result-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 50%;
        height: 50%;
        color: rgba(255, 255, 255, 0.15);
      }
    }

    .result-info {
      flex: 1;
      min-width: 0;
    }

    .result-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color, #f8fafc);
      margin: 0 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .result-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin: 0;
      font-size: 12px;
    }

    .meta-type {
      color: var(--ion-color-primary, #6366f1);
      font-weight: 600;
    }

    .meta-dot {
      color: rgba(255, 255, 255, 0.25);
    }

    .meta-year {
      color: var(--ion-color-medium, #8899aa);
    }

    .meta-score {
      color: #facc15;
      font-weight: 600;
    }

    /* Skeleton */
    .result-skeleton {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
    }

    .skeleton-poster {
      flex-shrink: 0;
      width: 60px;
      height: 90px;
      border-radius: 6px;
    }

    .skeleton-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-title {
      height: 16px;
      border-radius: 4px;
    }

    .skeleton-meta {
      height: 12px;
      width: 60%;
      border-radius: 4px;
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-text {
      color: var(--ion-color-medium, #8899aa);
      font-size: 15px;
      margin: 0;
    }
  `],
})
export class SearchPage implements OnInit, OnDestroy {
  searchCtrl = new FormControl('');
  items: MediaItem[] = [];
  isLoading = false;
  currentPage = 1;
  totalPages = 1;

  get allLoaded(): boolean {
    return this.currentPage >= this.totalPages;
  }

  private activeQuery = '';
  private tmdbService = inject(TmdbService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Load initial trending content
    this.isLoading = true;
    this.tmdbService.getTrending(1).then((result) => {
      this.items = result.results;
      this.totalPages = result.totalPages;
      this.isLoading = false;
    });

    // Subscribe to search input changes with debounce
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = (query ?? '').trim();
          this.currentPage = 1;
          this.isLoading = true;

          if (!trimmed || trimmed.length < 2) {
            this.activeQuery = '';
            return from(this.tmdbService.getTrending(1));
          } else {
            this.activeQuery = trimmed;
            return from(this.tmdbService.searchMulti(trimmed, 1));
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        this.items = result.results;
        this.totalPages = result.totalPages;
        this.isLoading = false;
      });
  }

  loadMore(event: any): void {
    if (this.allLoaded) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.currentPage++;
    const fetchPromise = this.activeQuery
      ? this.tmdbService.searchMulti(this.activeQuery, this.currentPage)
      : this.tmdbService.getTrending(this.currentPage);

    fetchPromise
      .then((result) => {
        this.items = [...this.items, ...result.results];
        this.totalPages = result.totalPages;
        event.target.complete();
      })
      .catch(() => {
        event.target.complete();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToDetail(item: MediaItem): void {
    this.router.navigate(['/tabs/media', item.mediaType, item.id]);
  }
}
