// src/app/auth/signup/signup.component.ts
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
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Firebase Authentication Service
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
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
    MatProgressBarModule
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  email = new FormControl('', [Validators.required, Validators.email]);
  password = new FormControl('', [Validators.required, Validators.minLength(6)]);
  confirmPassword = new FormControl('', [Validators.required]);

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSignup(): Promise<void> {
    this.errorMessage = null;

    if (this.email.invalid || this.password.invalid || this.confirmPassword.invalid) {
      this.errorMessage = 'Please fill in all fields correctly.';
      this.email.markAsTouched();
      this.password.markAsTouched();
      this.confirmPassword.markAsTouched();
      return;
    }

    if (this.password.value !== this.confirmPassword.value) {
      this.errorMessage = 'Passwords do not match.';
      this.confirmPassword.setErrors({ mismatch: true });
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.signUp(this.email.value!, this.password.value!);
      // Navigate to the dashboard after successful signup
      // The dashboard will then conditionally show packages if not subscribed
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Signup error:', error);
      this.errorMessage = error.message || 'Sign up failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  getEmailErrorMessage(): string {
    if (this.email.hasError('required')) {
      return 'You must enter a value';
    }
    return this.email.hasError('email') ? 'Not a valid email' : '';
  }

  getPasswordErrorMessage(): string {
    if (this.password.hasError('required')) {
      return 'You must enter a value';
    }
    if (this.password.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  }

  getConfirmPasswordErrorMessage(): string {
    if (this.confirmPassword.hasError('required')) {
      return 'You must confirm your password';
    }
    if (this.confirmPassword.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }
}
