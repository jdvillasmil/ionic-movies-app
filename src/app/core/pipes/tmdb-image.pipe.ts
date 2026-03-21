import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

const PLACEHOLDER = 'assets/img/placeholder-poster.png';

@Pipe({
  name: 'tmdbImage',
  standalone: true,
  pure: true,
})
export class TmdbImagePipe implements PipeTransform {
  transform(path: string | null | undefined, size: TmdbImageSize = 'w500'): string {
    if (!path) {
      return PLACEHOLDER;
    }
    return `${environment.tmdb.imageBaseUrl}${size}${path}`;
  }
}
