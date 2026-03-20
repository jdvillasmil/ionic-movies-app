import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, from, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

export interface MediaItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage: number;
  genreIds: number[];
}

export interface CastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MediaDetail {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  overview: string;
  releaseDate: string;
  genres: string[];
  cast: CastMember[];
}

export interface FilterState {
  genreIds: number[];
  minScore: number;
  yearFrom: string | null;
  yearTo: string | null;
  sortBy: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
}

export interface TmdbPageResult {
  results: MediaItem[];
  totalPages: number;
}

export interface Genre {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private http = inject(HttpClient);
  private firestore = inject(Firestore);

  private readonly BASE = 'https://api.themoviedb.org/3';
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private genreCache: Genre[] = [];

  getTrending(page = 1): Promise<TmdbPageResult> {
    const cacheKey = `trending_p${page}`;
    return this.cacheFirst(cacheKey, () =>
      this.http
        .get<{ results: any[]; total_pages: number }>(`${this.BASE}/trending/all/week`, {
          params: new HttpParams().set('page', String(page)),
        })
        .pipe(
          map((res) => ({
            results: res.results
              .filter((item) => item.media_type !== 'person')
              .map((item) => this.normalize(item)),
            totalPages: res.total_pages,
          }))
        )
    );
  }

  searchMulti(query: string, page = 1): Promise<TmdbPageResult> {
    const cacheKey = `search_${encodeURIComponent(query.toLowerCase())}_p${page}`;
    return this.cacheFirst(cacheKey, () =>
      this.http
        .get<{ results: any[]; total_pages: number }>(`${this.BASE}/search/multi`, {
          params: new HttpParams().set('query', query).set('page', String(page)),
        })
        .pipe(
          map((res) => ({
            results: res.results
              .filter((item) => item.media_type !== 'person')
              .map((item) => this.normalize(item)),
            totalPages: res.total_pages,
          }))
        )
    );
  }

  discoverMedia(filters: FilterState, page = 1): Promise<TmdbPageResult> {
    const cacheKey = `discover_${JSON.stringify({ ...filters, page })}`;
    return this.cacheFirst(cacheKey, () => {
      const movieParams = this.buildDiscoverMovieParams(filters, page);
      const tvParams = this.buildDiscoverTvParams(filters, page);

      return forkJoin([
        this.http.get<{ results: any[]; total_pages: number }>(`${this.BASE}/discover/movie`, {
          params: movieParams,
        }),
        this.http.get<{ results: any[]; total_pages: number }>(`${this.BASE}/discover/tv`, {
          params: tvParams,
        }),
      ]).pipe(
        map(([movieRes, tvRes]) => {
          const movieItems = movieRes.results.map((item) => this.normalize(item, 'movie'));
          const tvItems = tvRes.results.map((item) => this.normalize(item, 'tv'));
          const merged = [...movieItems, ...tvItems];

          // Client-side re-sort of merged results
          if (filters.sortBy === 'vote_average.desc') {
            merged.sort((a, b) => b.voteAverage - a.voteAverage);
          } else if (
            filters.sortBy === 'primary_release_date.desc' ||
            filters.sortBy === 'popularity.desc'
          ) {
            merged.sort((a, b) => b.year.localeCompare(a.year));
          }

          const maxPages = Math.max(movieRes.total_pages, tvRes.total_pages);
          return { results: merged, totalPages: maxPages };
        })
      );
    });
  }

  async getDetail(id: number, mediaType: 'movie' | 'tv'): Promise<MediaDetail> {
    const endpoint =
      mediaType === 'movie'
        ? `${this.BASE}/movie/${id}?append_to_response=credits`
        : `${this.BASE}/tv/${id}?append_to_response=credits`;

    const raw: any = await firstValueFrom(this.http.get<any>(endpoint));

    return {
      id: raw.id,
      mediaType,
      title: mediaType === 'tv' ? (raw.name ?? '') : (raw.title ?? ''),
      posterPath: raw.poster_path ?? null,
      overview: raw.overview ?? '',
      releaseDate: mediaType === 'tv' ? (raw.first_air_date ?? '') : (raw.release_date ?? ''),
      genres: (raw.genres ?? []).map((g: any) => g.name as string),
      cast: (raw.credits?.cast ?? [])
        .slice(0, 10)
        .map((c: any) => ({
          name: c.name as string,
          character: c.character as string,
          profilePath: (c.profile_path ?? null) as string | null,
        })),
    };
  }

  getGenres(): Observable<Genre[]> {
    if (this.genreCache.length > 0) {
      return from(Promise.resolve(this.genreCache));
    }

    return forkJoin([
      this.http.get<{ genres: Genre[] }>(`${this.BASE}/genre/movie/list`),
      this.http.get<{ genres: Genre[] }>(`${this.BASE}/genre/tv/list`),
    ]).pipe(
      map(([movieGenres, tvGenres]) => {
        const combined = [...movieGenres.genres, ...tvGenres.genres];
        const deduped = Array.from(new Map(combined.map((g) => [g.id, g])).values());
        this.genreCache = deduped;
        return deduped;
      })
    );
  }

  private async cacheFirst<T>(cacheKey: string, fetchFn: () => Observable<T>): Promise<T> {
    try {
      const snapshot = await this.firestoreGet(`tmdb_cache/${cacheKey}`);
      if (snapshot.exists()) {
        const data = snapshot.data() as { cachedAt: number; results: T };
        if (Date.now() - data.cachedAt < this.CACHE_TTL_MS) {
          return data.results;
        }
      }
    } catch {
      // Cache unavailable — proceed to fetch from TMDB directly
    }

    return new Promise<T>((resolve, reject) => {
      fetchFn().subscribe({
        next: async (result) => {
          try {
            await this.firestoreSet(`tmdb_cache/${cacheKey}`, { cachedAt: Date.now(), results: result });
          } catch {
            // Cache write failed — ignore, results still returned
          }
          resolve(result);
        },
        error: reject,
      });
    });
  }

  // Protected to allow test override — accepts path string so tests don't need a real Firestore instance
  protected firestoreGet(path: string): Promise<any> {
    const ref = doc(this.firestore, path);
    return getDoc(ref);
  }

  protected firestoreSet(path: string, data: any): Promise<void> {
    const ref = doc(this.firestore, path);
    return setDoc(ref, data);
  }

  private normalize(item: any, forcedMediaType?: 'movie' | 'tv'): MediaItem {
    const mediaType: 'movie' | 'tv' =
      forcedMediaType ?? (item.media_type === 'tv' ? 'tv' : 'movie');

    const title = mediaType === 'tv' ? (item.name ?? item.title ?? '') : (item.title ?? item.name ?? '');

    const rawDate =
      mediaType === 'tv'
        ? (item.first_air_date ?? item.release_date ?? '')
        : (item.release_date ?? item.first_air_date ?? '');

    const year = rawDate ? rawDate.substring(0, 4) : '';

    return {
      id: item.id,
      mediaType,
      title,
      year,
      posterPath: item.poster_path ?? null,
      voteAverage: item.vote_average ?? 0,
      genreIds: item.genre_ids ?? [],
    };
  }

  private buildDiscoverMovieParams(filters: FilterState, page: number): HttpParams {
    let params = new HttpParams()
      .set('page', String(page))
      .set('sort_by', filters.sortBy);

    if (filters.genreIds.length > 0) {
      params = params.set('with_genres', filters.genreIds.join(','));
    }
    if (filters.minScore > 0) {
      params = params.set('vote_average.gte', String(filters.minScore));
    }
    if (filters.yearFrom) {
      params = params.set('primary_release_date.gte', `${filters.yearFrom}-01-01`);
    }
    if (filters.yearTo) {
      params = params.set('primary_release_date.lte', `${filters.yearTo}-12-31`);
    }

    return params;
  }

  private buildDiscoverTvParams(filters: FilterState, page: number): HttpParams {
    // TV sort: translate primary_release_date.desc to first_air_date.desc
    const tvSortBy =
      filters.sortBy === 'primary_release_date.desc'
        ? 'first_air_date.desc'
        : filters.sortBy;

    let params = new HttpParams()
      .set('page', String(page))
      .set('sort_by', tvSortBy);

    if (filters.genreIds.length > 0) {
      params = params.set('with_genres', filters.genreIds.join(','));
    }
    if (filters.minScore > 0) {
      params = params.set('vote_average.gte', String(filters.minScore));
    }
    if (filters.yearFrom) {
      params = params.set('first_air_date.gte', `${filters.yearFrom}-01-01`);
    }
    if (filters.yearTo) {
      params = params.set('first_air_date.lte', `${filters.yearTo}-12-31`);
    }

    return params;
  }
}
