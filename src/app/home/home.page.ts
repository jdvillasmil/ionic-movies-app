import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonModal,
  IonChip,
  IonLabel,
  IonRange,
  IonSkeletonText,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { optionsOutline } from 'ionicons/icons';
import { TmdbService, MediaItem, FilterState, Genre } from '../core/services/tmdb.service';
import { MediaCardComponent } from '../shared/components/media-card/media-card.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonModal,
    IonChip,
    IonLabel,
    IonRange,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    MediaCardComponent,
  ],
})
export class HomePage implements OnInit {
  private tmdbService = inject(TmdbService);
  private router = inject(Router);

  items: MediaItem[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  filterModalOpen = false;
  genres: Genre[] = [];

  activeFilters: FilterState = {
    genreIds: [],
    minScore: 0,
    yearFrom: null,
    yearTo: null,
    sortBy: 'popularity.desc',
  };

  skeletonItems = Array(10).fill(null);

  get allLoaded(): boolean {
    return this.currentPage >= this.totalPages;
  }

  get hasActiveFilters(): boolean {
    return (
      this.activeFilters.genreIds.length > 0 ||
      this.activeFilters.minScore > 0 ||
      this.activeFilters.yearFrom != null ||
      this.activeFilters.yearTo != null
    );
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.activeFilters.genreIds.length > 0) count++;
    if (this.activeFilters.minScore > 0) count++;
    if (this.activeFilters.yearFrom != null) count++;
    if (this.activeFilters.yearTo != null) count++;
    return count;
  }

  constructor() {
    addIcons({ optionsOutline });
  }

  ngOnInit(): void {
    this.loadGenres();
    this.loadItems(true);
  }

  async loadItems(reset = false): Promise<void> {
    if (reset) {
      this.currentPage = 1;
      this.items = [];
      this.isLoading = true;
    }

    try {
      const result = this.hasActiveFilters
        ? await this.tmdbService.discoverMedia(this.activeFilters, this.currentPage)
        : await this.tmdbService.getTrending(this.currentPage);

      if (reset) {
        this.items = result.results;
      } else {
        this.items = [...this.items, ...result.results];
      }
      this.totalPages = result.totalPages;
    } finally {
      this.isLoading = false;
    }
  }

  async loadMore(event: any): Promise<void> {
    if (this.allLoaded) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }

    this.currentPage++;
    try {
      const result = this.hasActiveFilters
        ? await this.tmdbService.discoverMedia(this.activeFilters, this.currentPage)
        : await this.tmdbService.getTrending(this.currentPage);
      this.items = [...this.items, ...result.results];
      this.totalPages = result.totalPages;
    } finally {
      event.target.complete();
      if (this.allLoaded) {
        event.target.disabled = true;
      }
    }
  }

  loadGenres(): void {
    this.tmdbService.getGenres().subscribe((genres) => {
      this.genres = genres;
    });
  }

  onFilterChange(): void {
    this.loadItems(true);
  }

  toggleGenre(genreId: number): void {
    const idx = this.activeFilters.genreIds.indexOf(genreId);
    if (idx > -1) {
      this.activeFilters = {
        ...this.activeFilters,
        genreIds: this.activeFilters.genreIds.filter((id) => id !== genreId),
      };
    } else {
      this.activeFilters = {
        ...this.activeFilters,
        genreIds: [...this.activeFilters.genreIds, genreId],
      };
    }
    this.onFilterChange();
  }

  setSortBy(sortBy: FilterState['sortBy']): void {
    this.activeFilters = { ...this.activeFilters, sortBy };
    this.onFilterChange();
  }

  isGenreActive(genreId: number): boolean {
    return this.activeFilters.genreIds.includes(genreId);
  }

  navigateToDetail(item: MediaItem): void {
    this.router.navigate(['/tabs/media', item.mediaType, item.id]);
  }
}
