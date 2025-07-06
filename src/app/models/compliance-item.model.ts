// src/app/models/compliance-item.model.ts

export enum ComplianceStatus {
  TODO = 'TODO',
  UPCOMING = 'UPCOMING',
  COMPLETED = 'COMPLETED'
}

export enum ComplianceCategory {
  // Add or confirm categories based on your actual data, e.g.:
  TAXES = 'Taxes',
  LICENSES = 'Licenses',
  SAFETY = 'Safety',
  HR_EMPLOYEE_LAW = 'HR & Employee Law',
  INSURANCE = 'Business Insurance',
  REGULATORY_GUIDANCE = 'Advanced Regulatory Guidance',
  ENVIRONMENTAL = 'Environmental', // Example of another potential category
  HEALTH_SAFETY = 'Health & Safety', // Example of another potential category
  PERMITS = 'Permits' // Example of another potential category
  // ... add any other categories you use in your Firestore data
}

export interface ComplianceItem {
  id: string; // Unique identifier for the compliance item (Firestore document ID)
  businessId: string; // The ID of the business this compliance item belongs to
  ownerId: string; // New field: The ID of the user who owns the business (matches Firestore 'ownerId')
  title: string; // Short title of the compliance item
  description: string; // Detailed description of the compliance item
  category: ComplianceCategory; // Category of the compliance item (e.g., 'Taxes', 'Licenses')
  status: ComplianceStatus; // Current status of the compliance item (e.g., 'TODO', 'UPCOMING', 'COMPLETED')
  dueDate: Date; // The date by which the compliance item is due
  frequency?: string; // Optional: How often the item needs to be addressed (e.g., "Annually", "Quarterly")
  issuingAuthority: string; // The entity or government body issuing the requirement
  relevantLaws?: string[]; // Optional: Array of relevant laws or regulations
  requiredDocuments?: string[]; // Optional: Array of documents required for compliance
  notes?: string; // New field: Additional notes or instructions for the item
  attachments?: string[]; // Optional: Array of attachment URLs or references
  createdAt: Date; // New field: Timestamp for when the compliance item was created
  updatedAt: Date; // New field: Timestamp for the last update to the compliance item
  lastCompletedDate?: Date; // Optional: The date when the item was last completed
  nextReviewDate?: Date; // New field: The date for the next review of this item
}
