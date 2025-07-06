// src/app/services/compliance.service.ts
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
  onSnapshot,
  serverTimestamp,
  Timestamp // Import Timestamp for explicit conversion
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ComplianceItem } from '../models/compliance-item.model';
import { environment } from '../../environments/environment'; // To get the appId

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private appId: string;

  constructor(private firestore: Firestore) {
    // Determine the appId based on the environment
    this.appId = environment.production ? 'artificial-insights-app' : 'artificial-insights-app'; // Use your actual production appId here
  }

  /**
   * Gets the Firestore collection reference for compliance items within a specific business.
   * Path: /artifacts/{appId}/users/{userId}/businesses/{businessId}/complianceItems
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business.
   * @returns A CollectionReference for the compliance items.
   */
  private getComplianceItemsCollectionRef(userId: string, businessId: string) {
    return collection(this.firestore, 'artifacts', this.appId, 'users', userId, 'businesses', businessId, 'complianceItems');
  }

  /**
   * Gets the Firestore document reference for a specific compliance item.
   * Path: /artifacts/{appId}/users/{userId}/businesses/{businessId}/complianceItems/{itemId}
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item document.
   * @returns A DocumentReference for the compliance item.
   */
  private getComplianceItemDocRef(userId: string, businessId: string, itemId: string) {
    return doc(this.firestore, 'artifacts', this.appId, 'users', userId, 'businesses', businessId, 'complianceItems', itemId);
  }

  /**
   * Fetches compliance items for a specific business in real-time.
   * Uses onSnapshot for continuous updates.
   * @param businessId The ID of the business.
   * @param ownerId The ID of the user who owns the business (ownerId from Business model).
   * @returns An Observable of an array of ComplianceItem objects.
   */
  getComplianceItemsForBusiness(businessId: string, ownerId: string): Observable<ComplianceItem[]> {
    const complianceCollection = this.getComplianceItemsCollectionRef(ownerId, businessId);
    // Query for compliance items where 'businessId' matches and 'ownerId' matches
    const q = query(complianceCollection,
      where('businessId', '==', businessId),
      where('ownerId', '==', ownerId)
    );

    return new Observable<ComplianceItem[]>(observer => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: ComplianceItem[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as any; // Cast to any to access raw properties
          const item: ComplianceItem = {
            id: doc.id, // Firestore document ID
            businessId: data.businessId,
            ownerId: data.ownerId, // New field
            title: data.title,
            description: data.description,
            category: data.category,
            status: data.status,
            dueDate: data.dueDate ? data.dueDate.toDate() : new Date(), // Convert Timestamp to Date
            frequency: data.frequency,
            issuingAuthority: data.issuingAuthority,
            relevantLaws: data.relevantLaws || [],
            requiredDocuments: data.requiredDocuments || [],
            notes: data.notes || '', // New field, ensure it's a string
            attachments: data.attachments || [],
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), // Convert Timestamp to Date
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(), // Convert Timestamp to Date
            lastCompletedDate: data.lastCompletedDate ? data.lastCompletedDate.toDate() : undefined,
            nextReviewDate: data.nextReviewDate ? data.nextReviewDate.toDate() : undefined // New field
          };
          items.push(item);
        });
        observer.next(items);
      }, (error) => {
        console.error('Error getting compliance items:', error);
        observer.error(error);
      });

      // Return the unsubscribe function to clean up the listener when the observable is unsubscribed
      return () => unsubscribe();
    }).pipe(
      catchError(error => {
        console.error('Error in getComplianceItemsForBusiness observable:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Adds a new compliance item for a business.
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business.
   * @param itemData The compliance item data to add.
   * @returns A Promise that resolves with the ID of the new item.
   */
  async addComplianceItem(
    userId: string,
    businessId: string,
    itemData: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt' | 'businessId' | 'ownerId'> // FIX: Corrected type
  ): Promise<string> {
    const complianceCollection = this.getComplianceItemsCollectionRef(userId, businessId);
    const now = serverTimestamp();

    // Prepare data for saving, ensuring all fields match Firestore structure
    const dataToSave = {
      ...itemData,
      businessId: businessId, // Ensure businessId is correctly set from parameter
      ownerId: userId, // Ensure ownerId is correctly set from parameter
      createdAt: now,
      updatedAt: now,
      dueDate: itemData.dueDate instanceof Date ? Timestamp.fromDate(itemData.dueDate) : itemData.dueDate,
      lastCompletedDate: itemData.lastCompletedDate instanceof Date ? Timestamp.fromDate(itemData.lastCompletedDate) : itemData.lastCompletedDate,
      nextReviewDate: itemData.nextReviewDate instanceof Date ? Timestamp.fromDate(itemData.nextReviewDate) : itemData.nextReviewDate,
      relevantLaws: itemData.relevantLaws || [], // Ensure array is saved, even if empty
      requiredDocuments: itemData.requiredDocuments || [], // Ensure array is saved, even if empty
      attachments: itemData.attachments || [], // Ensure array is saved, even if empty
      notes: itemData.notes || '' // Ensure string is saved, even if empty
    };

    try {
      const docRef = await addDoc(complianceCollection, dataToSave);
      console.log(`Compliance item added with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding compliance item:', error);
      throw error;
    }
  }

  /**
   * Updates an existing compliance item.
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to update.
   * @param itemData The partial compliance item data to update.
   * @returns A Promise that resolves when the item is updated.
   */
  async updateComplianceItem(userId: string, businessId: string, itemId: string, itemData: Partial<ComplianceItem>): Promise<void> {
    const complianceItemDoc = this.getComplianceItemDocRef(userId, businessId, itemId);
    const now = serverTimestamp();

    // Prepare data for update, ensuring updatedAt is set
    const dataToUpdate: any = {
      ...itemData,
      updatedAt: now,
    };

    // Convert Date objects to Firestore Timestamps if they are part of the update
    if (itemData.dueDate instanceof Date) {
      dataToUpdate.dueDate = Timestamp.fromDate(itemData.dueDate);
    }
    if (itemData.lastCompletedDate instanceof Date) {
      dataToUpdate.lastCompletedDate = Timestamp.fromDate(itemData.lastCompletedDate);
    }
    if (itemData.nextReviewDate instanceof Date) {
      dataToUpdate.nextReviewDate = Timestamp.fromDate(itemData.nextReviewDate);
    }
    // Ensure arrays are handled gracefully (Firestore can merge arrays, but explicit empty array can be set)
    if (itemData.relevantLaws !== undefined) {
      dataToUpdate.relevantLaws = itemData.relevantLaws;
    }
    if (itemData.requiredDocuments !== undefined) {
      dataToUpdate.requiredDocuments = itemData.requiredDocuments;
    }
    if (itemData.attachments !== undefined) {
      dataToUpdate.attachments = itemData.attachments;
    }
    if (itemData.notes !== undefined) {
      dataToUpdate.notes = itemData.notes;
    }


    try {
      await updateDoc(complianceItemDoc, dataToUpdate);
      console.log(`Compliance item ${itemId} updated successfully.`);
    } catch (error) {
      console.error('Error updating compliance item:', error);
      throw error;
    }
  }

  /**
   * Deletes a compliance item.
   * @param userId The ID of the user who owns the business.
   * @param businessId The ID of the business.
   * @param itemId The ID of the compliance item to delete.
   * @returns A Promise that resolves when the item is deleted.
   */
  async deleteComplianceItem(userId: string, businessId: string, itemId: string): Promise<void> {
    const complianceItemDoc = this.getComplianceItemDocRef(userId, businessId, itemId);
    try {
      await deleteDoc(complianceItemDoc);
      console.log(`Compliance item ${itemId} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting compliance item:', error);
      throw error;
    }
  }
}
