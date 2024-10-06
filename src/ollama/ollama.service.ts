// import * as showdown from "showdown";
// import { conversationLogService } from "./ConversationLog/ConversationLog.service";
import { ollamaClient } from "./ollama.client";

// Initialize a converter for markdown to HTML conversion
// const converter = new showdown.Converter();

export const MODEL_OPTION = "llama3.1";

export const SYSTEM_CONFIG_MESSAGE = `
You are an LLM that has access to a web container runtime. The runtime supports basic shell commands and a Node.js environment.

When you need to execute a command to answer the user's question, output it in the following format exactly: [[execute: <command>]].

- For mathematical calculations, use Node.js commands like \`node -e "console.log(Math.sqrt(7))"\`.

Do not include any additional output or explanation in the command. Only output the command in the specified format.

Only use this format when you need to execute a command; otherwise, provide the answer directly.

Note: The runtime does **not** have Python or \`bc\` installed, so avoid using Python or \`bc\` commands.
`;

const MAX_TOKENS = 120000;

export class OllamaService {
  /** @type {Message[]} */
  chatContext = [];
  terminal = null;
  webcontainer = null;
  constructor() {
    // Optionally initialize the chat context
    // this.initializeChatContext();
  }

  /**
   * Initialize chat context from conversation logs.
   * @returns {Promise<void>}
   */
  async initializeChatContext(terminal, webcontainer) {
    console.log("webcontainer", webcontainer)
    this.terminal = terminal;
    this.webcontainer = webcontainer;
    console.log("Initializing chat context...", this.terminal);
    try {
      // const [logs] = await conversationLogService.getAllConversationLogs();
      const logs: any[] = [];
      // this.chatContext = logs
      //   .map((log) => [
      //     { role: "user", content: log.user },
      //     { role: "assistant", content: log.assistant },
      //   ])
      //   .flat();
      console.log("Chat context initialized.");
    } catch (error) {
      console.error("Error initializing chat context:", error);
    }
  }

  /**
   * Handles chat interaction with the LLM.
   * @param {string} prompt
   * @param {string} model
   * @param {Terminal} terminal
   * @returns {Promise<string>}
   */
  async handleChat(prompt, model) {
    const { messages, userMessage } = this.prepareMessages(prompt);
    let assistantResponse = await this.sendChatRequest(
      model,
      messages,
      userMessage
    );

    // Check if the assistant's response contains a command execution request
    const commandMatch = assistantResponse.match(/\[\[execute: (.+?)\]\]/);

    if (commandMatch) {
      const command = commandMatch[1].trim();

      // Validate the command (implement validation as needed)
      if (this.isCommandAllowed(command)) {
        // Execute the command in the WebContainer
        const commandOutput = await this.executeCommandInWebContainer(command);
        const outputEl = document.querySelector(".output");
        outputEl.textContent = "The answer is: " + commandOutput;

        console.log("Command output, before:", commandOutput);

        // Provide the command output back to the LLM
        const updatedMessages = [
          ...messages,
          { role: "assistant", content: assistantResponse },
          { role: "user", content: `Command output:\n${commandOutput}` },
        ];

        // Ask the LLM to generate the final answer using the command output
        assistantResponse = await this.sendChatRequest(
          model,
          updatedMessages,
          userMessage
        );
      } else {
        console.log("Disallowed command:", command);
        // Handle disallowed commands
        assistantResponse =
          "I'm sorry, but I'm not permitted to execute that command.";
      }
    }

    return assistantResponse;
  }

  /**
   * Prepares the chat messages for the LLM.
   * @param {string} prompt
   * @returns {{ messages: Message[], userMessage: Message }}
   */
  prepareMessages(prompt) {
    const now = new Date().toLocaleTimeString();
    const userMessage = {
      role: "user",
      content: `${now}: ${prompt}`,
    };

    this.chatContext.push(userMessage);

    const messages = [
      {
        role: "system",
        content: SYSTEM_CONFIG_MESSAGE,
      },
      ...this.chatContext,
    ];

    return { messages, userMessage };
  }

  /**
   * Sends a chat request to the LLM and returns the assistant's response.
   * @param {string} model
   * @param {Message[]} messages
   * @param {Message} userMessage
   * @returns {Promise<string>}
   */
  async sendChatRequest(model, messages, userMessage) {
    try {
      const chatResponse = await ollamaClient.chat(model, messages);
      const assistantMessage = {
        role: "assistant",
        content: chatResponse.message.content,
      };
      console.log("Assistant response:", assistantMessage.content);

      this.chatContext.push(assistantMessage);

      // await this.saveConversationLog(
      //   userMessage.content,
      //   chatResponse.message.content
      // );

      // return converter.makeHtml(chatResponse.message.content);
      return chatResponse.message.content;
    } catch (error) {
      console.error("Error:", error);
      throw new Error("An error occurred while processing the chat request.");
    }
  }

  /**
   * Saves the user-assistant conversation log.
   * @param {string} userMessageContent
   * @param {string} assistantMessageContent
   * @returns {Promise<void>}
   */
  // async saveConversationLog(userMessageContent, assistantMessageContent) {
  //   try {
  //     const log = {
  //       user: userMessageContent.slice(0, 1000),
  //       assistant: assistantMessageContent,
  //     };
  //     await conversationLogService.createConversationLog(log);
  //     console.log("Conversation log saved.");
  //   } catch (error) {
  //     console.error("Error saving conversation log:", error);
  //   }
  // }

  /**
   * Trims the chat context to ensure it stays within the maximum token limit.
   * @returns {void}
   */
  trimChatContext() {
    let totalTokens = countTokens(
      this.chatContext.map(({ content }) => content).join(" ")
    );

    while (totalTokens > MAX_TOKENS && this.chatContext.length > 0) {
      const removedMessage = this.chatContext.shift();
      totalTokens -= countTokens(removedMessage.content);
    }
  }

  /**
   * @type {string} command
   */
  isCommandAllowed(command) {
    return true;
    const nodeCommandPattern =
      /^node\s+-e\s+"console\.log\(Math\.\w+\([\d\s.,]*\)\)"$/;
    return nodeCommandPattern.test(command.trim());
  }

  async executeCommandInWebContainer(command) {

    if (!this.webcontainer) {
      throw new Error("WebContainer is not initialized.");
    }

    // Parse the command into executable and arguments
    const args = command.match(/"[^"]+"|[^\s]+/g);
    const cmd = args.shift();

    // Remove surrounding quotes from arguments
    const sanitizedArgs = args.map((arg) => arg.replace(/^"|"$/g, ""));

    console.log(`Executing command: ${cmd} with args:`, sanitizedArgs);
    // Spawn the process directly without 'jsh -c'
    const process = await this.webcontainer.spawn(cmd, sanitizedArgs);
    const terminal = this.terminal;
    let output = "";
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data), (output += stripAnsiCodes(data));
        },
      })
    );

    // Collect the command output
    // const reader = process.output.getReader();
    // try {
    //   let result;
    //   while (!(result = await reader.read()).done) {
    //     const chunk = result.value; // Should be a string
    //     console.log("Chunk type:", typeof chunk); // Should output 'string'
    //     console.log("Chunk:", chunk);

    //     // Append the chunk after stripping ANSI codes
    //     output += stripAnsiCodes(chunk);
    //     break;
    //   }
    // } catch (error) {
    //   console.error("Error reading process output:", error);
    //   throw error;
    // } finally {
    //   reader.releaseLock();
    // }

    // Wait for the process to exit
    const exitCode = await process.exit;

    if (exitCode !== 0) {
      throw new Error(`Command exited with code ${exitCode}`);
    }

    console.log("Command output:", output);
    return output.trim();
  }
}

// Function to strip ANSI escape codes
function stripAnsiCodes(str) {
  // Regular expression to match ANSI escape codes
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export const ollamaService = new OllamaService();

/**
 * Counts the number of tokens (words) in a string.
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  return text.split(/\s+/).length;
}
