// src/app/services/business.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  collectionData
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Business } from '../models/business.model';
import { AuthService } from './auth.service'; // Import AuthService to get current user ID

// Declare __app_id as a global constant for Canvas environment
declare const __app_id: string;

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  // FIX: Dynamically construct the base path for businesses
  private get businessesBasePath(): string {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return `artifacts/${appId}/users`;
  }

  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Adds a new business for the current user.
   * @param businessData The business data to add.
   * @returns A Promise that resolves with the ID of the new business.
   */
  async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const businessesCollection = collection(this.firestore, `${this.businessesBasePath}/${user.uid}/businesses`);
    const newBusiness = {
      ...businessData,
      ownerId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await addDoc(businessesCollection, newBusiness);
    return docRef.id;
  }

  /**
   * Gets a specific business by its ID for the current user.
   * @param businessId The ID of the business to retrieve.
   * @returns A Promise that resolves with the Business object or null if not found.
   */
  async getBusinessById(businessId: string): Promise<Business | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return null;
    }
    // FIX: Use the dynamic base path
    const businessDocRef = doc(this.firestore, `${this.businessesBasePath}/${user.uid}/businesses`, businessId);
    const docSnap = await getDoc(businessDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Business;
    }
    return null;
  }

  /**
   * Updates an existing business for the current user.
   * @param businessId The ID of the business to update.
   * @param businessData The partial business data to update.
   */
  async updateBusiness(businessId: string, businessData: Partial<Business>): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const businessDocRef = doc(this.firestore, `${this.businessesBasePath}/${user.uid}/businesses`, businessId);
    await updateDoc(businessDocRef, { ...businessData, updatedAt: new Date() });
  }

  /**
   * Deletes a business for the current user.
   * @param businessId The ID of the business to delete.
   */
  async deleteBusiness(businessId: string): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const businessDocRef = doc(this.firestore, `${this.businessesBasePath}/${user.uid}/businesses`, businessId);
    await deleteDoc(businessDocRef);
  }

  /**
   * Gets all businesses for a specific user in real-time.
   * @param userId The ID of the user whose businesses to retrieve.
   * @returns An Observable of an array of Business objects.
   */
  getBusinessesForUser(userId: string): Observable<Business[]> {
    // FIX: Use the dynamic base path
    const businessesCollection = collection(this.firestore, `${this.businessesBasePath}/${userId}/businesses`);
    return collectionData(businessesCollection, { idField: 'id' }).pipe(
      map(businesses => businesses as Business[])
    );
  }
}
