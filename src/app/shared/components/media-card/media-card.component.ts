import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonCard, IonCardContent, IonImg } from '@ionic/angular/standalone';
import { MediaItem } from '../../../core/services/tmdb.service';
import { TmdbImagePipe } from '../../../core/pipes/tmdb-image.pipe';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [IonCard, IonCardContent, IonImg, TmdbImagePipe],
  template: `
    <ion-card class="media-card" (click)="cardTap.emit(item)">
      <ion-img [src]="item.posterPath | tmdbImage:'w185'" class="card-poster"></ion-img>
      <ion-card-content class="card-body">
        <p class="card-title">{{ item.title }}</p>
        <p class="card-year">{{ item.year }}</p>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    :host {
      display: block;
    }
    .media-card {
      margin: 0;
      cursor: pointer;
    }
    .card-poster {
      width: 100%;
      aspect-ratio: 2 / 3;
      object-fit: cover;
    }
    .card-body {
      padding: 8px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-year {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
    }
  `],
})
export class MediaCardComponent {
  @Input() item!: MediaItem;
  @Output() cardTap = new EventEmitter<MediaItem>();
}
