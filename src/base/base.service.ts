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

  /**
   * Initializes the chat context with a default assistant message and sets up the terminal and web container.
   * @param terminal - The terminal instance to be used for displaying command outputs.
   * @param webcontainer - The web container instance for executing commands.
   */
  async initializeChatContext(
    terminal: Terminal,
    webcontainer: WebContainer
  ): Promise<void> {
    const aiResponse: StructuredResponse = {
      assistantResponse: "HOW ARE YOU FEELING TODAY?",
      commands: [],
    };
    const content = JSON.stringify(aiResponse, null, 2);
    this.chatContext = [
      {
        role: "assistant",
        content,
      },
    ];
    this.terminal = terminal;
    this.webcontainer = webcontainer;
    renderAiOutput(content);
  }

  /**
   * Handles a chat interaction by sending a prompt to the assistant, rendering the response,
   * and processing any commands included in the assistant's response.
   * @param prompt - The user's prompt to the assistant.
   * @returns The assistant's final response after processing any commands.
   */
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

  /**
   * Extracts structured commands from the assistant's response.
   * This function attempts to parse a JSON object containing commands.
   * @param response - The assistant's response containing potential commands.
   * @returns An array of extracted commands.
   * @throws Will throw an error if the response cannot be parsed as JSON.
   */
  static async extractCommands(response: string): Promise<ExtractedCommand[]> {
    console.log("Extracting commands from response:", response);
    const trimmedCommand = response
      .trim() // Remove leading and trailing whitespace.
      .replace(/^[^\{]*/, "") // Remove everything before the first '{'.
      .replace(/[^\}]*$/, ""); // Remove everything after the last '}'.

    // If the parse fails, an error will be thrown and caught in the calling function.
    const parsedResponse = JSON.parse(trimmedCommand);

    if (!parsedResponse.commands || !Array.isArray(parsedResponse.commands)) {
      console.error("No commands found or commands format is invalid");
      return [];
    }

    return parsedResponse.commands as ExtractedCommand[];
  }

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    let commands: ExtractedCommand[] = [];

    try {
      // Try to extract commands from the assistant's response
      commands = await BaseService.extractCommands(assistantResponse);
    } catch (error: any) {
      console.error("Error extracting commands:", error);
      const errorPrompt = `An error occurred while extracting commands: ${error.message}. Please provide the commands in the correct format.`;

      // Handle the error and get new commands
      const { newCommands, updatedResponse } = await this.handleCommandError(
        errorPrompt,
        currentResponse
      );
      commands = newCommands;
      currentResponse = updatedResponse;
    }

    const maxCommands = 3;
    let commandCount = 0;

    for (const command of commands) {
      if (commandCount >= maxCommands) break;
      console.log("Executing command:", command);

      try {
        // Execute the command
        const output = await this.executeCommandInWebContainer(command);
        currentResponse += `\nCommand Output:\n${output}`;

        // Check for errors in the output
        if (/error:/i.test(output)) {
          const errorPrompt = `Error executing command '${command.command}': ${output}. Please correct the command.`;

          // Handle the error and get new commands
          const { newCommands, updatedResponse } =
            await this.handleCommandError(errorPrompt, currentResponse);
          commands.push(...newCommands);
          currentResponse = updatedResponse;
        }
      } catch (error: any) {
        console.error("Error executing command:", error);
        currentResponse += `\nError executing command: ${error.message}`;
      }

      commandCount++;
    }

    return currentResponse;
  }

  private async handleCommandError(
    errorPrompt: string,
    currentResponse: string
  ): Promise<{ newCommands: ExtractedCommand[]; updatedResponse: string }> {
    const { messages } = this.prepareMessages(errorPrompt);
    const assistantRetryResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantRetryResponse);
    currentResponse += `\n${assistantRetryResponse}`;

    // Extract new commands from the assistant's response
    let newCommands: ExtractedCommand[] = [];
    try {
      newCommands = await BaseService.extractCommands(assistantRetryResponse);
    } catch (error: any) {
      console.error("Error extracting commands after retry:", error);
    }

    return { newCommands, updatedResponse: currentResponse };
  }

  /**
   * Prepares the chat context for sending to the assistant by adding the user's message
   * and truncating older messages to keep the context manageable.
   * @param prompt - The user's message to the assistant.
   * @returns An object containing the prepared messages and the user's message.
   */
  prepareMessages(prompt: string): {
    messages: Message[];
    userMessage: Message;
  } {
    const userMessage = {
      role: "user",
      content: prompt,
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

  /**
   * Truncates the chat context to ensure that only a limited number of messages are retained.
   * This helps to keep the context within a manageable size for processing.
   */
  truncateChatContext(): void {
    const MAX_MESSAGES = 10;
    if (this.chatContext.length > MAX_MESSAGES) {
      this.chatContext = this.chatContext.slice(-MAX_MESSAGES);
    }
  }

  /**
   * Sends a chat request to the assistant using either the Bedrock or Ollama platform.
   * Adds the assistant's response to the chat context.
   * @param messages - The array of messages to send as part of the request.
   * @returns The assistant's response content.
   * @throws Will throw an error if the chat request fails.
   */
  async sendChatRequest(messages: Message[]): Promise<string> {
    console.log("Sending chat request with messages:", messages);
    const platform = PLATFORM;

    try {
      if (platform === "bedrock") {
        const chatResponse = await bedrockClient.chat(messages, {
          temperature: 0.6,
        });
        const assistantMessage = {
          role: "assistant",
          content: chatResponse,
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
          content: chatResponse.message.content,
        };
        this.chatContext.push(assistantMessage);
        return chatResponse.message.content;
      }
    } catch (error) {
      console.error("Error:", error);
      throw new Error("An error occurred while processing the chat request.");
    }
  }

  /**
   * Checks if a given command is allowed based on predefined patterns.
   * @param command - The command to check.
   * @returns True if the command is allowed, otherwise false.
   */
  isCommandAllowed(command: ExtractedCommand): boolean {
    return true;
    const allowedPatterns = [
      /^node\s+/i, // Commands starting with 'node'.
      /.+/, // Any other commands.
    ];
    return allowedPatterns.some((pattern) =>
      pattern.test(command.command.trim())
    );
  }

  /**
   * Executes a command within the web container and returns the output.
   * @param command - The command to execute, including its arguments and content.
   * @returns The output produced by executing the command.
   * @throws Will throw an error if the web container is not initialized.
   */
  async executeCommandInWebContainer(
    command: ExtractedCommand
  ): Promise<string> {
    if (!this.webcontainer) {
      throw new Error("WebContainer is not initialized.");
    }

    const cmd = command.command;
    let args = command.args;

    // Append the content to the arguments if it's a node command with '-e'.
    if (cmd === "node" && args.includes("-e")) {
      args = [...args, command.content];
    }

    if (cmd === "update_file" && command.args.length > 0) {
      const filePath = command.args[0];
      console.log(`Updating file: ${filePath} with content:`, command.content);
      try {
        try {
          await this.webcontainer.fs.writeFile(filePath, command.content);
        } catch (error: any) {
          if (error.code === "ENOENT") {
            console.log(`File does not exist, creating: ${filePath}`);
            await this.webcontainer.fs.mkdir(
              filePath.substring(0, filePath.lastIndexOf("/")),
              { recursive: true }
            );
            await this.webcontainer.fs.writeFile(filePath, command.content);
          } else {
            console.error("Error writing file:", error);
            return `Error writing file: ${error.message}`;
          }
        }
      } catch (error: any) {
        console.error("Error writing file:", error);
        return `Error writing file: ${error.message}`;
      }
      return `File updated: ${filePath}`;
    }

    console.log(`Executing command: ${cmd} with args:`, args);

    const process = await this.webcontainer.spawn(cmd, args);
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

/**
 * Helper function to strip ANSI escape codes from a string.
 * @param str - The string containing potential ANSI escape codes.
 * @returns The string with ANSI escape codes removed.
 */
function stripAnsiCodes(str: string): string {
  return str.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "");
}

export interface ExtractedCommand {
  command: string;
  args: string[];
  content: string;
}

export interface StructuredResponse {
  assistantResponse: string;
  commands: ExtractedCommand[];
}
