import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchPage } from './search.page';
import { TmdbService } from '../core/services/tmdb.service';
import { of } from 'rxjs';

const mockTmdb = {
  searchMulti: jasmine.createSpy('searchMulti').and.returnValue(Promise.resolve({ results: [], totalPages: 1 })),
  getTrending: jasmine.createSpy('getTrending').and.returnValue(Promise.resolve({ results: [], totalPages: 1 })),
};

describe('SearchPage', () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [{ provide: TmdbService, useValue: mockTmdb }],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  xit('BROW-02: search debounces 300ms and calls searchMulti (implemented in plan 03)', () => {});
  xit('BROW-02: second identical search uses cache — no new TMDB call (verified manually via DevTools)', () => {});
});
