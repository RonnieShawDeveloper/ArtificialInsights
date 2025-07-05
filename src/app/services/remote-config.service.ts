// src/app/services/remote-config.service.ts
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getRemoteConfig,
  RemoteConfig,
  fetchAndActivate,
  getValue,
  setLogLevel
} from 'firebase/remote-config';
import { environment } from '../../environments/environment'; // Import environment for Firebase config

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  private app: FirebaseApp;
  private remoteConfig: RemoteConfig;
  private isInitialized = false;

  constructor() {
    // Initialize Firebase app if it hasn't been already (though AuthService does this)
    // Ensure the app instance is consistent.
    this.app = initializeApp(environment.firebase);
    this.remoteConfig = getRemoteConfig(this.app);

    // Set minimum fetch interval for development (e.g., 5 seconds)
    // In production, use a longer interval (e.g., 12 hours)
    this.remoteConfig.settings.minimumFetchIntervalMillis = environment.production ? 3600000 : 5000;

    // Optional: Set log level for debugging
    // setLogLevel('debug');
  }

  /**
   * Initializes Remote Config: fetches and activates the latest values.
   * This should be called early in your application lifecycle (e.g., in app.config.ts or a guard).
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }
    try {
      console.log('Fetching and activating Remote Config...');
      await fetchAndActivate(this.remoteConfig);
      this.isInitialized = true;
      console.log('Remote Config activated successfully.');
    } catch (error) {
      console.error('Error fetching and activating Remote Config:', error);
      // Handle error, e.g., use default values
    }
  }

  /**
   * Gets a string value from Remote Config by key.
   * Ensures Remote Config is initialized before attempting to get a value.
   * @param key The key of the parameter to retrieve.
   * @returns The string value of the parameter, or an empty string if not found.
   */
  getString(key: string): string {
    if (!this.isInitialized) {
      console.warn(`Remote Config not initialized. Cannot get value for key: ${key}. Returning empty string.`);
      return '';
    }
    return getValue(this.remoteConfig, key).asString();
  }

  /**
   * Gets a boolean value from Remote Config by key.
   * @param key The key of the parameter to retrieve.
   * @returns The boolean value of the parameter, or false if not found.
   */
  getBoolean(key: string): boolean {
    if (!this.isInitialized) {
      console.warn(`Remote Config not initialized. Cannot get value for key: ${key}. Returning false.`);
      return false;
    }
    return getValue(this.remoteConfig, key).asBoolean();
  }

  /**
   * Gets a number value from Remote Config by key.
   * @param key The key of the parameter to retrieve.
   * @returns The number value of the parameter, or 0 if not found.
   */
  getNumber(key: string): number {
    if (!this.isInitialized) {
      console.warn(`Remote Config not initialized. Cannot get value for key: ${key}. Returning 0.`);
      return 0;
    }
    return getValue(this.remoteConfig, key).asNumber();
  }
}
