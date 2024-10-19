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
    const content = JSON.stringify({
      assistantResponse: "HOW ARE YOU FEELING TODAY?",
      commands: [],
    });
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

  // Extract structured commands from the response
  async extractCommands(response: string): Promise<ExtractedCommand[]> {
    console.log("Extracting commands from response:", response);
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(
        response
          .trim()
          .replace(/^[^\{]*/, "")
          .replace(/[^\}]*$/, "")
      );
    } catch (error: any) {
      console.error("Failed to parse response as JSON:", error);
      this.chatContext.push({
        role: "user",
        content: `Failed to parse response as JSON: ${error.message}`,
      });
      // maybe don't handle it here.
      // @todo this should do the full error handling, and ui updating not just return an empty array.
      const aiResponse = await this.sendChatRequest(this.chatContext);
      this.chatContext.push({
        role: "assistant",
        content: aiResponse,
      });
      console.log("aiResponse", aiResponse);
      return [];
    }

    if (!parsedResponse.commands || !Array.isArray(parsedResponse.commands)) {
      console.error("No commands found or commands format is invalid");
      this.chatContext.push({
        role: "user",
        content: `No commands found or commands format is invalid in response: ${response}`,
      });
      // maybe don't handle it here.
      // @todo this should do the full error handling, and ui updating not just return an empty array.
      const aiResponse = await this.sendChatRequest(this.chatContext);
      console.log("aiResponse", aiResponse);
      this.chatContext.push({
        role: "assistant",
        content: aiResponse,
      });
      return [];
    }

    return parsedResponse.commands;
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

  // Check if the command is allowed
  isCommandAllowed(command: ExtractedCommand): boolean {
    return true;
    const allowedPatterns = [
      /^node\s+/i, // Commands starting with 'node'
      /.+/, // Any other commands
    ];
    return allowedPatterns.some((pattern) =>
      pattern.test(command.command.trim())
    );
  }

  // Execute a command in the web container
  async executeCommandInWebContainer(
    command: ExtractedCommand
  ): Promise<string> {
    if (!this.webcontainer) {
      throw new Error("WebContainer is not initialized.");
    }

    const cmd = command.command;
    let args = command.args;

    // Append the content to the arguments if it's a node command with '-e'
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

// Helper function to strip ANSI escape codes
function stripAnsiCodes(str: string) {
  return str.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "");
}

interface ExtractedCommand {
  command: string;
  args: string[];
  content: string;
}
