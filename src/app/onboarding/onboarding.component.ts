// src/app/onboarding/onboarding.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { UserProfile } from '../models/user.model';
import { BusinessService } from '../services/business.service';
import { Business } from '../models/business.model';
import { RemoteConfigService } from '../services/remote-config.service';
import { ComplianceService } from '../services/compliance.service'; // Import ComplianceService
import { ComplianceItem, ComplianceCategory, ComplianceStatus } from '../models/compliance-item.model'; // Import ComplianceItem model and enums

// Define phases for the onboarding process
enum OnboardingPhase {
  INITIAL_GREETING = 'initial_greeting',
  USER_DETAILS = 'user_details',
  BUSINESS_BASIC_INFO = 'business_basic_info',
  BUSINESS_DESCRIPTION = 'business_description',
  AI_INTERVIEW = 'ai_interview',
  COMPLETION = 'completion'
}

// Interface for a chat message
interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  isTyping?: boolean; // For AI typing indicator
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css'
})
export class OnboardingComponent implements OnInit, OnDestroy {
  @ViewChild('chatWindow') private chatWindow!: ElementRef; // Reference to the chat scrollable div
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLInputElement | HTMLTextAreaElement>; // Reference to the chat input field

  private subscriptions = new Subscription();
  currentUserId: string | null = null;
  selectedPackageId: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // Onboarding state management
  currentPhase: OnboardingPhase = OnboardingPhase.INITIAL_GREETING;
  OnboardingPhase = OnboardingPhase; // Make enum available in template

  // Chat interface properties
  chatMessages: ChatMessage[] = []; // For UI display
  userResponseControl = new FormControl('');
  isSending = false; // To disable input while AI is responding

  private geminiApiKey: string = ''; // Stores the fetched Gemini API key
  private geminiChatHistory: { role: string; parts: { text: string }[] }[] = [];

  // Form controls for user details
  firstNameControl = new FormControl('', Validators.required);
  lastNameControl = new FormControl('', Validators.required);

  // Form controls for business basic info
  businessNameControl = new FormControl('', Validators.required);
  businessStreetControl = new FormControl('', Validators.required);
  businessCityControl = new FormControl('', Validators.required);
  businessStateControl = new FormControl('', Validators.required);
  businessZipControl = new FormControl('', Validators.required);
  businessCountryControl = new FormControl('', Validators.required);
  businessPhoneControl = new FormControl('', Validators.required);
  businessLegalEntityControl = new FormControl('', Validators.required);
  businessTypeControl = new FormControl('', Validators.required);

  // Form control for detailed business description
  businessDescriptionControl = new FormControl('');

  // Store the ID and full object of the business created during onboarding
  private currentOnboardingBusinessId: string | null = null;
  private currentOnboardingBusiness: Business | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService,
    private userService: UserService,
    private businessService: BusinessService,
    private remoteConfigService: RemoteConfigService,
    private complianceService: ComplianceService // Inject ComplianceService
  ) {}

  async ngOnInit(): Promise<void> {
    // Fetch Gemini API key early
    this.geminiApiKey = this.remoteConfigService.getString('gemini_api_key');
    if (!this.geminiApiKey) {
      console.error('Gemini API Key not found in Remote Config!');
      this.errorMessage = 'Failed to load AI capabilities. Please ensure API key is configured.';
      // Potentially redirect or disable AI features
    }

    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        this.selectedPackageId = params['packageId'] || null;
        console.log('Onboarding started for package:', this.selectedPackageId);
      })
    );

    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.currentUserId = user.uid;
          this.checkUserProfileAndStartOnboarding();
        } else {
          this.router.navigate(['/login']); // Redirect if not logged in
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Scrolls the chat window to the bottom.
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (this.chatWindow && this.chatWindow.nativeElement) {
          this.chatWindow.nativeElement.scrollTop = this.chatWindow.nativeElement.scrollHeight;
          console.log('Scrolled to bottom. ScrollHeight:', this.chatWindow.nativeElement.scrollHeight);
        } else {
          console.warn('Chat window element not found for scrolling.');
        }
      });
    }, 100);
  }

  /**
   * Sets focus on the chat input field.
   */
  private focusChatInput(): void {
    setTimeout(() => {
      if (this.chatInput && this.chatInput.nativeElement) {
        this.chatInput.nativeElement.focus();
        console.log('Chat input focused.');
      }
    }, 150); // Small delay to ensure element is ready
  }

  /**
   * Checks the user's profile to determine the starting point of onboarding.
   * If profile is incomplete or no business exists, starts the AI interview.
   */
  private async checkUserProfileAndStartOnboarding(): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    this.isLoading = true;
    try {
      this.chatMessages = [];
      this.geminiChatHistory = [];

      this.addStaticAIMessage("Hello! I'm your AI Business Compliance Assistant. I'm here to guide you through setting up your business for comprehensive regulatory compliance. To ensure I cover every possibility, no matter how small or large your business is, **please provide detailed and thorough answers to my questions**. Imagine you're explaining your business to an expert who needs to understand every nuance to provide precise regulatory guidance.");
      this.goToPhase(OnboardingPhase.USER_DETAILS);
    } catch (error) {
      console.error('Error checking user profile:', error);
      this.errorMessage = 'Failed to load onboarding. Please try again.';
      this.router.navigate(['/dashboard']);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Adds an AI message to the UI chat history and to Gemini's chat history.
   * @param text The message text from the AI.
   */
  private addAIMessage(text: string): void {
    this.chatMessages.push({ sender: 'ai', text: text });
    this.geminiChatHistory.push({ role: 'model', parts: [{ text: text }] });
    this.scrollToBottom();
    this.focusChatInput(); // Focus input after AI response
  }

  /**
   * Adds a user message to the UI chat history and to Gemini's chat history.
   * @param text The message text from the user.
   */
  private addUserMessage(text: string): void {
    this.chatMessages.push({ sender: 'user', text: text });
    this.geminiChatHistory.push({ role: 'user', parts: [{ text: text }] });
    this.scrollToBottom();
  }

  /**
   * Adds a static AI-like message to the UI chat history ONLY.
   * These messages are not sent to the Gemini API for context.
   * Use this for phase-specific instructions/prompts.
   * @param text The message text.
   */
  private addStaticAIMessage(text: string): void {
    this.chatMessages.push({ sender: 'ai', text: text });
    this.scrollToBottom();
  }

  /**
   * Adds a static user-like message to the UI chat history ONLY.
   * These messages are not sent to the Gemini API for context.
   * Use this for summarizing user input from forms.
   * @param text The message text.
   */
  private addStaticUserMessage(text: string): void {
    this.chatMessages.push({ sender: 'user', text: text });
    this.scrollToBottom();
  }

  /**
   * Simulates AI typing for a brief moment.
   */
  private async simulateAITyping(): Promise<void> {
    this.chatMessages.push({ sender: 'ai', text: '...', isTyping: true });
    this.scrollToBottom();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.chatMessages.pop(); // Remove typing indicator
  }

  /**
   * Moves the onboarding process to the next phase.
   * @param phase The target phase to move to.
   */
  private async goToPhase(phase: OnboardingPhase): Promise<void> {
    this.currentPhase = phase;
    switch (phase) {
      case OnboardingPhase.USER_DETAILS:
        this.addStaticAIMessage("First, what is your first name and last name?");
        break;
      case OnboardingPhase.BUSINESS_BASIC_INFO:
        this.addStaticAIMessage("Great! Now, let's get some basic information about your primary business location. What is the business name, full street address, city, state, zip code, country, phone number, its legal entity type (e.g., LLC, Sole Proprietorship, S-Corp, C-Corp), and its general type (e.g., Restaurant, Retail, Consulting, Health Clinic)?");
        break;
      case OnboardingPhase.BUSINESS_DESCRIPTION:
        this.addStaticAIMessage("Please describe your business in detail. This is very important! The more information you provide, the better I can identify all relevant compliance requirements. Tell me about your products/services, operational processes, target customers, any physical locations, online presence, and anything else unique about your business model. Imagine you're explaining it to a business expert who needs to understand every nuance.");
        break;
      case OnboardingPhase.AI_INTERVIEW:
        await this.startAIInterview();
        break;
      case OnboardingPhase.COMPLETION:
        this.addStaticAIMessage("Thank you for providing all the necessary information! Your comprehensive compliance dashboard is now being set up based on our detailed conversation. This may take a moment. You will be redirected shortly.");
        this.completeOnboardingAndRedirect();
        break;
    }
  }

  /**
   * Handles user's response in the chat interface.
   * This method will be expanded to send data to Gemini API.
   */
  async sendUserResponse(): Promise<void> {
    const response = this.userResponseControl.value?.trim();
    if (!response) {
      return;
    }

    this.addUserMessage(response);
    this.userResponseControl.setValue('');
    this.isSending = true;
    this.userResponseControl.disable();

    try {
      if (this.currentPhase === OnboardingPhase.AI_INTERVIEW) {
        await this.simulateAITyping();
        await this.getAIResponseFromGemini(response);
      }
    } catch (error) {
      console.error('Error processing AI response:', error);
      this.errorMessage = 'An error occurred during the AI conversation. Please try again.';
      this.addStaticAIMessage('I apologize, an error occurred. Could you please rephrase or try again?');
    } finally {
      this.isSending = false;
      this.userResponseControl.enable();
    }
  }

  /**
   * Initiates the AI interview by providing the initial business context to Gemini.
   */
  private async startAIInterview(): Promise<void> {
    if (!this.currentUserId || !this.currentOnboardingBusinessId) {
      this.errorMessage = 'Missing user or business data for AI interview.';
      this.addStaticAIMessage('An error occurred. Please try restarting the onboarding process.');
      return;
    }

    this.isLoading = true;
    try {
      // FIX: Changed to use getBusinessesForUser and find the business
      this.currentOnboardingBusiness = (await this.businessService.getBusinessesForUser(this.currentUserId).toPromise())?.find(b => b.id === this.currentOnboardingBusinessId) || null;

      if (!this.currentOnboardingBusiness) {
        this.errorMessage = 'Business data not found for AI interview.';
        this.addStaticAIMessage('Could not retrieve business details. Please contact support.');
        return;
      }

      this.chatMessages = [];
      this.geminiChatHistory = [];

      // Refined initial prompt to strongly emphasize ONE question at a time and NO explanations
      const initialPrompt = `
        You are an expert AI Business Regulatory Compliance, Tax, Employee Law, OSHA Compliance, Health and Safety Compliance, Business Insurance Compliance, and State and Local Licenses and Permits Consultant. You are highly recommended.
        Your overarching goal is to ask a series of detailed, thorough, and specific questions to a business owner to identify ALL applicable laws, rules, and regulations for their business. This includes uncovering any compliance items they might be missing or unaware of.
        Cover every possibility, no matter how small or large the business is, to ensure comprehensive compliance tracking.
        It is crucial that the business owner provides detailed and thorough answers. Emphasize this repeatedly.

        **CRITICAL INTERVIEW INSTRUCTIONS**:
        1.  **One Question at a Time**: Ask ONLY ONE question at a time.
        2.  **Wait for Response**: Wait for the user's response before asking the next question.
        3.  **Clarification on Laws/Rules**: While you will NOT provide full compliance advice or general explanations during this interview phase, you MAY cite the specific law, rule, or regulation that is prompting your question. This is to help the owner better understand the reason for the question. Immediately after citing, re-emphasize the need for detailed responses to that question.
        4.  **Uncovering Concerns & Follow-ups**: Your role is to purely gather information to determine applicability and uncover potential areas of concern where compliance might be lacking. If more information is needed on a topic, or if an answer reveals a new potential compliance area, ask a specific follow-up question. Compliance details and actionable items will be provided on the dashboard, not during this interview.
        5.  **Exhaustive Questioning**: The questioning needs to be as detailed and exhaustive as necessary to get a comprehensive grasp on the business's operations, its nuances, and what specific local, state, and federal agencies regulate it. Adapt your questioning based on the owner's apparent knowledge level – if they are new to business, guide them more; if they are knowledgeable, delve deeper into specifics.
        6.  **Completion Statement**: When you believe you have gathered sufficient information to generate a truly comprehensive list of compliance items for the business, explicitly state: "I believe I have enough information now. Thank you for your detailed responses. I am ready to generate your compliance dashboard." ONLY state this when you are truly finished with the interview and have covered all major areas relevant to the business.

        **INITIAL CRUCIAL INQUIRIES**:
        Before delving into other specifics, please start by asking about the business's stage and legal structure:
        * "How long has your business been operating, or is this a new startup that needs complete business start-up guidance?"
        * Based on their legal entity (${this.currentOnboardingBusiness.legalEntity}), ask a follow-up question to understand if there are specific internal compliance aspects related to their legal structure (e.g., "Given you are a ${this.currentOnboardingBusiness.legalEntity}, do you have specific operating agreements, bylaws, or multiple members/shareholders that require particular governance considerations?").

        **IMPORTANT**: Your subsequent questions MUST be highly relevant to the provided business details and the answers you receive.
        DO NOT ask generic questions like "Do you handle food?" if the business type or description does not suggest it.
        For example, if the business is explicitly "Online Service Business", ask about data privacy, cross-state sales, digital accessibility, etc.
        If it's a physical retail business, ask about zoning, signage, physical accessibility, employee safety (OSHA), etc.
        If it's a service business, ask about professional licenses, client data handling, insurance needs, etc.
        Ask if they have had previous violations, with what agency and how it was resolved. Ask them to be as detailed as possible so you can assist with future compliance concerns.
        Here is the initial information about the business:
        Business Name: ${this.currentOnboardingBusiness.name}
        Business Type: ${this.currentOnboardingBusiness.type}
        Legal Entity: ${this.currentOnboardingBusiness.legalEntity}
        Location: ${this.currentOnboardingBusiness.address.street}, ${this.currentOnboardingBusiness.address.city}, ${this.currentOnboardingBusiness.address.state}, ${this.currentOnboardingBusiness.address.zip}, ${this.currentOnboardingBusiness.address.country}
        Phone: ${this.currentOnboardingBusiness.phone}
        Detailed Business Description: ${this.currentOnboardingBusiness.description || 'No detailed description provided yet.'}
        Before you complete your line of questioning, ask if there are any other details that you have not asked about that you should consider. Explain that the more detailed they are, the better.

        Based on this information, begin by asking your first crucial inquiry about the business's stage and legal structure.
      `;

      this.geminiChatHistory.push({ role: 'user', parts: [{ text: initialPrompt }] });
      await this.getAIResponseFromGemini('');
    } catch (error: any) {
      console.error('Error starting AI interview:', error);
      this.errorMessage = `Failed to start AI interview: ${error.message || 'Unknown error'}`;
      this.addStaticAIMessage('I am having trouble starting our detailed interview. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Sends the user's question/response to the Gemini API and gets the AI's response.
   * @param userQuestion The user's input. If empty, it means we are asking for the AI's first question.
   */
  private async getAIResponseFromGemini(userQuestion: string): Promise<void> {
    if (!this.geminiApiKey) {
      this.errorMessage = 'AI service not available (API key missing).';
      this.addStaticAIMessage('I cannot respond right now as my service is not configured correctly. Please contact support.');
      return;
    }

    const payload = {
      contents: this.geminiChatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        responseMimeType: "text/plain" // Ensure plain text response for general conversation
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;

    console.log('--- Sending to Gemini API ---');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error:', response.status, errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('--- Received from Gemini API ---');
      console.log('Result:', JSON.stringify(result, null, 2));

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content[0].parts.length > 0) { // FIX: Changed index to [0]
        const aiText = result.candidates[0].content.parts[0].text;
        this.addAIMessage(aiText);

        // Heuristic to determine if AI interview is complete
        // Trim and normalize the AI's response for robust matching
        const normalizedAiText = aiText.toLowerCase().trim().replace(/\s+/g, ' '); // Normalize spaces
        const completionPhrases = [
          "i believe i have enough information now. thank you for your detailed responses. i am ready to generate your compliance dashboard.",
          "thank you for all the information",
          "i have sufficient information",
          "onboarding complete",
          "i have enough information now",
          "i believe i have enough information",
          "okay, great! i am ready for the compliance dashboard." // Added this specific phrase
        ];

        let isCompletionTriggered = false;
        for (const phrase of completionPhrases) {
          if (normalizedAiText.includes(phrase.toLowerCase())) {
            isCompletionTriggered = true;
            break;
          }
        }

        if (isCompletionTriggered && this.geminiChatHistory.length > 8) { // Ensure a minimum number of turns
          console.log('DEBUG: AI completion heuristic triggered. Moving to COMPLETION phase.');
          this.goToPhase(OnboardingPhase.COMPLETION);
        }

      } else {
        console.warn('Gemini API returned no valid content:', result);
        this.addStaticAIMessage('I could not generate a response. Please try again.');
      }
    } catch (error: any) {
      console.error('Fetch error with Gemini API:', error);
      this.errorMessage = `AI communication error: ${error.message || 'Unknown error'}`;
      this.addStaticAIMessage('I am experiencing a technical issue and cannot respond. Please try again later.');
    } finally {
      // Simulate typing indicator removal is handled by sendUserResponse
    }
  }

  /**
   * Saves the user's first and last name to their UserProfile in Firestore
   * and proceeds to the next phase.
   */
  async saveUserDetailsAndProceed(): Promise<void> {
    if (this.firstNameControl.invalid || this.lastNameControl.invalid) {
      this.firstNameControl.markAsTouched();
      this.lastNameControl.markAsTouched();
      return;
    }
    if (!this.currentUserId) {
      this.errorMessage = 'Authentication error: User ID missing.';
      return;
    }

    this.isLoading = true;
    try {
      await this.userService.updateUserProfile(this.currentUserId, { // FIX: Changed to updateUserProfile
        firstName: this.firstNameControl.value!,
        lastName: this.lastNameControl.value!
      });
      console.log('User details saved.');
      this.addStaticUserMessage(`My name is ${this.firstNameControl.value} ${this.lastNameControl.value}.`);
      this.goToPhase(OnboardingPhase.BUSINESS_BASIC_INFO);
    } catch (error) {
      console.error('Error saving user details:', error);
      this.errorMessage = 'Failed to save your name. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Saves basic business information to Firestore and proceeds to the next phase.
   * This will create the first Business document for the user.
   */
  async saveBusinessBasicInfoAndProceed(): Promise<void> {
    if (this.businessNameControl.invalid || this.businessStreetControl.invalid ||
      this.businessCityControl.invalid || this.businessStateControl.invalid ||
      this.businessZipControl.invalid || this.businessCountryControl.invalid ||
      this.businessPhoneControl.invalid || this.businessLegalEntityControl.invalid ||
      this.businessTypeControl.invalid) {
      this.businessNameControl.markAsTouched();
      this.businessStreetControl.markAsTouched();
      this.businessCityControl.markAsTouched();
      this.businessStateControl.markAsTouched();
      this.businessZipControl.markAsTouched();
      this.businessCountryControl.markAsTouched();
      this.businessPhoneControl.markAsTouched();
      this.businessLegalEntityControl.markAsTouched();
      this.businessTypeControl.markAsTouched();
      return;
    }
    if (!this.currentUserId) {
      this.errorMessage = 'Authentication error: User ID missing.';
      return;
    }

    this.isLoading = true;
    try {
      const newBusiness: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'> = { // FIX: Added ownerId to Omit
        name: this.businessNameControl.value!,
        address: {
          street: this.businessStreetControl.value!,
          city: this.businessCityControl.value!,
          state: this.businessStateControl.value!,
          zip: this.businessZipControl.value!,
          country: this.businessCountryControl.value!
        },
        phone: this.businessPhoneControl.value!,
        legalEntity: this.businessLegalEntityControl.value! as Business['legalEntity'], // FIX: Explicit cast
        type: this.businessTypeControl.value!,
        description: ''
      };
      this.currentOnboardingBusinessId = await this.businessService.addBusiness(this.currentUserId!, newBusiness); // FIX: Pass userId
      console.log('Basic business info saved with ID:', this.currentOnboardingBusinessId);
      this.addStaticUserMessage(`My business is "${this.businessNameControl.value}" of type "${this.businessTypeControl.value}", located at ${this.businessStreetControl.value}, ${this.businessCityControl.value}, ${this.businessStateControl.value} ${this.businessZipControl.value}, ${this.businessCountryControl.value}. Phone: ${this.businessPhoneControl.value}. It's a ${this.businessLegalEntityControl.value}.`);
      this.goToPhase(OnboardingPhase.BUSINESS_DESCRIPTION);
    } catch (error) {
      console.error('Error saving business basic info:', error);
      this.errorMessage = 'Failed to save business basic information. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Saves the detailed business description to the newly created business and proceeds.
   */
  async saveBusinessDescriptionAndProceed(): Promise<void> {
    if (this.businessDescriptionControl.invalid) {
      this.businessDescriptionControl.markAsTouched();
      return;
    }
    if (!this.currentUserId || !this.currentOnboardingBusinessId) {
      this.errorMessage = 'Error: Business not yet created or user not authenticated.';
      return;
    }

    this.isLoading = true;
    try {
      await this.businessService.updateBusiness(this.currentUserId, this.currentOnboardingBusinessId, { // FIX: Pass userId
        description: this.businessDescriptionControl.value!
      });
      console.log('Detailed business description saved for ID:', this.currentOnboardingBusinessId);

      this.currentOnboardingBusiness = (await this.businessService.getBusinessesForUser(this.currentUserId).toPromise())?.find(b => b.id === this.currentOnboardingBusinessId) || null; // FIX: Use getBusinessesForUser
      this.addStaticUserMessage(`My business description is: "${this.businessDescriptionControl.value}"`);
      this.goToPhase(OnboardingPhase.AI_INTERVIEW);
    } catch (error) {
      console.error('Error saving business description:', error);
      this.errorMessage = 'Failed to save business description. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Completes the onboarding process and redirects to the dashboard.
   * This is where the AI would finalize dashboard setup.
   */
  private async completeOnboardingAndRedirect(): Promise<void> {
    this.isLoading = true;
    console.log('DEBUG: Entering completeOnboardingAndRedirect.'); // Debugging log
    try {
      if (!this.currentOnboardingBusinessId || !this.currentUserId || !this.currentOnboardingBusiness) {
        this.errorMessage = 'Missing data to finalize compliance setup.';
        this.addStaticAIMessage('An error occurred during final setup. Please contact support.');
        console.error('DEBUG: completeOnboardingAndRedirect exiting early due to missing data.'); // Debugging log
        return;
      }

      this.addStaticAIMessage("Generating your personalized compliance checklist...");
      console.log('DEBUG: Generating compliance checklist message added.'); // Debugging log

      const finalPrompt = `
        Based on our entire conversation and the following business details, please generate a comprehensive list of regulatory compliance items.
        For each item, provide:
        - title: A concise title (e.g., "Annual Business License Renewal")
        - description: A detailed explanation of the requirement.
        - category: One of "Licenses & Permits", "Taxes", "Employee Compliance", "Health & Safety", "Corporate Governance", "Insurance", "Environmental", "Other".
        - status: Initially "TODO" or "UPCOMING".
        - dueDate: A plausible date in ISO 8601 format (YYYY-MM-DD) (use current date + X days/months/years as appropriate, e.g., for annual items, set it for next year). If not applicable, set to null.
        - nextReviewDate: A plausible date in ISO 8601 format (YYYY-MM-DD) for recurring items. If not applicable, set to null.
        - frequency: "Annually", "Quarterly", "Monthly", "One-time", "Bi-annually", etc.
        - issuingAuthority: The likely government body or organization (e.g., "IRS", "State Dept. of Revenue", "Local Health Dept.").
        - relevantLaws: An array of example relevant laws/regulations (e.g., ["OSHA 1910.1200", "HIPAA"]). If none, an empty array.
        - requiredDocuments: An array of example documents (e.g., ["Form 1040", "Health Inspection Report"]). If none, an empty array.
        - notes: Any additional notes or specific considerations for this compliance item. Can be null.
        - attachments: An array of placeholder strings for potential attachment names. Can be empty.
        - lastCompletedDate: The last date this item was completed in ISO 8601 format (YYYY-MM-DD). Can be null.

        **CRITICAL INSTRUCTION FOR OUTPUT**: Ensure each item represents a distinct, granular compliance requirement. **Do NOT group multiple distinct requirements under a single broad title.** For example, instead of "All State Licenses", provide "State Business Operating License", "State Sales Tax Permit", "State Professional License (if applicable)" as separate, individual items. Each item must be a single, actionable compliance detail. Aim for 5-10 diverse and realistic compliance items.

        Consider all aspects discussed: business type, legal entity, location, operations, products/services, and any specific details from our chat.
        Respond ONLY with a JSON array of these objects. Do NOT include any conversational text outside the JSON.

        Business Details:
        Name: ${this.currentOnboardingBusiness.name}
        Type: ${this.currentOnboardingBusiness.type}
        Description: ${this.currentOnboardingBusiness.description}
        Location: ${this.currentOnboardingBusiness.address.city}, ${this.currentOnboardingBusiness.address.state}
        Legal Entity: ${this.currentOnboardingBusiness.legalEntity}

        Chat History Summary (for context):
        ${this.geminiChatHistory.map(m => `${m.role}: ${m.parts[0].text}`).join('\n')}
      `;

      this.geminiChatHistory.push({ role: 'user', parts: [{ text: finalPrompt }] });
      console.log('DEBUG: Final prompt added to geminiChatHistory.'); // Debugging log

      const payload = {
        contents: this.geminiChatHistory,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                category: { type: "STRING", enum: Object.values(ComplianceCategory) },
                status: { type: "STRING", enum: Object.values(ComplianceStatus) },
                dueDate: { type: "STRING", format: "date-time", nullable: true },
                nextReviewDate: { type: "STRING", format: "date-time", nullable: true },
                frequency: { type: "STRING", nullable: true },
                issuingAuthority: { type: "STRING" },
                relevantLaws: { type: "ARRAY", items: { type: "STRING" } },
                requiredDocuments: { type: "ARRAY", items: { type: "STRING" } },
                notes: { type: "STRING", nullable: true }, // Added notes to schema
                attachments: { type: "ARRAY", items: { type: "STRING" } }, // Added attachments to schema
                lastCompletedDate: { type: "STRING", format: "date-time", nullable: true } // Added lastCompletedDate to schema
              },
              required: ["title", "description", "category", "status", "issuingAuthority", "relevantLaws", "requiredDocuments"]
            }
          }
        }
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;

      console.log('--- Sending FINAL Payload to Gemini API for Compliance Items ---');
      console.log('Final Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('DEBUG: Received response from final Gemini API call.'); // Debugging log

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error (Compliance Generation):', response.status, errorData);
        throw new Error(`Gemini API error during compliance generation: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('--- Received FINAL Result from Gemini API (Compliance Items) ---');
      console.log('Final Result:', JSON.stringify(result, null, 2));

      let generatedComplianceItems: ComplianceItem[] = [];
      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        try {
          const jsonString = result.candidates[0].content.parts[0].text;
          generatedComplianceItems = JSON.parse(jsonString) as ComplianceItem[];
          console.log('Parsed Compliance Items:', generatedComplianceItems);
          console.log('DEBUG: Starting to save compliance items to Firestore.'); // Debugging log

          for (const item of generatedComplianceItems) {
            const itemToSave: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'businessId'> = {
              title: item.title,
              description: item.description,
              category: item.category,
              status: item.status,
              dueDate: item.dueDate ? new Date(item.dueDate) : new Date(), // FIX: Default to new Date() instead of null
              nextReviewDate: item.nextReviewDate ? new Date(item.nextReviewDate) : undefined, // FIX: Default to undefined instead of null
              frequency: item.frequency || undefined, // FIX: Default to undefined instead of null
              issuingAuthority: item.issuingAuthority,
              relevantLaws: item.relevantLaws || [],
              requiredDocuments: item.requiredDocuments || [],
              notes: item.notes || undefined, // FIX: Default to undefined instead of null
              attachments: item.attachments || [],
              lastCompletedDate: item.lastCompletedDate ? new Date(item.lastCompletedDate) : undefined // FIX: Default to undefined instead of null
            };
            // FIX: Pass userId and businessId to addComplianceItem
            await this.complianceService.addComplianceItem(this.currentUserId!, this.currentOnboardingBusinessId!, itemToSave);
          }
          this.addStaticAIMessage("Your compliance checklist has been successfully generated and saved!");
          console.log('DEBUG: Compliance items saved and success message added.'); // Debugging log

        } catch (parseError) {
          console.error('Error parsing Gemini JSON response for compliance items:', parseError);
          this.errorMessage = 'AI generated invalid compliance data. Please try again or contact support.';
          this.addStaticAIMessage('I had trouble processing the generated compliance data. Please contact support.');
          return;
        }
      } else {
        console.warn('Gemini API returned no valid content for compliance items.');
        this.addStaticAIMessage('I could not generate your compliance checklist. Please try again.');
        return;
      }

      if (this.currentUserId) {
        await this.userService.updateUserProfile(this.currentUserId, { // FIX: Changed to updateUserProfile
          hasCompletedOnboarding: true
        });
        console.log('DEBUG: User profile marked as completed onboarding.'); // Debugging log
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('DEBUG: Redirecting to dashboard.'); // Debugging log
      this.router.navigate(['/dashboard']);

    } catch (error) {
      console.error('Error completing onboarding:', error);
      this.errorMessage = 'Failed to finalize onboarding. Please contact support.';
      this.addStaticAIMessage('An error occurred during final setup. Please contact support.');
    } finally {
      this.isLoading = false;
      console.log('DEBUG: completeOnboardingAndRedirect finished.'); // Debugging log
    }
  }
}
