import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from environment variables");
    }
    // Initialize the client
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  /**
   * Initializes or resets the chat session.
   * @param history Optional conversation history to restore context
   */
  public startChat(history?: { role: string; parts: { text: string }[] }[]) {
    const defaultInstruction = `You are a helpful, witty, and concise AI assistant. 
    
    Interactive UI Protocol:
    At the very end of your response, if relevant, provide 2-3 short, distinct follow-up questions or actions for the user. 
    Format them strictly as a JSON array inside a specific block like this: 
    <<<SUGGESTIONS: ["Action 1", "Action 2"]>>>
    
    Do not include this block if the response is very short or a simple greeting.`;

    this.chatSession = this.ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction: defaultInstruction,
      },
      history: history,
    });
  }

  /**
   * Sends a message to the model and yields chunks of the response.
   */
  public async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chatSession) {
      this.startChat();
    }

    if (!this.chatSession) {
        throw new Error("Failed to initialize chat session.");
    }

    try {
      const resultStream = await this.chatSession.sendMessageStream({ message });

      for await (const chunk of resultStream) {
        const responseChunk = chunk as GenerateContentResponse;
        const text = responseChunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();