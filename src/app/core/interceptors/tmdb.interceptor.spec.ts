import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { tmdbInterceptor } from './tmdb.interceptor';

describe('tmdbInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tmdbInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should add language=es-ES param to TMDB requests', () => {
    http.get('https://api.themoviedb.org/3/movie/popular').subscribe();
    const req = httpTesting.expectOne((r) =>
      r.url.startsWith('https://api.themoviedb.org')
    );
    expect(req.request.params.get('language')).toBe('es-ES');
    req.flush({});
  });

  it('should add Authorization Bearer header to TMDB requests', () => {
    http.get('https://api.themoviedb.org/3/movie/popular').subscribe();
    const req = httpTesting.expectOne((r) =>
      r.url.startsWith('https://api.themoviedb.org')
    );
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush({});
  });

  it('should NOT modify non-TMDB requests (Firebase calls untouched)', () => {
    const firebaseUrl =
      'https://firestore.googleapis.com/v1/projects/test/databases';
    http.get(firebaseUrl).subscribe();
    const req = httpTesting.expectOne(firebaseUrl);
    expect(req.request.params.get('language')).toBeNull();
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });

  it('should NOT modify requests to other non-TMDB APIs', () => {
    const otherUrl = 'https://example.com/api/data';
    http.get(otherUrl).subscribe();
    const req = httpTesting.expectOne(otherUrl);
    expect(req.request.params.get('language')).toBeNull();
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });
});
