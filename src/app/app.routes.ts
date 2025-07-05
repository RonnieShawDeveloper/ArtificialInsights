// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // Redirect empty path to login for the initial application load
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    title: 'Login - Artificial Insights'
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent),
    title: 'Sign Up - Artificial Insights'
  },
  {
    path: 'onboarding', // New route for the AI-driven onboarding process
    loadComponent: () => import('./onboarding/onboarding.component').then(m => m.OnboardingComponent),
    title: 'Onboarding - Artificial Insights'
  },
  // The dashboard route will now be accessed after onboarding/subscription
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - Artificial Insights'
  },
  // Catch-all for undefined routes
  { path: '**', redirectTo: 'login' }
];
