import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HomePage } from './home.page';
import { TmdbService } from '../core/services/tmdb.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

const mockResults = [
  { id: 1, mediaType: 'movie' as const, title: 'Movie A', year: '2021', posterPath: '/a.jpg', voteAverage: 7, genreIds: [] },
  { id: 2, mediaType: 'tv' as const, title: 'Show B', year: '2022', posterPath: '/b.jpg', voteAverage: 8, genreIds: [28] },
];

let mockTmdb: any;

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    mockTmdb = {
      getTrending: jasmine.createSpy('getTrending').and.returnValue(
        Promise.resolve({ results: mockResults, totalPages: 3 })
      ),
      discoverMedia: jasmine.createSpy('discoverMedia').and.returnValue(
        Promise.resolve({ results: mockResults, totalPages: 3 })
      ),
      getGenres: jasmine.createSpy('getGenres').and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [HomePage, RouterTestingModule],
      providers: [{ provide: TmdbService, useValue: mockTmdb }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('should create without auth guard (BROW-01)', () => {
    expect(component).toBeTruthy();
  });

  it('BROW-01: calls getTrending(1) on init and populates items array', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit
    flushMicrotasks();
    expect(mockTmdb.getTrending).toHaveBeenCalledWith(1);
    expect(component.items.length).toBe(mockResults.length);
  }));

  it('BROW-05: loadMore() increments page and appends items', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    const initialCount = component.items.length;

    const mockEvent = { target: { complete: jasmine.createSpy('complete'), disabled: false } };
    component.loadMore(mockEvent);
    flushMicrotasks();

    expect(component.currentPage).toBe(2);
    expect(component.items.length).toBe(initialCount + mockResults.length);
    expect(mockEvent.target.complete).toHaveBeenCalled();
  }));

  it('calls discoverMedia instead of getTrending when filters have non-default values', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    mockTmdb.getTrending.calls.reset();
    mockTmdb.discoverMedia.calls.reset();

    component.activeFilters = { genreIds: [28], minScore: 0, yearFrom: null, yearTo: null, sortBy: 'popularity.desc' };
    component.loadItems(true);
    flushMicrotasks();

    expect(mockTmdb.discoverMedia).toHaveBeenCalled();
    expect(mockTmdb.getTrending).not.toHaveBeenCalled();
  }));

  it('hasActiveFilters returns true when genreIds is non-empty', () => {
    component.activeFilters = { genreIds: [28], minScore: 0, yearFrom: null, yearTo: null, sortBy: 'popularity.desc' };
    expect(component.hasActiveFilters).toBeTrue();
  });

  it('hasActiveFilters returns true when minScore > 0', () => {
    component.activeFilters = { genreIds: [], minScore: 5, yearFrom: null, yearTo: null, sortBy: 'popularity.desc' };
    expect(component.hasActiveFilters).toBeTrue();
  });

  it('hasActiveFilters returns true when yearFrom is set', () => {
    component.activeFilters = { genreIds: [], minScore: 0, yearFrom: '2020', yearTo: null, sortBy: 'popularity.desc' };
    expect(component.hasActiveFilters).toBeTrue();
  });

  it('hasActiveFilters returns false for default filter state', () => {
    component.activeFilters = { genreIds: [], minScore: 0, yearFrom: null, yearTo: null, sortBy: 'popularity.desc' };
    expect(component.hasActiveFilters).toBeFalse();
  });
});
