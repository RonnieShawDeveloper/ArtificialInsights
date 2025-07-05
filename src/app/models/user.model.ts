// src/app/models/user.model.ts

/**
 * Interface representing a user's profile data stored in Firestore.
 * This document will be created for each authenticated user and linked by their UID.
 */
export interface UserProfile {
  uid: string; // The Firebase Authentication User ID (UID)
  email: string; // The user's email address
  firstName?: string; // Optional: User's first name
  lastName?: string; // Optional: User's last name
  createdAt: Date; // Timestamp when the user profile was created
  updatedAt: Date; // Timestamp when the user profile was last updated

  // Subscription related fields
  isSubscribed: boolean; // Indicates if the user has an active subscription
  subscriptionPackageId?: string; // ID of the chosen package (e.g., 'package-main', 'package-pro')
  subscriptionStartDate?: Date; // Date when the subscription started
  // subscriptionEndDate?: Date; // Date when the subscription is expected to end (for annual/trial) - commented out as it might be managed by payment provider
  trialEndDate?: Date; // Date when the 5-day free trial ends
  hasTrialUsed?: boolean; // Flag to check if the trial period has been used before

  // Onboarding related fields
  hasCompletedOnboarding?: boolean; // New field: Indicates if the user has completed the AI onboarding process
}
