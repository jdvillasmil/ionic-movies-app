import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const TMDB_BASE_URL = 'https://api.themoviedb.org';

export const tmdbInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept TMDB API requests
  if (!req.url.startsWith(TMDB_BASE_URL)) {
    return next(req);
  }

  const { bearerToken, apiKey, language } = environment.tmdb;
  const hasBearer = bearerToken && !bearerToken.startsWith('PLACEHOLDER');

  let modifiedReq = req.clone({
    params: req.params.set('language', language),
  });

  if (hasBearer) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
  } else {
    modifiedReq = modifiedReq.clone({
      params: modifiedReq.params.set('api_key', apiKey),
    });
  }

  return next(modifiedReq);
};
