import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MediaItem } from '../../../core/services/tmdb.service';
import { TmdbImagePipe } from '../../../core/pipes/tmdb-image.pipe';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [DecimalPipe, TmdbImagePipe],
  template: `
    <div class="media-card" (click)="cardTap.emit(item)">
      <div class="poster-wrapper">
        @if (item.posterPath) {
          <img
            [src]="item.posterPath | tmdbImage:'w185'"
            [alt]="item.title"
            class="poster-img"
            loading="lazy"
          />
        } @else {
          <div class="poster-placeholder">
            <svg class="placeholder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
        }
        <span class="score-badge">{{ item.voteAverage | number:'1.1-1' }}</span>
      </div>
      <div class="card-body">
        <p class="card-title">{{ item.title }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .media-card {
      cursor: pointer;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .poster-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 3;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.04);
    }
    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .poster-placeholder {
      width: 100%;
      height: 100%;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .placeholder-icon {
      width: 40%;
      height: 40%;
      color: rgba(255, 255, 255, 0.15);
    }
    .score-badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.72);
      color: #facc15;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .card-body {
      padding: 6px 8px 8px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 600;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--ion-text-color, #f8fafc);
    }
  `],
})
export class MediaCardComponent {
  @Input() item!: MediaItem;
  @Output() cardTap = new EventEmitter<MediaItem>();
}
