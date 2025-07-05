// src/app/app.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet], // Keep RouterOutlet for routing
  template: '<router-outlet></router-outlet>', // Directly define inline template
  styleUrl: './app.css' // Keep styleUrl for potential global app-level styles if needed later
})
export class App {
  // The title property is no longer needed as the template is simplified
  // title = 'ArtificialInsights';
}
