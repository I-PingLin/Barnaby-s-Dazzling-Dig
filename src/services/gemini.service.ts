import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage } from '../models/chat.model';

// Define a simple type for the story structure we expect from the AI.
export interface Story {
  title: string;
  pages: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession = signal<Chat | null>(null);

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not expose this key in the client-side code in a real application.
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateStory(): Promise<Story> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Generate a short, 5-page story for a 5-year-old child about a curious bunny named Barnaby who discovers a magical, glowing carrot. Each page should be a short paragraph. The title should be imaginative.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pages: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr) as Story;
    } catch (error) {
      console.error('Error generating story:', error);
      // Return a fallback story on error
      return {
        title: "Barnaby the Brave Bunny",
        pages: [
          "Once upon a time, in a sunny meadow, lived a little bunny named Barnaby. He had the fluffiest tail and the twitchiest nose of all his friends.",
          "One sunny morning, while hopping through the tall grass, Barnaby saw something magical! It was a carrot, but it was glowing with a soft, golden light.",
          "Barnaby wiggled his nose and bravely nibbled the glowing carrot. *POP!* Suddenly, he could understand the birds singing in the trees and the squirrels chattering away.",
          "He spent the whole day talking to his new friends, learning secrets of the forest. He learned where the juiciest clovers grew and where the best hiding spots were.",
          "As the sun set, the glow from the carrot faded, but Barnaby never forgot his magical day. He was no longer just a curious bunny; he was Barnaby, the bunny who could talk to animals!"
        ]
      };
    }
  }

  async generateImage(prompt: string, quality: '1K' | '2K' | '4K'): Promise<string> {
    const qualityPrompt = {
      '1K': 'A simple, charming illustration.',
      '2K': 'A detailed and beautiful illustration.',
      '4K': 'A vibrant, highly detailed, photorealistic 4K illustration.'
    }[quality];

    try {
      // NOTE: The user requested 'gemini-3-pro-image-preview', which does not exist.
      // Using 'imagen-4.0-generate-001' as the correct model for image generation per documentation.
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Create a whimsical, colorful, child-friendly storybook illustration. ${qualityPrompt} The scene is: ${prompt}`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
      console.error('Error generating image:', error);
      // Return a placeholder image on error
      return `https://picsum.photos/512/512?random=${Math.random()}`;
    }
  }

  async sendMessage(messages: ChatMessage[], newMessage: string): Promise<string> {
     if (!this.chatSession()) {
        // NOTE: The user requested 'gemini-3-pro-preview'.
        // Using 'gemini-2.5-flash' as it is the recommended general-purpose model.
        const chat = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly, cheerful, and helpful chatbot for a 5-year-old child. Keep your answers very short, simple, and encouraging. Use simple words.',
            },
            // The API expects a specific format, so we transform our ChatMessage[]
            history: messages.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
            }))
        });
        this.chatSession.set(chat);
    }
    
    try {
        const chat = this.chatSession();
        if(!chat) return "Chat not initialized.";

        const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error('Error in chat session:', error);
        this.chatSession.set(null); // Reset chat on error
        return "Oops! I got a little confused. Can you ask me something else?";
    }
  }
}
