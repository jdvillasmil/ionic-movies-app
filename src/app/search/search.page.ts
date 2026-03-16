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
  IonList,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { NgFor, NgIf } from '@angular/common';
import { TmdbService, MediaItem } from '../core/services/tmdb.service';
import { MediaCardComponent } from '../shared/components/media-card/media-card.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSkeletonText,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MediaCardComponent,
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

      <ng-container *ngIf="isLoading">
        <ion-list>
          <ion-skeleton-text *ngFor="let _ of [1,2,3,4,5,6]" animated style="width:100%;height:80px;margin-bottom:8px;"></ion-skeleton-text>
        </ion-list>
      </ng-container>

      <ng-container *ngIf="!isLoading">
        <ng-container *ngIf="items.length > 0; else emptyState">
          <ion-list>
            <app-media-card
              *ngFor="let item of items"
              [item]="item"
              (cardTap)="navigateToDetail($event)"
            ></app-media-card>
          </ion-list>
        </ng-container>

        <ng-template #emptyState>
          <div class="ion-text-center ion-padding">
            <p>No se encontraron resultados</p>
          </div>
        </ng-template>
      </ng-container>

      <ion-infinite-scroll
        (ionInfinite)="loadMore($event)"
        [disabled]="allLoaded"
      >
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
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
