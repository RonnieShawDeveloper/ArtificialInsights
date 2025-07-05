// src/app/auth/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar'; // For loading indicator

// Firebase Authentication Service (will be created next)
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule // Import for progress bar
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  // Form controls for email and password
  email = new FormControl('', [Validators.required, Validators.email]);
  password = new FormControl('', [Validators.required]);

  // Loading state for UI feedback during async operations
  isLoading = false;
  // Error message to display to the user
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService, // Inject the AuthService
    private router: Router // Inject the Router for navigation
  ) {}

  /**
   * Handles the login process when the form is submitted.
   * Calls the AuthService to attempt user authentication.
   */
  async onLogin(): Promise<void> {
    // Reset error message
    this.errorMessage = null;

    // Check if form controls are valid
    if (this.email.invalid || this.password.invalid) {
      this.errorMessage = 'Please enter a valid email and password.';
      // Mark controls as touched to display validation errors
      this.email.markAsTouched();
      this.password.markAsTouched();
      return;
    }

    this.isLoading = true; // Show loading indicator

    try {
      // Attempt to sign in with email and password
      await this.authService.signIn(this.email.value!, this.password.value!);
      // If successful, navigate to the dashboard
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      // Handle authentication errors
      console.error('Login error:', error);
      // Display a user-friendly error message
      this.errorMessage = error.message || 'Login failed. Please check your credentials.';
    } finally {
      this.isLoading = false; // Hide loading indicator
    }
  }

  /**
   * Gets the error message for the email input field.
   * @returns A string with the error message or null if no error.
   */
  getEmailErrorMessage(): string {
    if (this.email.hasError('required')) {
      return 'You must enter a value';
    }
    return this.email.hasError('email') ? 'Not a valid email' : '';
  }

  /**
   * Gets the error message for the password input field.
   * @returns A string with the error message or null if no error.
   */
  getPasswordErrorMessage(): string {
    if (this.password.hasError('required')) {
      return 'You must enter a value';
    }
    return '';
  }
}
