// src/app/services/business.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp // Import Timestamp for explicit conversion if needed
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Business } from '../models/business.model';
import { environment } from '../../environments/environment'; // To get the appId

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private appId: string;

  constructor(private firestore: Firestore) {
    // Determine the appId based on the environment
    this.appId = environment.production ? 'artificial-insights-app' : 'artificial-insights-app'; // Use your actual production appId here
  }

  /**
   * Gets the Firestore collection reference for a user's businesses.
   * Path: /artifacts/{appId}/users/{userId}/businesses
   * @param userId The ID of the user whose businesses are being accessed.
   * @returns A CollectionReference for the businesses.
   */
  private getBusinessesCollectionRef(userId: string) {
    return collection(this.firestore, 'artifacts', this.appId, 'users', userId, 'businesses');
  }

  /**
   * Gets the Firestore document reference for a specific business.
   * Path: /artifacts/{appId}/users/{userId}/businesses/{businessId}
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business document.
   * @returns A DocumentReference for the business.
   */
  private getBusinessDocRef(userId: string, businessId: string) {
    return doc(this.firestore, 'artifacts', this.appId, 'users', userId, 'businesses', businessId);
  }

  /**
   * Fetches businesses for a specific user in real-time.
   * Uses onSnapshot for continuous updates.
   * @param userId The ID of the user.
   * @returns An Observable of an array of Business objects.
   */
  getBusinessesForUser(userId: string): Observable<Business[]> {
    const businessesCollection = this.getBusinessesCollectionRef(userId);
    // Query for businesses where 'ownerId' matches the provided userId
    const q = query(businessesCollection, where('ownerId', '==', userId));

    return new Observable<Business[]>(observer => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const businesses: Business[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as any; // Cast to any to access raw properties
          const business: Business = {
            id: doc.id, // Firestore document ID
            ownerId: data.ownerId,
            name: data.name,
            address: {
              street: data.address.street,
              city: data.address.city,
              state: data.address.state,
              zip: data.address.zip, // Matches Firestore 'zip'
              country: data.address.country
            },
            type: data.type, // Matches Firestore 'type'
            legalEntity: data.legalEntity,
            description: data.description, // New field
            phone: data.phone, // New field
            employeesCount: data.employeesCount,
            foundingDate: data.foundingDate ? data.foundingDate.toDate() : undefined,
            taxId: data.taxId,
            stateOfRegistration: data.stateOfRegistration,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), // Convert Timestamp to Date
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date() // Convert Timestamp to Date
          };
          businesses.push(business);
        });
        observer.next(businesses);
      }, (error) => {
        console.error('Error getting businesses:', error);
        observer.error(error);
      });

      // Return the unsubscribe function to clean up the listener when the observable is unsubscribed
      return () => unsubscribe();
    }).pipe(
      catchError(error => {
        console.error('Error in getBusinessesForUser observable:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Adds a new business for a user.
   * @param userId The ID of the user.
   * @param businessData The business data to add.
   * @returns A Promise that resolves with the ID of the new business.
   */
  async addBusiness(userId: string, businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> { // FIX: Added 'ownerId' to Omit
    const businessesCollection = this.getBusinessesCollectionRef(userId);
    const now = serverTimestamp();

    // Prepare data for saving, ensuring all fields match Firestore structure
    const dataToSave = {
      ...businessData,
      ownerId: userId, // Ensure ownerId is correctly set to the current user's ID
      createdAt: now,
      updatedAt: now,
      // Convert Date objects to Firestore Timestamps if they are part of businessData
      foundingDate: businessData.foundingDate instanceof Date ? Timestamp.fromDate(businessData.foundingDate) : businessData.foundingDate,
      address: {
        street: businessData.address.street,
        city: businessData.address.city,
        state: businessData.address.state,
        zip: businessData.address.zip, // Ensure 'zip' is used here
        country: businessData.address.country
      },
      // Ensure 'type' is used instead of 'industry'
      type: businessData.type
    };

    try {
      const docRef = await addDoc(businessesCollection, dataToSave);
      console.log(`Business added with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding business:', error);
      throw error;
    }
  }

  /**
   * Updates an existing business.
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business to update.
   * @param businessData The partial business data to update.
   * @returns A Promise that resolves when the business is updated.
   */
  async updateBusiness(userId: string, businessId: string, businessData: Partial<Business>): Promise<void> {
    const businessDoc = this.getBusinessDocRef(userId, businessId);
    const now = serverTimestamp();

    // Prepare data for update, ensuring updatedAt is set
    const dataToUpdate: any = {
      ...businessData,
      updatedAt: now,
    };

    // Handle nested address object update if present
    if (businessData.address) {
      dataToUpdate.address = {
        ...businessData.address,
        zip: businessData.address.zip // Ensure 'zip' is used here
      };
    }

    // Convert Date objects to Firestore Timestamps if they are part of the update
    if (businessData.foundingDate instanceof Date) {
      dataToUpdate.foundingDate = Timestamp.fromDate(businessData.foundingDate);
    }
    // Ensure 'type' is used instead of 'industry' if present in update
    if (businessData.type) {
      dataToUpdate.type = businessData.type;
    }

    try {
      await updateDoc(businessDoc, dataToUpdate);
      console.log(`Business ${businessId} updated successfully.`);
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  /**
   * Deletes a business.
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business to delete.
   * @returns A Promise that resolves when the business is deleted.
   */
  async deleteBusiness(userId: string, businessId: string): Promise<void> {
    const businessDoc = this.getBusinessDocRef(userId, businessId);
    try {
      await deleteDoc(businessDoc);
      console.log(`Business ${businessId} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }
}
