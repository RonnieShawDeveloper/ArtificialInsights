// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserProfile } from '../models/user.model'; // Import the UserProfile model

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore: Firestore;
  private userId: string | null = null;
  private readonly APP_ID = 'artificial-insights-app'; // Consistent with BusinessService

  constructor(private authService: AuthService) {
    this.firestore = this.authService.getFirestoreInstance();

    // Subscribe to auth state to get the userId when it's ready
    this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Only proceed when auth is ready
      switchMap(() => this.authService.currentUser$), // Get the current user
      map(user => user ? user.uid : null) // Extract UID
    ).subscribe(uid => {
      this.userId = uid;
      console.log('UserService initialized with userId:', this.userId);
    });
  }

  /**
   * Gets the path for a specific user's profile document in Firestore.
   * This path adheres to the Firestore Security Rules: /artifacts/{appId}/users/{userId}/data/profile
   * @param uid The Firebase User ID.
   * @returns The document path for the user's profile.
   * @throws Error if uid is not provided.
   */
  private getUserProfileDocPath(uid: string): string {
    if (!uid) {
      throw new Error('User ID (UID) is required to get user profile path.');
    }
    // Corrected path to ensure an even number of segments for a document reference.
    // Path: collection/document/collection/document/collection/document
    // Example: artifacts/artificial-insights-app/users/USER_UID/data/profile
    return `artifacts/${this.APP_ID}/users/${uid}/data/profile`;
  }

  /**
   * Creates or updates a user's profile document in Firestore.
   * This method is called after a user signs up AND when they select a package.
   * It uses setDoc with merge: true to ensure existing fields are not overwritten.
   * @param uid The Firebase User ID of the user.
   * @param profileData The partial UserProfile data to set/update.
   * @returns A Promise that resolves when the profile is set/updated.
   */
  async setUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const profileDocRef = doc(this.firestore, this.getUserProfileDocPath(uid));
      await setDoc(profileDocRef, {
        // Ensure uid, email, isSubscribed are always explicitly set or merged
        uid: uid, // Always set the UID in the document data
        email: profileData.email || '', // Ensure email is set, provide default if not present in partial
        isSubscribed: profileData.isSubscribed ?? false, // Ensure isSubscribed is set, provide default if not present
        ...profileData, // Merge other profile data
        createdAt: profileData.createdAt || serverTimestamp(), // Set createdAt only if not provided
        updatedAt: serverTimestamp() // Always update timestamp on modification
      }, { merge: true }); // Merge ensures it updates existing fields or creates new ones without overwriting
      console.log('User profile set/updated for UID:', uid);
    } catch (error) {
      console.error('Error setting user profile:', error);
      throw error;
    }
  }

  /**
   * Gets a real-time stream of the current user's profile from Firestore.
   * @returns An Observable of the UserProfile object or null if not found.
   */
  getUserProfile(): Observable<UserProfile | null> {
    return this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Wait until auth is ready
      switchMap(() => {
        if (!this.userId) {
          console.warn('getUserProfile: User not authenticated, returning null.');
          return of(null); // Return null if no user
        }
        const profileDocRef = doc(this.firestore, this.getUserProfileDocPath(this.userId));

        return new Observable<UserProfile | null>(observer => {
          const unsubscribe = onSnapshot(profileDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Explicitly provide required fields with fallbacks before casting
              observer.next({
                uid: this.userId, // Use the actual user's UID from the service context
                email: data['email'] || '', // Provide default if missing
                isSubscribed: data['isSubscribed'] ?? false, // Provide default if missing
                ...data, // Spread the rest of the data
                createdAt: (data['createdAt'] as Timestamp)?.toDate(), // Convert Firestore Timestamp to Date
                updatedAt: (data['updatedAt'] as Timestamp)?.toDate(),  // Convert Firestore Timestamp to Date
                subscriptionStartDate: (data['subscriptionStartDate'] as Timestamp)?.toDate(),
                subscriptionEndDate: (data['subscriptionEndDate'] as Timestamp)?.toDate(),
                trialEndDate: (data['trialEndDate'] as Timestamp)?.toDate()
              } as UserProfile);
            } else {
              observer.next(null); // Profile not found
            }
          }, (error) => {
            console.error('Error getting user profile:', error);
            observer.error(error);
          });

          // Return the unsubscribe function to clean up the listener
          return () => unsubscribe();
        });
      })
    );
  }

  /**
   * Gets the current user's profile once (non-realtime).
   * @returns A Promise that resolves with the UserProfile object or null if not found.
   */
  async getProfileOnce(): Promise<UserProfile | null> {
    if (!this.userId) {
      console.warn('getProfileOnce: User not authenticated, returning null.');
      return null;
    }
    try {
      const profileDocRef = doc(this.firestore, this.getUserProfileDocPath(this.userId));
      const snapshot = await getDoc(profileDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        // Explicitly provide required fields with fallbacks before casting
        return {
          uid: this.userId, // Use the actual user's UID from the service context
          email: data['email'] || '', // Provide default if missing
          isSubscribed: data['isSubscribed'] ?? false, // Provide default if missing
          ...data, // Spread the rest of the data
          createdAt: (data['createdAt'] as Timestamp)?.toDate(),
          updatedAt: (data['updatedAt'] as Timestamp)?.toDate(),
          subscriptionStartDate: (data['subscriptionStartDate'] as Timestamp)?.toDate(),
          subscriptionEndDate: (data['subscriptionEndDate'] as Timestamp)?.toDate(),
          trialEndDate: (data['trialEndDate'] as Timestamp)?.toDate()
        } as UserProfile;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile once:', error);
      throw error;
    }
  }
}
