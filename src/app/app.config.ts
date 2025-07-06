import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

// Firebase imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config';

import { routes } from './app.routes';
import { RemoteConfigService } from './services/remote-config.service';
import { environment } from '../environments/environment';

// Function to initialize Remote Config
function initializeRemoteConfig(remoteConfigService: RemoteConfigService) {
  return () => remoteConfigService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    // Provide APP_INITIALIZER to run RemoteConfigService.initialize() on app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRemoteConfig,
      deps: [RemoteConfigService],
      multi: true
    },
    // FIX: Directly provide Firebase EnvironmentProviders without importProvidersFrom
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideRemoteConfig(() => getRemoteConfig())
  ]
};
