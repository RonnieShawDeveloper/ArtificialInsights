// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UserProfile } from '../models/user.model';
import { AuthService } from './auth.service'; // Import AuthService to get current user ID

// Declare __app_id as a global constant for Canvas environment
declare const __app_id: string;

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // FIX: Prepend /artifacts/${appId} to the collection path
  private get usersCollectionPath(): string {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return `artifacts/${appId}/users`;
  }

  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Sets or updates a user's profile in Firestore.
   * @param uid The user's unique ID.
   * @param profileData The profile data to set or update.
   */
  async setUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.firestore, this.usersCollectionPath, uid);
    await setDoc(userDocRef, profileData, { merge: true });
  }

  /**
   * Gets a user's profile from Firestore in real-time.
   * @param uid The user's unique ID.
   * @returns An Observable of the UserProfile or null if not found.
   */
  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.firestore, this.usersCollectionPath, uid);
    return new Observable<UserProfile | null>(observer => {
      getDoc(userDocRef).then((docSnap: any) => {
        if (docSnap.exists()) {
          observer.next({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          observer.next(null);
        }
      }).catch((error: any) => observer.error(error));

      return () => {};
    }).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return of(null);
      })
    );
  }
}
