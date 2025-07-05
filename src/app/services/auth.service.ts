// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User
  // Removed signInWithCustomToken, signInAnonymously as they are not typically used in local dev
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { getFirestore, Firestore } from 'firebase/firestore';

// Import the environment configuration
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;
  private _currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this._currentUser.asObservable();
  private _isAuthReady = new BehaviorSubject<boolean>(false);
  public isAuthReady$: Observable<boolean> = this._isAuthReady.asObservable();

  constructor() {
    // Initialize Firebase app using the configuration from the environment file
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    // Set up authentication state listener
    this.initializeAuth();
  }

  /**
   * Initializes Firebase Authentication and sets up an observer for auth state changes.
   * This method ensures that the currentUser$ observable is updated whenever the
   * user's authentication status changes (login, logout).
   *
   * For local development, initial sign-in is handled by explicit user actions
   * (login/signup) rather than anonymous or custom token sign-in.
   */
  private initializeAuth(): void {
    onAuthStateChanged(this.auth, (user) => {
      this._currentUser.next(user);
      this._isAuthReady.next(true); // Mark authentication as ready once initial check is done
      console.log('Firebase Auth State Changed. User:', user ? user.uid : 'None');
    });
  }

  /**
   * Signs in a user with the provided email and password.
   * @param email The user's email.
   * @param password The user's password.
   * @returns A Promise that resolves when the user is signed in.
   */
  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      console.log('User signed in successfully.');
    } catch (error: any) {
      console.error('Sign-in error:', error);
      throw error; // Re-throw to be handled by the component
    }
  }

  /**
   * Creates a new user account with the provided email and password.
   * @param email The user's email.
   * @param password The user's password.
   * @returns A Promise that resolves when the user account is created and signed in.
   */
  async signUp(email: string, password: string): Promise<void> {
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('User account created and signed in successfully.');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      throw error; // Re-throw to be handled by the component
    }
  }

  /**
   * Signs out the current user.
   * @returns A Promise that resolves when the user is signed out.
   */
  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      console.log('User signed out successfully.');
    } catch (error: any) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  /**
   * Returns the current authenticated Firebase user.
   * @returns The current User object or null if not authenticated.
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Returns the Firestore database instance.
   * @returns The Firestore instance.
   */
  getFirestoreInstance(): Firestore {
    return this.db;
  }

  /**
   * Returns the current user's ID.
   * If authenticated, returns Firebase UID. If anonymous, generates a UUID.
   * For Webstorm local dev, anonymous sign-in is not automatically handled here
   * unless explicitly called. Users will typically be authenticated via email/password.
   * If currentUser is null, it means no user is logged in via email/password.
   * We'll return null or handle this as appropriate for your app's flow.
   * For data storage, we'll rely on the actual authenticated user's UID.
   */
  getUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }
}
