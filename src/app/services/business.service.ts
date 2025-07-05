// src/app/services/business.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Business } from '../models/business.model'; // Import the Business model

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private firestore: Firestore;
  private userId: string | null = null;
  // Define a constant for the appId. In a real Angular app, this could come from
  // environment.ts or be dynamically determined if you have multiple Angular apps
  // sharing the same Firebase project. For now, we'll use a default.
  private readonly APP_ID = 'artificial-insights-app'; // Unique identifier for this application within Firestore

  constructor(private authService: AuthService) {
    this.firestore = this.authService.getFirestoreInstance();

    // Subscribe to auth state to get the userId when it's ready
    this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Only proceed when auth is ready
      switchMap(() => this.authService.currentUser$), // Get the current user
      map(user => user ? user.uid : null) // Extract UID
    ).subscribe(uid => {
      this.userId = uid;
      console.log('BusinessService initialized with userId:', this.userId);
    });
  }

  /**
   * Gets the base path for a user's private data in Firestore.
   * This path adheres to the Firestore Security Rules: /artifacts/{appId}/users/{userId}/
   * @returns The base collection path for the current user's data.
   * @throws Error if userId is not available (user not authenticated).
   */
  private getUserDataPath(): string {
    if (!this.userId) {
      throw new Error('User not authenticated. Cannot access user-specific data.');
    }
    return `artifacts/${this.APP_ID}/users/${this.userId}`;
  }

  /**
   * Adds a new business for the current user to Firestore.
   * @param businessData The Business object to add (without ID).
   * @returns A Promise that resolves with the ID of the newly created business.
   */
  async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> {
    try {
      const path = `${this.getUserDataPath()}/businesses`;
      const businessesCollection = collection(this.firestore, path);
      const newBusinessRef = await addDoc(businessesCollection, {
        ...businessData,
        ownerId: this.userId, // Ensure ownerId is set
        createdAt: serverTimestamp(), // Firestore server timestamp
        updatedAt: serverTimestamp()  // Firestore server timestamp
      });
      console.log('New business added with ID:', newBusinessRef.id);
      return newBusinessRef.id;
    } catch (error) {
      console.error('Error adding business:', error);
      throw error;
    }
  }

  /**
   * Gets a real-time stream of all businesses for the current user.
   * @returns An Observable of an array of Business objects.
   */
  getBusinesses(): Observable<Business[]> {
    return this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Wait until auth is ready
      switchMap(() => {
        if (!this.userId) {
          console.warn('getBusinesses: User not authenticated, returning empty array.');
          return of([]); // Return empty array if no user
        }
        const path = `${this.getUserDataPath()}/businesses`;
        const businessesCollection = collection(this.firestore, path);

        // Create a query to filter by ownerId (though security rules already enforce this)
        // const q = query(businessesCollection, where('ownerId', '==', this.userId));

        return new Observable<Business[]>(observer => {
          const unsubscribe = onSnapshot(businessesCollection, (snapshot) => { // Use businessesCollection directly
            const businesses: Business[] = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              businesses.push({
                id: doc.id,
                ...data,
                createdAt: (data['createdAt'] as Timestamp)?.toDate(), // Convert Firestore Timestamp to Date
                updatedAt: (data['updatedAt'] as Timestamp)?.toDate()  // Convert Firestore Timestamp to Date
              } as Business); // Cast to Business interface
            });
            observer.next(businesses);
          }, (error) => {
            console.error('Error getting businesses:', error);
            observer.error(error);
          });

          // Return the unsubscribe function to clean up the listener
          return () => unsubscribe();
        });
      })
    );
  }

  /**
   * Gets a specific business by its ID for the current user.
   * @param businessId The ID of the business to retrieve.
   * @returns A Promise that resolves with the Business object or null if not found.
   */
  async getBusinessById(businessId: string): Promise<Business | null> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot retrieve business.');
      }
      const path = `${this.getUserDataPath()}/businesses`;
      const businessDocRef = doc(this.firestore, path, businessId);
      const businessSnap = await getDoc(businessDocRef);

      if (businessSnap.exists()) {
        const data = businessSnap.data();
        return {
          id: businessSnap.id,
          ...data,
          createdAt: (data['createdAt'] as Timestamp)?.toDate(),
          updatedAt: (data['updatedAt'] as Timestamp)?.toDate()
        } as Business;
      } else {
        console.log('No such business document!');
        return null;
      }
    } catch (error) {
      console.error('Error getting business by ID:', error);
      throw error;
    }
  }

  /**
   * Updates an existing business record in Firestore.
   * @param businessId The ID of the business to update.
   * @param updatedData The partial Business object with fields to update.
   * @returns A Promise that resolves when the business is updated.
   */
  async updateBusiness(businessId: string, updatedData: Partial<Omit<Business, 'id' | 'createdAt' | 'ownerId'>>): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot update business.');
      }
      const path = `${this.getUserDataPath()}/businesses`;
      const businessDocRef = doc(this.firestore, path, businessId);
      await setDoc(businessDocRef, {
        ...updatedData,
        updatedAt: serverTimestamp() // Update timestamp on modification
      }, { merge: true }); // Use merge to update only specified fields
      console.log('Business updated successfully:', businessId);
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  /**
   * Deletes a business record from Firestore.
   * @param businessId The ID of the business to delete.
   * @returns A Promise that resolves when the business is deleted.
   */
  async deleteBusiness(businessId: string): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot delete business.');
      }
      const path = `${this.getUserDataPath()}/businesses`;
      const businessDocRef = doc(this.firestore, path, businessId);
      await deleteDoc(businessDocRef);
      console.log('Business deleted successfully:', businessId);
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }
}
