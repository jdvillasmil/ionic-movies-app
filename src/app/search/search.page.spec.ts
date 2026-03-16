import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { SearchPage } from './search.page';
import { TmdbService } from '../core/services/tmdb.service';
import { RouterTestingModule } from '@angular/router/testing';

const mockResults = [
  { id: 1, mediaType: 'movie' as const, title: 'Movie A', year: '2021', posterPath: '/a.jpg', voteAverage: 7, genreIds: [] },
  { id: 2, mediaType: 'tv' as const, title: 'Show B', year: '2022', posterPath: '/b.jpg', voteAverage: 8, genreIds: [28] },
];

const mockResultsPage2 = [
  { id: 3, mediaType: 'movie' as const, title: 'Movie C', year: '2023', posterPath: '/c.jpg', voteAverage: 6, genreIds: [] },
];

let mockTmdb: any;

describe('SearchPage', () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;

  beforeEach(async () => {
    mockTmdb = {
      searchMulti: jasmine.createSpy('searchMulti').and.returnValue(
        Promise.resolve({ results: mockResults, totalPages: 3 })
      ),
      getTrending: jasmine.createSpy('getTrending').and.returnValue(
        Promise.resolve({ results: mockResults, totalPages: 3 })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SearchPage, RouterTestingModule],
      providers: [{ provide: TmdbService, useValue: mockTmdb }],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
  });

  it('should create without auth guard (guest access — BROW-01)', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    expect(component).toBeTruthy();
  }));

  it('BROW-02: calls getTrending(1) on init and populates items', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit
    flushMicrotasks();
    expect(mockTmdb.getTrending).toHaveBeenCalledWith(1);
    expect(component.items.length).toBe(mockResults.length);
  }));

  it('BROW-02: empty query calls getTrending and populates items', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    mockTmdb.getTrending.calls.reset();

    component.searchCtrl.setValue('');
    tick(300);
    flushMicrotasks();

    expect(mockTmdb.getTrending).toHaveBeenCalledWith(1);
    expect(component.items.length).toBeGreaterThan(0);
  }));

  it('BROW-02: short query (< 2 chars) calls getTrending, not searchMulti', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    mockTmdb.getTrending.calls.reset();
    mockTmdb.searchMulti.calls.reset();

    component.searchCtrl.setValue('s');
    tick(300);
    flushMicrotasks();

    expect(mockTmdb.getTrending).toHaveBeenCalled();
    expect(mockTmdb.searchMulti).not.toHaveBeenCalled();
  }));

  it('BROW-02: query >= 2 chars calls searchMulti with debounce 300ms', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    mockTmdb.searchMulti.calls.reset();

    component.searchCtrl.setValue('spider');
    // Before debounce fires — should not have called searchMulti yet
    expect(mockTmdb.searchMulti).not.toHaveBeenCalled();

    tick(300);
    flushMicrotasks();

    expect(mockTmdb.searchMulti).toHaveBeenCalledWith('spider', 1);
    expect(component.items.length).toBe(mockResults.length);
  }));

  it('BROW-02: rapid typing only fires searchMulti once (debounce cancels intermediate calls)', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    mockTmdb.searchMulti.calls.reset();

    component.searchCtrl.setValue('sp');
    tick(100);
    component.searchCtrl.setValue('spi');
    tick(100);
    component.searchCtrl.setValue('spid');
    tick(300);
    flushMicrotasks();

    expect(mockTmdb.searchMulti).toHaveBeenCalledTimes(1);
    expect(mockTmdb.searchMulti).toHaveBeenCalledWith('spid', 1);
  }));

  it('loadMore() when query active calls searchMulti and appends results', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();

    // Activate a search query
    component.searchCtrl.setValue('spider');
    tick(300);
    flushMicrotasks();

    const initialCount = component.items.length;
    mockTmdb.searchMulti.and.returnValue(
      Promise.resolve({ results: mockResultsPage2, totalPages: 3 })
    );

    const mockEvent = { target: { complete: jasmine.createSpy('complete'), disabled: false } };
    component.loadMore(mockEvent);
    flushMicrotasks();

    expect(component.currentPage).toBe(2);
    expect(mockTmdb.searchMulti).toHaveBeenCalledWith('spider', 2);
    expect(component.items.length).toBe(initialCount + mockResultsPage2.length);
    expect(mockEvent.target.complete).toHaveBeenCalled();
  }));

  it('loadMore() when query empty calls getTrending and appends results', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();

    const initialCount = component.items.length;
    mockTmdb.getTrending.and.returnValue(
      Promise.resolve({ results: mockResultsPage2, totalPages: 3 })
    );

    const mockEvent = { target: { complete: jasmine.createSpy('complete'), disabled: false } };
    component.loadMore(mockEvent);
    flushMicrotasks();

    expect(component.currentPage).toBe(2);
    expect(mockTmdb.getTrending).toHaveBeenCalledWith(2);
    expect(component.items.length).toBe(initialCount + mockResultsPage2.length);
    expect(mockEvent.target.complete).toHaveBeenCalled();
  }));

  it('allLoaded is true when currentPage >= totalPages', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    // After init, totalPages = 3, currentPage = 1
    expect(component.allLoaded).toBeFalse();

    component.currentPage = 3;
    expect(component.allLoaded).toBeTrue();
  }));
});
