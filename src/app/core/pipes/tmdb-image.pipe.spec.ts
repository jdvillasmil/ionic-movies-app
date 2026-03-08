import { TmdbImagePipe } from './tmdb-image.pipe';

describe('TmdbImagePipe', () => {
  let pipe: TmdbImagePipe;

  beforeEach(() => {
    pipe = new TmdbImagePipe();
  });

  it('should return full TMDB URL with w185 size', () => {
    const result = pipe.transform('/abc123.jpg', 'w185');
    expect(result).toBe('https://image.tmdb.org/t/p/w185/abc123.jpg');
  });

  it('should return full TMDB URL with w500 size', () => {
    const result = pipe.transform('/abc123.jpg', 'w500');
    expect(result).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });

  it('should return full TMDB URL with original size', () => {
    const result = pipe.transform('/abc123.jpg', 'original');
    expect(result).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
  });

  it('should return placeholder for null path', () => {
    const result = pipe.transform(null, 'w500');
    expect(result).toBe('assets/img/placeholder-poster.png');
  });

  it('should return placeholder for undefined path', () => {
    const result = pipe.transform(undefined, 'w500');
    expect(result).toBe('assets/img/placeholder-poster.png');
  });

  it('should default to w500 when no size argument provided', () => {
    const result = pipe.transform('/abc123.jpg');
    expect(result).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });
});
