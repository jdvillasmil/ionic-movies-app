import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { MediaDetailPage } from './media-detail.page';
import { TmdbService } from '../core/services/tmdb.service';
import { ReviewService } from '../core/services/review.service';
import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonButton, IonSkeletonText, IonChip, IonBadge, IonRange, IonTextarea, IonItem, IonLabel, IonList, IonListHeader, IonCard, IonCardContent, IonSpinner, ToastController, AlertController } from '@ionic/angular/standalone';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { TmdbImagePipe } from '../core/pipes/tmdb-image.pipe';

const mockDetail = {
  id: 550,
  mediaType: 'movie' as const,
  title: 'Fight Club',
  posterPath: '/poster.jpg',
  overview: 'Overview text',
  releaseDate: '1999-10-15',
  genres: ['Drama', 'Thriller'],
  cast: [],
};

const mockSummary = {
  normalCount: 2,
  normalTotal: 17,
  criticCount: 1,
  criticTotal: 9,
};

const mockReviews = [
  {
    userId: 'user1',
    authorName: 'User One',
    role: 'normal' as const,
    score: 8,
    text: 'Great film',
    createdAt: 1000,
    updatedAt: 1000,
  },
];

const mockUserProfile = {
  uid: 'user1',
  email: 'user1@test.com',
  displayName: 'User One',
  avatarUrl: '',
  role: 'normal' as const,
  createdAt: 1000,
};

function buildComponent(options: {
  currentUser?: any;
  userReview?: any;
  summaryOverride?: any;
}) {
  const tmdbSpy = jasmine.createSpyObj('TmdbService', ['getDetail']);
  tmdbSpy.getDetail.and.returnValue(Promise.resolve(mockDetail));

  const reviewSpy = jasmine.createSpyObj('ReviewService', [
    'getMediaSummary',
    'getReviews',
    'getUserReview',
    'submitReview',
    'editReview',
    'deleteReview',
  ]);
  reviewSpy.getMediaSummary.and.returnValue(
    Promise.resolve(options.summaryOverride !== undefined ? options.summaryOverride : mockSummary)
  );
  reviewSpy.getReviews.and.returnValue(Promise.resolve(mockReviews));
  reviewSpy.getUserReview.and.returnValue(Promise.resolve(options.userReview ?? null));
  reviewSpy.submitReview.and.returnValue(Promise.resolve());
  reviewSpy.editReview.and.returnValue(Promise.resolve());
  reviewSpy.deleteReview.and.returnValue(Promise.resolve());

  const authSpy = jasmine.createSpyObj('AuthService', [], {
    currentUser: options.currentUser ?? null,
    user$: of(options.currentUser ?? null),
  });

  const userSpy = jasmine.createSpyObj('UserService', ['getUserDoc']);
  userSpy.getUserDoc.and.returnValue(of(mockUserProfile));

  const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
  toastSpy.create.and.returnValue(
    Promise.resolve({ present: jasmine.createSpy('present') })
  );

  const alertSpy = jasmine.createSpyObj('AlertController', ['create']);
  alertSpy.create.and.returnValue(
    Promise.resolve({ present: jasmine.createSpy('present') })
  );

  TestBed.configureTestingModule({
    imports: [
      MediaDetailPage,
      ReactiveFormsModule,
      NgIf,
      NgFor,
      DecimalPipe,
      TmdbImagePipe,
      IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
      IonButton, IonSkeletonText, IonChip, IonBadge, IonRange, IonTextarea,
      IonItem, IonLabel, IonList, IonListHeader, IonCard, IonCardContent, IonSpinner,
    ],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ mediaType: 'movie', id: '550' }),
          },
        },
      },
      { provide: TmdbService, useValue: tmdbSpy },
      { provide: ReviewService, useValue: reviewSpy },
      { provide: AuthService, useValue: authSpy },
      { provide: UserService, useValue: userSpy },
      { provide: ToastController, useValue: toastSpy },
      { provide: AlertController, useValue: alertSpy },
    ],
  });

  const fixture = TestBed.createComponent(MediaDetailPage);
  const component = fixture.componentInstance;
  return { fixture, component, reviewSpy, tmdbSpy, authSpy };
}

describe('MediaDetailPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('normalAvg computed getter', () => {
    it('DETL-02: returns 0 when summary is null', () => {
      const { component } = buildComponent({});
      (component as any).summary = null;
      expect(component.normalAvg).toBe(0);
    });

    it('DETL-02: returns 0 when normalCount is 0', () => {
      const { component } = buildComponent({});
      (component as any).summary = {
        normalCount: 0,
        normalTotal: 0,
        criticCount: 0,
        criticTotal: 0,
      };
      expect(component.normalAvg).toBe(0);
    });

    it('DETL-02: returns normalTotal/normalCount rounded to 1 decimal (8.5)', () => {
      const { component } = buildComponent({});
      (component as any).summary = {
        normalCount: 2,
        normalTotal: 17,
        criticCount: 0,
        criticTotal: 0,
      };
      expect(component.normalAvg).toBe(8.5);
    });

    it('DETL-02: returns normalTotal/normalCount rounded to 1 decimal (3.3)', () => {
      const { component } = buildComponent({});
      (component as any).summary = {
        normalCount: 3,
        normalTotal: 10,
        criticCount: 0,
        criticTotal: 0,
      };
      expect(component.normalAvg).toBe(3.3);
    });
  });

  describe('criticAvg computed getter', () => {
    it('DETL-02: returns 0 when summary is null', () => {
      const { component } = buildComponent({});
      (component as any).summary = null;
      expect(component.criticAvg).toBe(0);
    });

    it('DETL-02: returns 0 when criticCount is 0', () => {
      const { component } = buildComponent({});
      (component as any).summary = {
        normalCount: 0,
        normalTotal: 0,
        criticCount: 0,
        criticTotal: 0,
      };
      expect(component.criticAvg).toBe(0);
    });

    it('DETL-02: returns criticTotal/criticCount rounded to 1 decimal (9.0)', () => {
      const { component } = buildComponent({});
      (component as any).summary = {
        normalCount: 0,
        normalTotal: 0,
        criticCount: 1,
        criticTotal: 9,
      };
      expect(component.criticAvg).toBe(9.0);
    });
  });

  describe('isLoggedIn getter', () => {
    it('REVW-04: returns false when currentUser is null', () => {
      const { component } = buildComponent({ currentUser: null });
      expect(component.isLoggedIn).toBe(false);
    });

    it('REVW-04: returns true when currentUser is set', () => {
      const { component } = buildComponent({ currentUser: { uid: 'abc' } });
      expect(component.isLoggedIn).toBe(true);
    });
  });

  describe('ngOnInit()', () => {
    it('DETL-01: loads detail, summary, and reviews in parallel via Promise.all', async () => {
      const { component, tmdbSpy, reviewSpy } = buildComponent({});
      await component.ngOnInit();

      expect(tmdbSpy.getDetail).toHaveBeenCalledWith(550, 'movie');
      expect(reviewSpy.getMediaSummary).toHaveBeenCalledWith('movie_550');
      expect(reviewSpy.getReviews).toHaveBeenCalledWith('movie_550');
      expect((component as any).detail).toEqual(mockDetail);
      expect((component as any).summary).toEqual(mockSummary);
      expect((component as any).reviews).toEqual(mockReviews);
      expect((component as any).isLoading).toBe(false);
    });

    it('REVW-04: isLoggedIn returns false when currentUser is null', async () => {
      const { component } = buildComponent({ currentUser: null });
      await component.ngOnInit();
      expect(component.isLoggedIn).toBe(false);
    });

    it('REVW-04: isLoggedIn returns true when currentUser is set', async () => {
      const { component } = buildComponent({ currentUser: { uid: 'abc' } });
      await component.ngOnInit();
      expect(component.isLoggedIn).toBe(true);
    });

    it('loads user review and profile if logged in', async () => {
      const mockUserReview = {
        userId: 'abc',
        authorName: 'User',
        role: 'normal' as const,
        score: 7,
        text: 'Good',
        createdAt: 1000,
        updatedAt: 1000,
      };
      const { component, reviewSpy } = buildComponent({
        currentUser: { uid: 'abc' },
        userReview: mockUserReview,
      });

      await component.ngOnInit();

      expect(reviewSpy.getUserReview).toHaveBeenCalledWith('movie_550', 'abc');
      expect((component as any).userReview).toEqual(mockUserReview);
      expect((component as any).currentProfile).toEqual(mockUserProfile);
    });

    it('does not call getUserReview if not logged in', async () => {
      const { component, reviewSpy } = buildComponent({ currentUser: null });
      await component.ngOnInit();

      expect(reviewSpy.getUserReview).not.toHaveBeenCalled();
    });
  });
});
