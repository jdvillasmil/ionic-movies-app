import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MediaCardComponent } from './media-card.component';
import { MediaItem } from '../../../core/services/tmdb.service';

const mockItem: MediaItem = {
  id: 1,
  mediaType: 'movie',
  title: 'Spider-Man',
  year: '2021',
  posterPath: '/abc.jpg',
  voteAverage: 7,
  genreIds: [],
};

describe('MediaCardComponent', () => {
  let component: MediaCardComponent;
  let fixture: ComponentFixture<MediaCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MediaCardComponent);
    component = fixture.componentInstance;
    component.item = mockItem;
    fixture.detectChanges();
  });

  it('should render title and year from MediaItem input', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Spider-Man');
    expect(el.textContent).toContain('2021');
  });

  it('should not crash when posterPath is null', () => {
    component.item = { ...mockItem, posterPath: null };
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component).toBeTruthy();
  });

  it('should accept a MediaItem @Input() named "item"', () => {
    expect(component.item).toEqual(mockItem);
    expect(component.item.title).toBe('Spider-Man');
  });
});
