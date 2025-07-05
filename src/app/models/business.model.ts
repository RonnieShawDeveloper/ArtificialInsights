// src/app/models/business.model.ts

/**
 * Interface representing a business or location managed by the owner.
 * This model will be used to store and retrieve business details from Firestore.
 */
export interface Business {
  id: string; // Unique identifier for the business/location (e.g., Firestore document ID)
  ownerId: string; // The Firebase UID of the owner who owns this business
  name: string; // Name of the business (e.g., "Artificial Insights HQ", "AI Restaurant - Downtown")
  address: { // Detailed address information
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string; // Business phone number
  description: string; // Detailed description of the business provided by the owner
  type: string; // General type of business (e.g., "Consulting", "Restaurant", "Health Clinic", "Retail")
  legalEntity: string; // Legal entity type (e.g., "LLC", "Sole Proprietorship", "S-Corp", "C-Corp")
  // Add more fields as identified by the AI interview, e.g.,
  // servesAlcohol?: boolean;
  // handlesFood?: boolean;
  // numberOfEmployees?: number;
  // operatesOnline?: boolean;
  createdAt: Date; // Timestamp when the business record was created
  updatedAt: Date; // Timestamp when the business record was last updated
}
