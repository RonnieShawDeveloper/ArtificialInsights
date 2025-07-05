// src/app/services/compliance.service.ts
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
import { Observable, of } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ComplianceItem } from '../models/compliance-item.model'; // Import the ComplianceItem model

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private firestore: Firestore;
  private userId: string | null = null;
  private readonly APP_ID = 'artificial-insights-app'; // Consistent with other services

  constructor(private authService: AuthService) {
    this.firestore = this.authService.getFirestoreInstance();

    // Subscribe to auth state to get the userId when it's ready
    this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Only proceed when auth is ready
      switchMap(() => this.authService.currentUser$), // Get the current user
      map(user => user ? user.uid : null) // Extract UID
    ).subscribe(uid => {
      this.userId = uid;
      console.log('ComplianceService initialized with userId:', this.userId);
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
   * Adds a new compliance item for a specific business to Firestore.
   * @param businessId The ID of the business this item belongs to.
   * @param itemData The ComplianceItem object to add (without ID, createdAt, updatedAt, ownerId, businessId).
   * @returns A Promise that resolves with the ID of the newly created compliance item.
   */
  async addComplianceItem(businessId: string, itemData: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'businessId'>): Promise<string> {
    try {
      const path = `${this.getUserDataPath()}/businesses/${businessId}/complianceItems`;
      const complianceCollection = collection(this.firestore, path);
      const newItemRef = await addDoc(complianceCollection, {
        ...itemData,
        ownerId: this.userId, // Ensure ownerId is set
        businessId: businessId, // Ensure businessId is set
        createdAt: serverTimestamp(), // Firestore server timestamp
        updatedAt: serverTimestamp()  // Firestore server timestamp
      });
      console.log('New compliance item added with ID:', newItemRef.id);
      return newItemRef.id;
    } catch (error) {
      console.error('Error adding compliance item:', error);
      throw error;
    }
  }

  /**
   * Gets a real-time stream of all compliance items for a specific business.
   * @param businessId The ID of the business to get items for.
   * @returns An Observable of an array of ComplianceItem objects.
   */
  getComplianceItems(businessId: string): Observable<ComplianceItem[]> {
    return this.authService.isAuthReady$.pipe(
      filter(isReady => isReady), // Wait until auth is ready
      switchMap(() => {
        if (!this.userId) {
          console.warn('getComplianceItems: User not authenticated, returning empty array.');
          return of([]); // Return empty array if no user
        }
        const path = `${this.getUserDataPath()}/businesses/${businessId}/complianceItems`;
        const complianceCollection = collection(this.firestore, path);

        return new Observable<ComplianceItem[]>(observer => {
          const unsubscribe = onSnapshot(complianceCollection, (snapshot) => {
            const items: ComplianceItem[] = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              items.push({
                id: doc.id,
                ...data,
                createdAt: (data['createdAt'] as Timestamp)?.toDate(),
                updatedAt: (data['updatedAt'] as Timestamp)?.toDate(),
                dueDate: (data['dueDate'] as Timestamp)?.toDate() || null,
                nextReviewDate: (data['nextReviewDate'] as Timestamp)?.toDate() || null,
                lastCompletedDate: (data['lastCompletedDate'] as Timestamp)?.toDate() || null
              } as ComplianceItem);
            });
            observer.next(items);
          }, (error) => {
            console.error('Error getting compliance items:', error);
            observer.error(error);
          });

          // Return the unsubscribe function to clean up the listener
          return () => unsubscribe();
        });
      })
    );
  }

  /**
   * Gets a specific compliance item by its ID for a given business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to retrieve.
   * @returns A Promise that resolves with the ComplianceItem object or null if not found.
   */
  async getComplianceItemById(businessId: string, itemId: string): Promise<ComplianceItem | null> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot retrieve compliance item.');
      }
      const path = `${this.getUserDataPath()}/businesses/${businessId}/complianceItems`;
      const itemDocRef = doc(this.firestore, path, itemId);
      const itemSnap = await getDoc(itemDocRef);

      if (itemSnap.exists()) {
        const data = itemSnap.data();
        return {
          id: itemSnap.id,
          ...data,
          createdAt: (data['createdAt'] as Timestamp)?.toDate(),
          updatedAt: (data['updatedAt'] as Timestamp)?.toDate(),
          dueDate: (data['dueDate'] as Timestamp)?.toDate() || null,
          nextReviewDate: (data['nextReviewDate'] as Timestamp)?.toDate() || null,
          lastCompletedDate: (data['lastCompletedDate'] as Timestamp)?.toDate() || null
        } as ComplianceItem;
      } else {
        console.log('No such compliance item document!');
        return null;
      }
    } catch (error) {
      console.error('Error getting compliance item by ID:', error);
      throw error;
    }
  }

  /**
   * Updates an existing compliance item record in Firestore.
   * @param businessId The ID of the business the item belongs to.
   * @param itemId The ID of the compliance item to update.
   * @param updatedData The partial ComplianceItem object with fields to update.
   * @returns A Promise that resolves when the item is updated.
   */
  async updateComplianceItem(businessId: string, itemId: string, updatedData: Partial<Omit<ComplianceItem, 'id' | 'createdAt' | 'ownerId' | 'businessId'>>): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot update compliance item.');
      }
      const path = `${this.getUserDataPath()}/businesses/${businessId}/complianceItems`;
      const itemDocRef = doc(this.firestore, path, itemId);
      await setDoc(itemDocRef, {
        ...updatedData,
        updatedAt: serverTimestamp() // Update timestamp on modification
      }, { merge: true }); // Use merge to update only specified fields
      console.log('Compliance item updated successfully:', itemId);
    } catch (error) {
      console.error('Error updating compliance item:', error);
      throw error;
    }
  }

  /**
   * Deletes a compliance item record from Firestore.
   * @param businessId The ID of the business the item belongs to.
   * @param itemId The ID of the compliance item to delete.
   * @returns A Promise that resolves when the item is deleted.
   */
  async deleteComplianceItem(businessId: string, itemId: string): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error('User not authenticated. Cannot delete compliance item.');
      }
      const path = `${this.getUserDataPath()}/businesses/${businessId}/complianceItems`;
      const itemDocRef = doc(this.firestore, path, itemId);
      await deleteDoc(itemDocRef);
      console.log('Compliance item deleted successfully:', itemId);
    } catch (error) {
      console.error('Error deleting compliance item:', error);
      throw error;
    }
  }
}
