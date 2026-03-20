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
        <img
          [src]="item.posterPath | tmdbImage:'w185'"
          [alt]="item.title"
          class="poster-img"
          loading="lazy"
        />
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
