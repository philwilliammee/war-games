// ollama.client.js
import ollama, { ChatResponse, Message, Options } from "ollama";

export class OllamaClient {
  async chat(
    model: string,
    messages: Message[],
    options: Options
  ): Promise<ChatResponse> {
    try {
      console.log("Sending chat request to Ollama API...messages:", messages);
      const chatResponse = await ollama.chat({
        model,
        messages,
        options,
        // keep_alive: 5, // the model will be "turned off" after the default of five minutes.
      });
      return chatResponse;
    } catch (error) {
      console.error("Error in OllamaClient:", error);
      throw new Error(
        "An error occurred while communicating with the Ollama API."
      );
    }
  }
}

// Export a single instance of the OllamaClient
export const ollamaClient = new OllamaClient();
