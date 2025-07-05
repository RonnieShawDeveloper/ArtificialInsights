// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service'; // Import UserService
import { UserProfile } from '../models/user.model'; // Import UserProfile model
import { User } from 'firebase/auth';
import { Subscription, combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

// Interface for subscription packages (retained from previous step)
interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  priceAnnual: number;
  priceMonthly: number;
  features: string[];
  isMain?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatProgressBarModule,
    MatTabsModule,
    MatMenuModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userProfile: UserProfile | null = null; // New property for user profile
  private subscriptions = new Subscription(); // Use a single subscription for cleanup
  isLoading = false;
  errorMessage: string | null = null;

  // Subscription status will now be derived from userProfile.isSubscribed
  isSubscribed = false;

  // Placeholder for business/location selection
  selectedBusiness: any = null;
  businesses: any[] = [
    { id: 'biz1', name: 'Artificial Insights HQ', type: 'Consulting' },
    { id: 'biz2', name: 'AI Restaurant - Downtown', type: 'Restaurant' },
    { id: 'biz3', name: 'AI Clinic - North', type: 'Health Clinic' }
  ];

  // Define subscription packages (retained from previous step)
  packages: SubscriptionPackage[] = [
    {
      id: 'package-main',
      name: 'Standard Business Compliance',
      description: 'Covers 1 business location with essential compliance tracking.',
      priceAnnual: 129.95,
      priceMonthly: 14.95,
      features: [
        '1 Business Location',
        'Annual & Monthly Compliance Tracking',
        'AI Regulatory Guidance',
        '5-Day Free Trial'
      ],
      isMain: true
    },
    {
      id: 'package-pro',
      name: 'Pro Compliance Suite',
      description: 'Advanced features for growing businesses.',
      priceAnnual: 299.95,
      priceMonthly: 29.95,
      features: [
        'All Standard Features',
        'Priority AI Support',
        'Customizable Alerts',
        'Advanced Reporting'
      ]
    },
    {
      id: 'package-enterprise',
      name: 'Enterprise Solution',
      description: 'Tailored for large organizations with complex needs.',
      priceAnnual: 999.95,
      priceMonthly: 99.95,
      features: [
        'All Pro Features',
        'Multi-User Access',
        'Dedicated Compliance Manager',
        'API Integrations'
      ]
    }
  ];

  // Price for additional locations (retained from previous step)
  additionalLocationPriceAnnual = 79.95;
  additionalLocationPriceMonthly = 8.95;

  constructor(
    private authService: AuthService,
    private userService: UserService, // Inject UserService
    private router: Router
  ) {}

  ngOnInit(): void {
    // Combine observables to react to both auth state and user profile changes
    this.subscriptions.add(
      combineLatest([
        this.authService.currentUser$,
        this.authService.isAuthReady$.pipe(filter(isReady => isReady)) // Ensure auth is ready
      ]).subscribe(([user, isAuthReady]) => {
        this.currentUser = user;
        if (!user) {
          // If user logs out or session expires, redirect to login
          this.router.navigate(['/login']);
        } else {
          // Fetch user profile after authentication is ready and user is logged in
          this.subscriptions.add(
            this.userService.getUserProfile().subscribe(profile => {
              this.userProfile = profile;
              // Update isSubscribed based on user profile
              this.isSubscribed = !!profile?.isSubscribed;

              if (this.isSubscribed) {
                // If subscribed, then try to select a business
                if (!this.selectedBusiness && this.businesses.length > 0) {
                  this.selectedBusiness = this.businesses[0]; // Auto-select first mock business
                }
                this.loadDashboardData();
              } else {
                // If not subscribed, no dashboard data to load yet.
                // The HTML will show the welcome and packages.
                this.isLoading = false; // Ensure loading is off if not subscribed
              }
            })
          );
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();
  }

  /**
   * Placeholder for loading dashboard data.
   * This will eventually fetch compliance items from Firestore.
   */
  loadDashboardData(): void {
    if (!this.isSubscribed) {
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    // Simulate data loading
    setTimeout(() => {
      console.log('Loading dashboard data for:', this.selectedBusiness?.name);
      // Here, you would fetch data from Firestore based on selectedBusiness
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Handles the sign-out process.
   */
  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      this.errorMessage = 'Failed to sign out. Please try again.';
    }
  }

  /**
   * Allows the owner to select a different business or location.
   * Only applicable if subscribed.
   * @param business The business object to select.
   */
  onBusinessSelect(business: any): void {
    if (this.isSubscribed) {
      this.selectedBusiness = business;
      this.loadDashboardData();
    }
  }

  /**
   * Placeholder for adding a new business/location.
   * This will be part of the subscription flow or an add-on.
   */
  onAddNewBusiness(): void {
    console.log('Navigating to new business creation flow or prompting for add-on...');
    // TODO: Implement navigation to a dedicated component for adding new businesses
  }

  /**
   * Placeholder for interacting with the AI Assistant.
   */
  onAskAIAssistant(): void {
    console.log('Opening AI Assistant chat...');
    // TODO: Implement AI Assistant chat interface
  }

  /**
   * Handles the "Choose Plan" action for a subscription package.
   * This is where the user's profile will be created/updated in Firestore
   * and they will be redirected to the AI onboarding.
   * @param pkg The selected SubscriptionPackage.
   */
  async onChoosePlan(pkg: SubscriptionPackage): Promise<void> {
    if (!this.currentUser?.uid) {
      this.errorMessage = 'Authentication error: User not logged in.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      // Calculate trial end date (5 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5);

      // Prepare user profile data
      const userProfileData: Partial<UserProfile> = {
        uid: this.currentUser.uid,
        email: this.currentUser.email || 'N/A', // Use current user's email
        isSubscribed: true, // Mark as subscribed
        subscriptionPackageId: pkg.id,
        subscriptionStartDate: new Date(), // Current date
        trialEndDate: trialEndDate,
        hasTrialUsed: false // Assume first trial for now
      };

      // Set/update the user's profile in Firestore
      await this.userService.setUserProfile(this.currentUser.uid, userProfileData);

      console.log('User chose plan:', pkg.name, 'and profile updated. Redirecting to onboarding.');
      // Redirect to the onboarding page, potentially passing package ID as query param
      this.router.navigate(['/onboarding'], { queryParams: { packageId: pkg.id } });

    } catch (error: any) {
      console.error('Error choosing plan and updating profile:', error);
      this.errorMessage = error.message || 'Failed to choose plan. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
