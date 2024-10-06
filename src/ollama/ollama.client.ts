// ollama.client.js
import ollama from "ollama";

export class OllamaClient {
  // Method to send a chat request to the Ollama API
  /**
   *
   * @type {ChatRequest} model
   * @type {Message[]} messages
   * @type {Options} options
   * @returns {Promise<ChatResponse>}
   */
  async chat(model, messages, options) {
    try {
      console.log(
        "Sending chat request to Ollama API...messages:",
        messages.length
      );
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
