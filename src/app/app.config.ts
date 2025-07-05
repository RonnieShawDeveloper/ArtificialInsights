import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations'; // Import provideAnimations

import { routes } from './app.routes';
import { RemoteConfigService } from './services/remote-config.service'; // Import RemoteConfigService

// Function to initialize Remote Config
function initializeRemoteConfig(remoteConfigService: RemoteConfigService) {
  return () => remoteConfigService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(), // Add provideAnimations for Angular Material
    // Provide APP_INITIALIZER to run RemoteConfigService.initialize() on app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRemoteConfig,
      deps: [RemoteConfigService],
      multi: true // Allows multiple APP_INITIALIZER functions
    }
  ]
};
