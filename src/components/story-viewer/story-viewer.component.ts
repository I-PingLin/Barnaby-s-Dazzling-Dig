import { Component, ChangeDetectionStrategy, input, output, effect, signal, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './story-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryViewerComponent {
  pageText = input.required<string>();
  pageNumber = input.required<number>();
  totalPages = input.required<number>();

  prevPage = output();
  nextPage = output();

  private geminiService = inject(GeminiService);
  
  imageUrl = signal<string | null>(null);
  isLoadingImage = signal<boolean>(true);
  isSpeaking = signal<boolean>(false);
  imageQuality = signal<'1K' | '2K' | '4K'>('1K');
  
  private speechApi = window.speechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    effect(() => {
      const text = this.pageText();
      const quality = this.imageQuality();
      // Use untracked to prevent re-triggering when signals inside the async operation change.
      untracked(() => this.generateImageForPage(text, quality));
    });
  }

  async generateImageForPage(text: string, quality: '1K' | '2K' | '4K'): Promise<void> {
    this.isLoadingImage.set(true);
    this.imageUrl.set(null);
    const generatedImageUrl = await this.geminiService.generateImage(text, quality);
    this.imageUrl.set(generatedImageUrl);
    this.isLoadingImage.set(false);
  }

  setImageQuality(quality: '1K' | '2K' | '4K') {
    if (this.imageQuality() !== quality) {
      this.imageQuality.set(quality);
      // The effect will automatically re-run and generate a new image
    }
  }

  readAloud() {
    // NOTE: The user requested 'gemini-2.5-flash-preview-tts', which doesn't exist in the @google/genai library.
    // Using the browser's built-in SpeechSynthesis API as a robust and functional alternative.
    if (this.isSpeaking()) {
      this.speechApi.cancel();
      this.isSpeaking.set(false);
      return;
    }
    
    if (this.speechApi.speaking) {
      this.speechApi.cancel();
    }

    this.utterance = new SpeechSynthesisUtterance(this.pageText());
    this.utterance.onstart = () => this.isSpeaking.set(true);
    this.utterance.onend = () => this.isSpeaking.set(false);
    this.utterance.onerror = () => this.isSpeaking.set(false);
    this.speechApi.speak(this.utterance);
  }
}
