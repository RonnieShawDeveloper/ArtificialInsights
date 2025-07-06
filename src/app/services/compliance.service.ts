// src/app/services/compliance.service.ts
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
import { ComplianceItem } from '../models/compliance-item.model';
import { AuthService } from './auth.service'; // Import AuthService to get current user ID

// Declare __app_id as a global constant for Canvas environment
declare const __app_id: string;

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  // FIX: Dynamically construct the base path for compliance items
  private get complianceItemsBasePath(): string {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return `artifacts/${appId}/users`;
  }

  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Adds a new compliance item for a specific business.
   * @param businessId The ID of the business the compliance item belongs to.
   * @param itemData The compliance item data to add.
   * @returns A Promise that resolves with the ID of the new compliance item.
   */
  async addComplianceItem(businessId: string, itemData: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'businessId'>): Promise<string> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const complianceCollection = collection(this.firestore, `${this.complianceItemsBasePath}/${user.uid}/businesses/${businessId}/complianceItems`);
    const newItem = {
      ...itemData,
      ownerId: user.uid,
      businessId: businessId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await addDoc(complianceCollection, newItem);
    return docRef.id;
  }

  /**
   * Gets a specific compliance item by its ID for a given business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to retrieve.
   * @returns A Promise that resolves with the ComplianceItem object or null if not found.
   */
  async getComplianceItemById(businessId: string, itemId: string): Promise<ComplianceItem | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return null;
    }
    // FIX: Use the dynamic base path
    const itemDocRef = doc(this.firestore, `${this.complianceItemsBasePath}/${user.uid}/businesses/${businessId}/complianceItems`, itemId);
    const docSnap = await getDoc(itemDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ComplianceItem;
    }
    return null;
  }

  /**
   * Updates an existing compliance item for a given business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to update.
   * @param itemData The partial compliance item data to update.
   */
  async updateComplianceItem(businessId: string, itemId: string, itemData: Partial<ComplianceItem>): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const itemDocRef = doc(this.firestore, `${this.complianceItemsBasePath}/${user.uid}/businesses/${businessId}/complianceItems`, itemId);
    await updateDoc(itemDocRef, { ...itemData, updatedAt: new Date() });
  }

  /**
   * Deletes a compliance item for a given business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to delete.
   */
  async deleteComplianceItem(businessId: string, itemId: string): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }
    // FIX: Use the dynamic base path
    const itemDocRef = doc(this.firestore, `${this.complianceItemsBasePath}/${user.uid}/businesses/${businessId}/complianceItems`, itemId);
    await deleteDoc(itemDocRef);
  }

  /**
   * Gets all compliance items for a specific business in real-time.
   * @param businessId The ID of the business whose compliance items to retrieve.
   * @returns An Observable of an array of ComplianceItem objects.
   */
  getComplianceItemsForBusiness(businessId: string): Observable<ComplianceItem[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return from([]); // Return empty array if no user
        }
        // FIX: Use the dynamic base path
        const complianceCollection = collection(this.firestore, `${this.complianceItemsBasePath}/${user.uid}/businesses/${businessId}/complianceItems`);
        // Using collectionData for real-time updates
        return collectionData(complianceCollection, { idField: 'id' }).pipe(
          map(items => items as ComplianceItem[])
        );
      })
    );
  }
}
