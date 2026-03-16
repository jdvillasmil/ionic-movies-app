import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { TmdbService } from '../core/services/tmdb.service';
import { of } from 'rxjs';

const mockTmdb = {
  getTrending: jasmine.createSpy('getTrending').and.returnValue(Promise.resolve({ results: [], totalPages: 1 })),
  discoverMedia: jasmine.createSpy('discoverMedia').and.returnValue(Promise.resolve({ results: [], totalPages: 1 })),
  getGenres: jasmine.createSpy('getGenres').and.returnValue(of([])),
};

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [{ provide: TmdbService, useValue: mockTmdb }],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create without auth guard (BROW-01)', () => {
    expect(component).toBeTruthy();
  });

  xit('BROW-01: guest can see populated home list (implemented in plan 02)', () => {
    // Stub — implemented when HomePage is built
  });

  xit('BROW-05: loadMore() increments page and appends items (implemented in plan 02)', () => {
    // Stub — implemented when HomePage is built
  });
});
