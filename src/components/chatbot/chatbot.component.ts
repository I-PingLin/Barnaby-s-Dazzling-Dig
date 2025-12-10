import { Component, ChangeDetectionStrategy, output, signal, inject, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent {
  closeChat = output();

  private geminiService = inject(GeminiService);

  messages = signal<ChatMessage[]>([
    { role: 'model', text: 'Hi there! Ask me a question about the story or anything you want!' }
  ]);
  userInput = signal('');
  isLoading = signal(false);

  private chatContainerEl = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  constructor() {
    afterNextRender(() => {
        this.scrollToBottom();
    });
  }

  async sendMessage(): Promise<void> {
    const messageText = this.userInput().trim();
    if (!messageText || this.isLoading()) {
      return;
    }

    // Add user message to chat
    this.messages.update(m => [...m, { role: 'user', text: messageText }]);
    this.userInput.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    // Get AI response
    const aiResponseText = await this.geminiService.sendMessage(this.messages(), messageText);
    this.messages.update(m => [...m, { role: 'model', text: aiResponseText }]);
    this.isLoading.set(false);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const container = this.chatContainerEl()?.nativeElement;
    if (container) {
        setTimeout(() => container.scrollTop = container.scrollHeight, 0);
    }
  }
}
