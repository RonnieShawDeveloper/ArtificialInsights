// src/app/models/user.model.ts

export interface UserProfile {
  uid: string; // The Firebase User ID, unique identifier for the user
  email: string; // User's email address
  firstName: string; // User's first name
  lastName: string; // User's last name
  phoneNumber?: string; // Optional: User's phone number (not in your example, but kept optional)
  address?: { // Optional: User's address details (not in your example, but kept optional)
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  hasCompletedOnboarding: boolean; // Flag to indicate if the user has completed the initial onboarding process
  hasTrialUsed: boolean; // New field: Indicates if the user has used their trial
  isSubscribed: boolean; // New field: Indicates if the user is currently subscribed
  subscriptionPackageId: string; // New field: Stores the ID of the selected subscription package
  subscriptionStartDate?: Date; // New field: Timestamp for when the subscription started (optional as it might not be set for non-subscribers)
  trialEndDate?: Date; // New field: Timestamp for when the trial ends (optional if no trial or trial ended)
  createdAt: Date; // Timestamp for when the user profile was created
  updatedAt: Date; // New field: Timestamp for the last update to the user profile (replaces lastLoginAt)
}
