import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoryViewerComponent } from './components/story-viewer/story-viewer.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { GeminiService, Story } from './services/gemini.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StoryViewerComponent, ChatbotComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private geminiService = inject(GeminiService);

  isLoadingStory = signal<boolean>(true);
  story = signal<Story | null>(null);
  currentPageIndex = signal<number>(0);
  isChatbotOpen = signal<boolean>(false);

  storyTitle = computed(() => this.story()?.title ?? 'Loading Story...');
  storyPages = computed(() => this.story()?.pages ?? []);
  currentPageText = computed(() => this.storyPages()[this.currentPageIndex()] ?? '');

  async ngOnInit(): Promise<void> {
    this.isLoadingStory.set(true);
    const generatedStory = await this.geminiService.generateStory();
    this.story.set(generatedStory);
    this.isLoadingStory.set(false);
  }

  goToNextPage(): void {
    this.currentPageIndex.update(i => Math.min(i + 1, this.storyPages().length - 1));
  }

  goToPrevPage(): void {
    this.currentPageIndex.update(i => Math.max(0, i - 1));
  }

  toggleChatbot(): void {
    this.isChatbotOpen.update(open => !open);
  }
}
