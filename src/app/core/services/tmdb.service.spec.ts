import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TmdbService, MediaItem, FilterState, TmdbPageResult, MediaDetail } from './tmdb.service';
import { Firestore } from '@angular/fire/firestore';

// Testable subclass that replaces Firestore methods with spies
// Overrides path-based methods so tests don't need a real Firestore instance
@Injectable()
class TestableTmdbService extends TmdbService {
  getDocSpy = jasmine.createSpy('firestoreGet');
  setDocSpy = jasmine.createSpy('firestoreSet');

  setNoCacheHit(): void {
    this.getDocSpy.and.returnValue(
      Promise.resolve({ exists: () => false, data: () => undefined })
    );
    this.setDocSpy.and.returnValue(Promise.resolve());
  }

  setCacheHit(data: unknown): void {
    this.getDocSpy.and.returnValue(
      Promise.resolve({
        exists: () => true,
        data: () => ({ cachedAt: Date.now(), results: data }),
      })
    );
    this.setDocSpy.and.returnValue(Promise.resolve());
  }

  override firestoreGet(_path: string): Promise<any> {
    return this.getDocSpy(_path);
  }

  override firestoreSet(_path: string, data: any): Promise<void> {
    return this.setDocSpy(_path, data);
  }
}

describe('TmdbService', () => {
  let service: TestableTmdbService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: TmdbService, useClass: TestableTmdbService },
        { provide: Firestore, useValue: {} },
      ],
    });

    service = TestBed.inject(TmdbService) as TestableTmdbService;
    httpMock = TestBed.inject(HttpTestingController);
    service.setNoCacheHit();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTrending()', () => {
    it('makes GET to /3/trending/all/week?page=1 and normalizes results', fakeAsync(() => {
      const rawResults = [
        {
          id: 1,
          media_type: 'movie',
          title: 'Spider-Man',
          release_date: '2021-12-17',
          poster_path: '/poster.jpg',
          vote_average: 8.2,
          genre_ids: [28, 12],
        },
        {
          id: 2,
          media_type: 'tv',
          name: 'Breaking Bad',
          first_air_date: '2008-01-20',
          poster_path: '/tv-poster.jpg',
          vote_average: 9.5,
          genre_ids: [18],
        },
        {
          id: 3,
          media_type: 'person',
          name: 'Tom Hanks',
          poster_path: null,
          vote_average: 0,
          genre_ids: [],
        },
      ];

      let result: TmdbPageResult | undefined;
      service.getTrending(1).then((r) => (result = r));

      // Flush the Firestore getDoc promise (cache miss)
      flushMicrotasks();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/trending/all/week') && r.params.get('page') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ results: rawResults, total_pages: 5 });

      // Flush setDoc promise + resolve outer promise
      flushMicrotasks();

      expect(result).toBeDefined();
      expect(result!.totalPages).toBe(5);
      expect(result!.results.length).toBe(2); // person filtered out
      expect(result!.results[0].title).toBe('Spider-Man');
      expect(result!.results[0].mediaType).toBe('movie');
      expect(result!.results[0].year).toBe('2021');
      expect(result!.results[1].title).toBe('Breaking Bad');
      expect(result!.results[1].mediaType).toBe('tv');
      expect(result!.results[1].year).toBe('2008');
    }));
  });

  describe('searchMulti()', () => {
    it('calls Firestore getDoc first; on cache miss calls TMDB API', fakeAsync(() => {
      service.setNoCacheHit();

      let result: TmdbPageResult | undefined;
      service.searchMulti('spider', 1).then((r) => (result = r));

      // Flush the cache miss promise — HTTP call is now initiated
      flushMicrotasks();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/search/multi') && r.params.get('query') === 'spider'
      );
      req.flush({
        results: [
          {
            id: 10,
            media_type: 'movie',
            title: 'Spider-Man',
            release_date: '2021-01-01',
            poster_path: '/p.jpg',
            vote_average: 7.5,
            genre_ids: [28],
          },
        ],
        total_pages: 1,
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      expect(result!.results.length).toBe(1);
      expect(result!.results[0].title).toBe('Spider-Man');
      expect(service.getDocSpy).toHaveBeenCalled();
      expect(service.setDocSpy).toHaveBeenCalled();
    }));

    it('on cache hit returns Firestore data and does NOT call TMDB', fakeAsync(() => {
      const cachedItems: MediaItem[] = [
        {
          id: 10,
          mediaType: 'movie',
          title: 'Spider-Man',
          year: '2021',
          posterPath: '/p.jpg',
          voteAverage: 7.5,
          genreIds: [28],
        },
      ];
      const cachedResult: TmdbPageResult = { results: cachedItems, totalPages: 1 };

      service.setCacheHit(cachedResult);

      let result: TmdbPageResult | undefined;
      service.searchMulti('spider', 1).then((r) => (result = r));

      flushMicrotasks();

      httpMock.expectNone((r) => r.url.includes('/search/multi'));
      expect(result).toBeDefined();
      expect(result!.results[0].title).toBe('Spider-Man');
      expect(service.setDocSpy).not.toHaveBeenCalled();
    }));
  });

  describe('discoverMedia()', () => {
    const baseFilters: FilterState = {
      genreIds: [28],
      minScore: 7,
      yearFrom: '2020',
      yearTo: '2023',
      sortBy: 'vote_average.desc',
    };

    it('sends correct params to discover/movie (primary_release_date) and discover/tv (first_air_date)', fakeAsync(() => {
      service.setNoCacheHit();

      let result: TmdbPageResult | undefined;
      service.discoverMedia(baseFilters, 1).then((r) => (result = r));

      // Flush cache miss promise to trigger HTTP calls
      flushMicrotasks();

      const movieReq = httpMock.expectOne((r) => r.url.includes('/discover/movie'));
      expect(movieReq.request.params.get('with_genres')).toBe('28');
      expect(movieReq.request.params.get('vote_average.gte')).toBe('7');
      expect(movieReq.request.params.get('primary_release_date.gte')).toBe('2020-01-01');
      expect(movieReq.request.params.get('primary_release_date.lte')).toBe('2023-12-31');
      expect(movieReq.request.params.get('sort_by')).toBe('vote_average.desc');

      const tvReq = httpMock.expectOne((r) => r.url.includes('/discover/tv'));
      expect(tvReq.request.params.get('with_genres')).toBe('28');
      expect(tvReq.request.params.get('vote_average.gte')).toBe('7');
      expect(tvReq.request.params.get('first_air_date.gte')).toBe('2020-01-01');
      expect(tvReq.request.params.get('first_air_date.lte')).toBe('2023-12-31');
      expect(tvReq.request.params.get('sort_by')).toBe('vote_average.desc');
      expect(tvReq.request.params.has('primary_release_date.gte')).toBeFalse();

      movieReq.flush({ results: [], total_pages: 1 });
      tvReq.flush({ results: [], total_pages: 1 });

      flushMicrotasks();

      expect(result).toBeDefined();
    }));

    it('maps primary_release_date.desc sort to first_air_date.desc for TV call', fakeAsync(() => {
      service.setNoCacheHit();

      const dateFilters: FilterState = { ...baseFilters, sortBy: 'primary_release_date.desc' };

      let result: TmdbPageResult | undefined;
      service.discoverMedia(dateFilters, 1).then((r) => (result = r));

      flushMicrotasks();

      const movieReq = httpMock.expectOne((r) => r.url.includes('/discover/movie'));
      const tvReq = httpMock.expectOne((r) => r.url.includes('/discover/tv'));

      expect(movieReq.request.params.get('sort_by')).toBe('primary_release_date.desc');
      expect(tvReq.request.params.get('sort_by')).toBe('first_air_date.desc');

      movieReq.flush({ results: [], total_pages: 1 });
      tvReq.flush({ results: [], total_pages: 1 });

      flushMicrotasks();
      expect(result).toBeDefined();
    }));

    it('merges and re-sorts results by vote_average descending', fakeAsync(() => {
      service.setNoCacheHit();

      let result: TmdbPageResult | undefined;
      service.discoverMedia(baseFilters, 1).then((r) => (result = r));

      flushMicrotasks();

      const movieReq = httpMock.expectOne((r) => r.url.includes('/discover/movie'));
      const tvReq = httpMock.expectOne((r) => r.url.includes('/discover/tv'));

      movieReq.flush({
        results: [
          { id: 1, media_type: 'movie', title: 'Movie A', release_date: '2021-01-01', poster_path: null, vote_average: 7.5, genre_ids: [] },
        ],
        total_pages: 1,
      });
      tvReq.flush({
        results: [
          { id: 2, media_type: 'tv', name: 'TV Show B', first_air_date: '2022-01-01', poster_path: null, vote_average: 9.0, genre_ids: [] },
        ],
        total_pages: 1,
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      expect(result!.results.length).toBe(2);
      // Sorted by voteAverage desc: TV Show B (9.0) first
      expect(result!.results[0].voteAverage).toBe(9.0);
      expect(result!.results[1].voteAverage).toBe(7.5);
    }));
  });

  describe('getDetail()', () => {
    const make15Cast = () =>
      Array.from({ length: 15 }, (_, i) => ({
        name: `Actor ${i}`,
        character: `Char ${i}`,
        profile_path: i % 2 === 0 ? `/profile${i}.jpg` : null,
      }));

    it('DETL-01: normalizes movie response — title from raw.title, releaseDate from release_date, genres as string[], top 10 cast', fakeAsync(() => {
      let result: MediaDetail | undefined;
      service.getDetail(550, 'movie').then((r) => (result = r));

      flushMicrotasks();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/movie/550') && r.url.includes('append_to_response=credits')
      );
      expect(req.request.method).toBe('GET');

      req.flush({
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        overview: 'A classic film',
        poster_path: '/poster.jpg',
        genres: [
          { id: 18, name: 'Drama' },
          { id: 53, name: 'Thriller' },
        ],
        credits: { cast: make15Cast() },
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      expect(result!.id).toBe(550);
      expect(result!.mediaType).toBe('movie');
      expect(result!.title).toBe('Fight Club');
      expect(result!.releaseDate).toBe('1999-10-15');
      expect(result!.overview).toBe('A classic film');
      expect(result!.posterPath).toBe('/poster.jpg');
      expect(result!.genres).toEqual(['Drama', 'Thriller']);
      // Cast sliced to top 10
      expect(result!.cast.length).toBe(10);
      expect(result!.cast[0].name).toBe('Actor 0');
      expect(result!.cast[0].character).toBe('Char 0');
      expect(result!.cast[0].profilePath).toBe('/profile0.jpg');
      expect(result!.cast[1].profilePath).toBeNull();
    }));

    it('DETL-01: normalizes TV response — title from raw.name, releaseDate from first_air_date', fakeAsync(() => {
      let result: MediaDetail | undefined;
      service.getDetail(1396, 'tv').then((r) => (result = r));

      flushMicrotasks();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/tv/1396') && r.url.includes('append_to_response=credits')
      );

      req.flush({
        id: 1396,
        name: 'Breaking Bad',
        first_air_date: '2008-01-20',
        overview: 'A chemistry teacher...',
        poster_path: '/bb.jpg',
        genres: [{ id: 18, name: 'Drama' }],
        credits: { cast: make15Cast() },
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      expect(result!.id).toBe(1396);
      expect(result!.mediaType).toBe('tv');
      expect(result!.title).toBe('Breaking Bad');
      expect(result!.releaseDate).toBe('2008-01-20');
      expect(result!.genres).toEqual(['Drama']);
      expect(result!.cast.length).toBe(10);
    }));

    it('DETL-01: passes append_to_response=credits in URL string (not HttpParams)', fakeAsync(() => {
      let result: MediaDetail | undefined;
      service.getDetail(550, 'movie').then((r) => (result = r));

      flushMicrotasks();

      // Verify the URL contains append_to_response=credits as a query string param
      const req = httpMock.expectOne((r) => r.url.includes('/movie/550'));
      // The URL itself should contain append_to_response=credits
      expect(req.request.url).toContain('append_to_response=credits');
      // Interceptor adds language params alongside — verify no collision
      // (The interceptor adds params, but the URL string still includes our param)

      req.flush({
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        overview: '',
        poster_path: null,
        genres: [],
        credits: { cast: [] },
      });

      flushMicrotasks();
      expect(result).toBeDefined();
    }));
  });

  describe('normalize()', () => {
    it('maps movie.title to title and release_date year to year', fakeAsync(() => {
      service.setNoCacheHit();

      let result: TmdbPageResult | undefined;
      service.getTrending(1).then((r) => (result = r));

      flushMicrotasks();

      const req = httpMock.expectOne((r) => r.url.includes('/trending/all/week'));
      req.flush({
        results: [
          {
            id: 5,
            media_type: 'movie',
            title: 'Test Movie',
            release_date: '2023-06-15',
            poster_path: '/poster.jpg',
            vote_average: 6.0,
            genre_ids: [18],
          },
        ],
        total_pages: 1,
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      const item = result!.results[0];
      expect(item.title).toBe('Test Movie');
      expect(item.year).toBe('2023');
      expect(item.posterPath).toBe('/poster.jpg');
      expect(item.voteAverage).toBe(6.0);
      expect(item.genreIds).toEqual([18]);
    }));

    it('maps tv.name to title and first_air_date year for TV items', fakeAsync(() => {
      service.setNoCacheHit();

      let result: TmdbPageResult | undefined;
      service.getTrending(1).then((r) => (result = r));

      flushMicrotasks();

      const req = httpMock.expectOne((r) => r.url.includes('/trending/all/week'));
      req.flush({
        results: [
          {
            id: 6,
            media_type: 'tv',
            name: 'Test Show',
            first_air_date: '2019-04-07',
            poster_path: '/tv.jpg',
            vote_average: 8.8,
            genre_ids: [10765],
          },
        ],
        total_pages: 1,
      });

      flushMicrotasks();

      expect(result).toBeDefined();
      const item = result!.results[0];
      expect(item.title).toBe('Test Show');
      expect(item.year).toBe('2019');
      expect(item.mediaType).toBe('tv');
    }));
  });
});
