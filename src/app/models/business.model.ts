// src/app/models/business.model.ts

export interface Business {
  id: string; // Unique identifier for the business (Firestore document ID)
  ownerId: string; // The ID of the user who owns this business (matches Firestore 'ownerId')
  name: string; // Name of the business
  address: { // Business address details
    street: string;
    city: string;
    state: string;
    zip: string; // Changed from 'zipCode' to 'zip' to match Firestore
    country: string;
  };
  type: string; // Changed from 'industry' to 'type' to match Firestore (e.g., "Body Shop, collision and paint")
  legalEntity: 'soleProprietorship' | 'llc' | 'corporation' | 'partnership' | 'nonProfit'; // Legal structure of the business
  description: string; // New field: Description of the business
  phone: string; // New field: Business phone number
  employeesCount?: number; // Optional: Number of employees (kept optional as not in your example)
  foundingDate?: Date; // Optional: Date the business was founded (kept optional as not in your example)
  taxId?: string; // Optional: Business Tax ID (e.g., EIN) (kept optional as not in your example)
  stateOfRegistration?: string; // Optional: State where the business is registered (kept optional as not in your example)
  createdAt: Date; // Timestamp for when the business record was created
  updatedAt: Date; // New field: Timestamp for the last update to the business record
}
