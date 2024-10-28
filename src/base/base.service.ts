// base/base.service.ts
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

  abstract boot(terminal: Terminal, webcontainer: WebContainer): Promise<void>;

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
    console.log(webcontainer);
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
    const { messages } = this.prepareMessages(prompt);
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
   * Extracts the structured response from the assistant's reply.
   * This function attempts to parse a JSON object containing the assistant's response and commands.
   * @param response - The assistant's response containing the JSON object.
   * @returns The parsed StructuredResponse object.
   * @throws Will throw an error if the response cannot be parsed as JSON.
   */
  static async extractStructuredResponse(
    response: string
  ): Promise<StructuredResponse> {
    console.log(
      "Extracting structured response from assistant reply:",
      response
    );

    // Use a regular expression to extract the JSON object (from the first '{' to the last '}')
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in response");
      throw new Error("No JSON object found in assistant response");
    }

    const jsonString = jsonMatch[0];

    // Log any text before or after the JSON object
    const preJsonText = response.substring(0, jsonMatch.index).trim();
    const postJsonText = response
      .substring(jsonMatch.index! + jsonString.length)
      .trim();

    if (preJsonText) {
      console.log("Text before JSON:", preJsonText);
    }
    if (postJsonText) {
      console.log("Text after JSON:", postJsonText);
    }

    // Parse the JSON string
    let parsedResponse: StructuredResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw new Error("Failed to parse JSON from assistant response");
    }

    return parsedResponse;
  }

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    let structuredResponse: StructuredResponse;
    let commands: ExtractedCommand[] = [];

    try {
      // Try to extract the structured response from the assistant's reply
      structuredResponse = await BaseService.extractStructuredResponse(
        assistantResponse
      );
      // Update currentResponse with the assistant's message
      currentResponse = structuredResponse.assistantResponse;
      // Get the list of commands
      commands = structuredResponse.commands || [];
    } catch (error: any) {
      console.error("Error extracting structured response:", error);
      const errorPrompt = `An error occurred while extracting the structured response: ${error.message}. Please provide the response in the correct JSON format.`;

      // Handle the error and get a new structured response
      const { newStructuredResponse, updatedResponse } =
        await this.handleCommandError(errorPrompt, currentResponse);

      structuredResponse = newStructuredResponse;
      currentResponse = updatedResponse;
      commands = structuredResponse.commands || [];
    }

    // Proceed to execute the commands
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

          // Handle the error and get a new structured response
          const { newStructuredResponse, updatedResponse } =
            await this.handleCommandError(errorPrompt, currentResponse);

          // Update the commands list with new commands
          commands.push(...(newStructuredResponse.commands || []));
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
  ): Promise<{
    newStructuredResponse: StructuredResponse;
    updatedResponse: string;
  }> {
    const { messages } = this.prepareMessages(errorPrompt);
    const assistantRetryResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantRetryResponse);
    currentResponse += `\n${assistantRetryResponse}`;

    // Extract new structured response from the assistant's reply
    let newStructuredResponse: StructuredResponse = {
      assistantResponse: "",
      commands: [],
    };
    try {
      newStructuredResponse = await BaseService.extractStructuredResponse(
        assistantRetryResponse
      );
    } catch (error: any) {
      console.error("Error extracting structured response after retry:", error);
    }

    return { newStructuredResponse, updatedResponse: currentResponse };
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
      console.log(this.webcontainer);
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
