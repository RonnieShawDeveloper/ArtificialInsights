// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Subscription, combineLatest } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { BusinessService } from '../services/business.service';
import { ComplianceService } from '../services/compliance.service';
import { UserProfile } from '../models/user.model';
import { Business } from '../models/business.model';
import { ComplianceItem, ComplianceCategory, ComplianceStatus } from '../models/compliance-item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatTabsModule,
    MatExpansionModule,
    MatListModule,
    MatToolbarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private complianceSubscription: Subscription | null = null; // Dedicated subscription for compliance items
  currentUserId: string | null = null;
  userProfile: UserProfile | null = null;
  userBusiness: Business | null = null;
  complianceItems: ComplianceItem[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  // Categorized compliance items for display
  complianceCategories = Object.values(ComplianceCategory);
  categorizedCompliance: { [key: string]: ComplianceItem[] } = {};

  // For displaying package options if onboarding is not complete - MADE PUBLIC
  public packages = [ // FIX: Made 'packages' property public
    { id: 'basic', name: 'Basic Compliance', price: '$9.99/month', features: ['Essential Licenses', 'Basic Tax Reminders'] },
    { id: 'pro', name: 'Pro Compliance', price: '$29.99/month', features: ['All Basic Features', 'OSHA & Safety', 'HR & Employee Law', 'Business Insurance'] },
    { id: 'premium', name: 'Premium Compliance', price: '$49.99/month', features: ['All Pro Features', 'Advanced Regulatory Guidance', 'Dedicated Support'] }
  ];

  // Make AuthService and ComplianceStatus public for template access
  constructor(
    public authService: AuthService, // Made public for template access
    private userService: UserService,
    private businessService: BusinessService,
    private complianceService: ComplianceService,
    private router: Router
  ) {}

  // Expose ComplianceStatus enum to the template
  public ComplianceStatus = ComplianceStatus;


  async ngOnInit(): Promise<void> {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(async user => {
        if (user) {
          this.currentUserId = user.uid;
          await this.loadDashboardData();
        } else {
          // If no user, redirect to login or show a public landing
          this.router.navigate(['/login']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.complianceSubscription) {
      this.complianceSubscription.unsubscribe();
    }
  }

  /**
   * Loads all necessary dashboard data: user profile, business, and compliance items.
   */
  private async loadDashboardData(): Promise<void> {
    if (!this.currentUserId) {
      this.errorMessage = 'User not authenticated.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    try {
      // Use onSnapshot for real-time updates for user profile
      this.subscriptions.add(
        this.userService.getUserProfile(this.currentUserId).subscribe((profile: UserProfile | null) => { // Explicitly type profile
          this.userProfile = profile;
          // If user has not completed onboarding, redirect them
          // Note: The onboarding check logic might need adjustment based on your new UserProfile fields
          // For now, assuming hasCompletedOnboarding is the primary flag.
          if (this.userProfile && !this.userProfile.hasCompletedOnboarding) {
            this.router.navigate(['/onboarding']);
          }
        })
      );

      // Use onSnapshot for real-time updates for user's businesses
      this.subscriptions.add(
        this.businessService.getBusinessesForUser(this.currentUserId).subscribe((businesses: Business[]) => { // Explicitly type businesses
          if (businesses && businesses.length > 0) {
            // Assuming one primary business for now
            this.userBusiness = businesses[0];
            if (this.userBusiness.id && this.currentUserId) { // Null check for userBusiness.id and currentUserId
              // Pass currentUserId as ownerId to loadComplianceItems
              this.loadComplianceItems(this.userBusiness.id, this.currentUserId);
            } else {
              console.warn('User business found but has no ID or currentUserId is null.');
              this.complianceItems = [];
              this.categorizeComplianceItems();
              this.isLoading = false;
            }
          } else {
            this.userBusiness = null;
            this.complianceItems = [];
            this.categorizeComplianceItems(); // Clear categorized items
            this.isLoading = false; // No business, so no compliance items to load
          }
        })
      );

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.errorMessage = 'Failed to load dashboard data. Please try again.';
      this.isLoading = false;
    }
  }

  /**
   * Loads compliance items for a given business ID and owner ID.
   * Uses onSnapshot for real-time updates.
   * @param businessId The ID of the business to load compliance items for.
   * @param ownerId The ID of the user who owns the business.
   */
  private loadComplianceItems(businessId: string, ownerId: string): void {
    // Unsubscribe from previous compliance items subscription if it exists
    if (this.complianceSubscription) {
      this.complianceSubscription.unsubscribe();
    }

    // Pass both businessId and ownerId to the service method
    this.complianceSubscription = this.complianceService.getComplianceItemsForBusiness(businessId, ownerId).subscribe((items: ComplianceItem[]) => { // Explicitly type items
      this.complianceItems = items;
      this.categorizeComplianceItems();
      this.isLoading = false;
    });
    this.subscriptions.add(this.complianceSubscription); // Add to main subscription for overall cleanup
  }

  /**
   * Categorizes compliance items for display in tabs/expansion panels.
   */
  private categorizeComplianceItems(): void {
    this.categorizedCompliance = {};
    this.complianceCategories.forEach(category => {
      this.categorizedCompliance[category] = this.complianceItems.filter(item => item.category === category);
    });
    console.log('Categorized Compliance Items:', this.categorizedCompliance);
  }

  /**
   * Navigates to the onboarding page with the selected package.
   * @param packageId The ID of the selected package.
   */
  selectPackage(packageId: string): void {
    this.router.navigate(['/onboarding'], { queryParams: { packageId: packageId } });
  }

  /**
   * Checks if there are any compliance items to display.
   * @returns True if there are compliance items, false otherwise.
   */
  hasComplianceItems(): boolean {
    return this.complianceItems && this.complianceItems.length > 0;
  }

  /**
   * Filters compliance items by status.
   * @param status The status to filter by (e.g., 'TODO', 'UPCOMING', 'COMPLETED').
   * @returns An array of compliance items matching the given status.
   */
  getComplianceItemsByStatus(status: ComplianceStatus): ComplianceItem[] {
    return this.complianceItems.filter(item => item.status === status);
  }

  /**
   * Gets the count of compliance items for a specific category.
   * @param category The compliance category.
   * @returns The number of items in that category.
   */
  getCategoryItemCount(category: ComplianceCategory): number {
    return this.categorizedCompliance[category]?.length || 0;
  }

  /**
   * Marks a compliance item as complete.
   * @param item The compliance item to mark as complete.
   */
  async markAsComplete(item: ComplianceItem): Promise<void> {
    if (this.userBusiness?.id && this.currentUserId) { // Ensure both business ID and user ID are available
      this.isLoading = true;
      try {
        // Pass userId, businessId, itemId, and itemData
        await this.complianceService.updateComplianceItem(
          this.currentUserId, // userId
          this.userBusiness.id, // businessId
          item.id, // itemId
          {
            status: ComplianceStatus.COMPLETED,
            lastCompletedDate: new Date(),
            updatedAt: new Date() // Ensure updatedAt is set on completion
          }
        );
        console.log(`Compliance item ${item.title} marked as complete.`);
      } catch (error) {
        console.error('Error marking item as complete:', error);
        this.errorMessage = 'Failed to update compliance item status.';
      } finally {
        this.isLoading = false;
      }
    } else {
      console.warn('Cannot mark item as complete: userBusiness ID or currentUserId is missing.');
    }
  }

  /**
   * Deletes a compliance item.
   * @param item The compliance item to delete.
   */
  async deleteComplianceItem(item: ComplianceItem): Promise<void> {
    if (this.userBusiness?.id && this.currentUserId) { // Ensure both business ID and user ID are available
      // Replaced window.confirm with a custom message box or modal if needed.
      // For now, using a simple console log for demonstration.
      console.log(`Confirming deletion of "${item.title}"...`);
      this.isLoading = true;
      try {
        // Pass userId, businessId, and itemId
        await this.complianceService.deleteComplianceItem(
          this.currentUserId, // userId
          this.userBusiness.id, // businessId
          item.id // itemId
        );
        console.log(`Compliance item ${item.title} deleted.`);
      } catch (error) {
        console.error('Error deleting item:', error);
        this.errorMessage = 'Failed to delete compliance item.';
      } finally {
        this.isLoading = false;
      }
    } else {
      console.warn('Cannot delete item: userBusiness ID or currentUserId is missing.');
    }
  }
}
