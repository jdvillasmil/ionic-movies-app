import { Routes } from '@angular/router';

export const tabRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('../home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'search',
    loadComponent: () => import('../search/search.page').then((m) => m.SearchPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('../profile/profile.page').then((m) => m.ProfilePage),
  },
];
