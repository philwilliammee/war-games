// base.service.ts

import { ollamaClient } from "../model/ollama/ollama.client";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";
import { Message, Options } from "ollama";
import { bedrockClient } from "../model/bedrock/bedrock.service";
import { renderAiOutput } from "../render";

const PLATFORM = import.meta.env.VITE_PLATFORM;
const MODEL = import.meta.env.VITE_MODEL;

export abstract class BaseService {
  chatContext: Message[] = [];
  terminal: Terminal | null = null;
  webcontainer: WebContainer | null = null;

  // Abstract properties to be defined in subclasses
  abstract SYSTEM_CONFIG_MESSAGE: string;

  // Initialize the chat context and set up the terminal and web container
  async initializeChatContext(
    terminal: Terminal,
    webcontainer: WebContainer
  ): Promise<void> {
    this.chatContext = [
      {
        role: "assistant",
        content: "HOW ARE YOU FEELING TODAY?",
      },
    ];
    this.terminal = terminal;
    this.webcontainer = webcontainer;
    renderAiOutput("HOW ARE YOU FEELING TODAY?");
  }

  // Handle the chat interaction
  async handleChat(prompt: string): Promise<string> {
    const promptWithTimestamp = `${prompt}`;
    const { messages } = this.prepareMessages(promptWithTimestamp);
    const assistantResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantResponse);

    let finalAssistantResponse = assistantResponse;

    // Process commands (to be implemented in subclasses)
    finalAssistantResponse = await this.processCommand(
      assistantResponse,
      finalAssistantResponse
    );

    return finalAssistantResponse;
  }

  // Abstract method for processing commands
  abstract processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string>;

  // Prepare messages for the chat request
  prepareMessages(prompt: string): {
    messages: Message[];
    userMessage: Message;
  } {
    const now = new Date().toLocaleTimeString();
    const userMessage = {
      role: "user",
      content: `${now}: ${prompt}`,
    };

    this.chatContext.push(userMessage);
    this.truncateChatContext();
    const messages = [
      {
        role: "system",
        content: this.SYSTEM_CONFIG_MESSAGE,
      },
      ...this.chatContext,
    ];

    return { messages, userMessage };
  }

  // Truncate the chat context to keep it within a reasonable size
  truncateChatContext(): void {
    const MAX_MESSAGES = 10;
    if (this.chatContext.length > MAX_MESSAGES) {
      this.chatContext = this.chatContext.slice(-MAX_MESSAGES);
    }
  }

  // Send a chat request to the assistant
  async sendChatRequest(messages: Message[]): Promise<string> {
    console.log("Sending chat request with messages:", messages);
    const platform = PLATFORM;
    const now = new Date().toLocaleTimeString();

    try {
      if (platform === "bedrock") {
        const chatResponse = await bedrockClient.chat(messages, {
          temperature: 0.6,
        });
        const assistantMessage = {
          role: "assistant",
          content: `${now}: ${chatResponse}`,
        };
        this.chatContext.push(assistantMessage);
        return chatResponse;
      } else {
        const chatResponse = await ollamaClient.chat(
          MODEL,
          messages,
          {} as Options
        );
        const assistantMessage = {
          role: "assistant",
          content: `${now}: ${chatResponse.message.content}`,
        };
        this.chatContext.push(assistantMessage);
        return chatResponse.message.content;
      }
    } catch (error) {
      console.error("Error:", error);
      throw new Error("An error occurred while processing the chat request.");
    }
  }

  // Check if the command is allowed
  isCommandAllowed(command: string): boolean {
    const allowedPatterns = [
      /^node\s+/i, // Commands starting with 'node'
      /.+/, // Any other commands
    ];
    return allowedPatterns.some((pattern) => pattern.test(command.trim()));
  }

  // Execute a command in the web container
  async executeCommandInWebContainer(command: string): Promise<string> {
    if (!this.webcontainer) {
      throw new Error("WebContainer is not initialized.");
    }

    const args = command.match(/"[^"]+"|[^\s]+/g);
    const cmd = args!.shift() as string;
    const sanitizedArgs = args!.map((arg) => arg.replace(/^"|"$/g, ""));

    console.log(`Executing command: ${cmd} with args:`, sanitizedArgs);

    const process = await this.webcontainer.spawn(cmd, sanitizedArgs);
    const terminal = this.terminal;
    let output = "";

    process.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal?.write(data);
          output += stripAnsiCodes(data);
        },
      })
    );

    await process.exit;
    console.log("Command output:", output);
    return output.trim();
  }
}

// Helper function to strip ANSI escape codes
function stripAnsiCodes(str: string) {
  return str.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "");
}
