// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp // Import Timestamp for explicit conversion if needed
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UserProfile } from '../models/user.model';
import { AuthService } from './auth.service'; // Assuming AuthService provides the current user UID
import { environment } from '../../environments/environment'; // To get the appId

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private appId: string;

  constructor(
    private firestore: Firestore,
    private authService: AuthService // Inject AuthService to get the current user's UID
  ) {
    // Determine the appId based on the environment
    this.appId = environment.production ? 'artificial-insights-app' : 'artificial-insights-app'; // Use your actual production appId here
  }

  /**
   * Gets the Firestore document reference for a user's profile.
   * @param uid The user's unique ID.
   * @returns A DocumentReference for the user's profile.
   */
  private getUserProfileDocRef(uid: string) {
    // Construct the correct path: /artifacts/{appId}/users/{userId}/data/profile
    return doc(this.firestore, 'artifacts', this.appId, 'users', uid, 'data', 'profile');
  }

  /**
   * Fetches a user's profile in real-time.
   * @param uid The user's unique ID.
   * @returns An Observable of UserProfile or null if not found.
   */
  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userProfileDoc = this.getUserProfileDocRef(uid);

    return docData(userProfileDoc, { idField: 'uid' }).pipe(
      map(data => {
        if (!data) {
          console.log(`No user profile found for UID: ${uid} at path: ${userProfileDoc.path}`);
          return null;
        }
        // Explicitly cast to any first to access raw properties, then map to UserProfile
        const rawData = data as any;

        // Convert Firestore Timestamps to JavaScript Date objects
        const userProfile: UserProfile = {
          uid: rawData.uid,
          email: rawData.email || '', // Ensure email is always a string, even if empty
          firstName: rawData.firstName,
          lastName: rawData.lastName,
          phoneNumber: rawData.phoneNumber,
          address: rawData.address ? {
            street: rawData.address.street,
            city: rawData.address.city,
            state: rawData.address.state,
            zipCode: rawData.address.zip, // Map 'zip' from Firestore to 'zipCode' in model
            country: rawData.address.country
          } : undefined,
          hasCompletedOnboarding: rawData.hasCompletedOnboarding,
          hasTrialUsed: rawData.hasTrialUsed,
          isSubscribed: rawData.isSubscribed,
          subscriptionPackageId: rawData.subscriptionPackageId,
          subscriptionStartDate: rawData.subscriptionStartDate ? rawData.subscriptionStartDate.toDate() : undefined,
          trialEndDate: rawData.trialEndDate ? rawData.trialEndDate.toDate() : undefined,
          createdAt: rawData.createdAt ? rawData.createdAt.toDate() : new Date(), // Provide default if missing
          updatedAt: rawData.updatedAt ? rawData.updatedAt.toDate() : new Date() // Provide default if missing
        };
        return userProfile;
      }),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return of(null); // Return null on error
      })
    );
  }

  /**
   * Creates a new user profile document.
   * This should be called once when a new user signs up or completes initial setup.
   * @param uid The user's unique ID.
   * @param profileData The initial user profile data.
   * @returns A Promise that resolves when the profile is created.
   */
  async createUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    const userProfileDoc = this.getUserProfileDocRef(uid);
    const now = serverTimestamp(); // Firestore server timestamp

    // Prepare data to be saved, ensuring new fields are included and dates are handled
    const dataToSave = {
      ...profileData,
      uid: uid, // Ensure UID is explicitly set in the document
      createdAt: now,
      updatedAt: now,
      hasCompletedOnboarding: profileData.hasCompletedOnboarding || false,
      hasTrialUsed: profileData.hasTrialUsed || false,
      isSubscribed: profileData.isSubscribed || false,
      subscriptionPackageId: profileData.subscriptionPackageId || 'free', // Default to 'free' package
      // subscriptionStartDate and trialEndDate should be handled by the calling component if applicable
      // Example: subscriptionStartDate: profileData.subscriptionStartDate ? Timestamp.fromDate(profileData.subscriptionStartDate) : undefined,
      // Example: trialEndDate: profileData.trialEndDate ? Timestamp.fromDate(profileData.trialEndDate) : undefined,
    };

    try {
      await setDoc(userProfileDoc, dataToSave, { merge: true }); // Use merge: true to avoid overwriting existing fields
      console.log(`User profile for ${uid} created/updated successfully.`);
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error; // Re-throw to allow component to handle
    }
  }

  /**
   * Updates an existing user profile document.
   * @param uid The user's unique ID.
   * @param profileData The partial user profile data to update.
   * @returns A Promise that resolves when the profile is updated.
   */
  async updateUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    const userProfileDoc = this.getUserProfileDocRef(uid);
    const now = serverTimestamp(); // Firestore server timestamp

    // Prepare data for update, ensuring updatedAt is set
    const dataToUpdate = {
      ...profileData,
      updatedAt: now,
      // Convert Date objects to Firestore Timestamps if they are part of the update
      subscriptionStartDate: profileData.subscriptionStartDate instanceof Date ? Timestamp.fromDate(profileData.subscriptionStartDate) : profileData.subscriptionStartDate,
      trialEndDate: profileData.trialEndDate instanceof Date ? Timestamp.fromDate(profileData.trialEndDate) : profileData.trialEndDate,
    };

    try {
      await updateDoc(userProfileDoc, dataToUpdate as any); // Use 'as any' for partial updates with serverTimestamp
      console.log(`User profile for ${uid} updated successfully.`);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}
