import { Terminal } from "@xterm/xterm";
import { ollamaClient } from "./ollama.client";
import { WebContainer } from "@webcontainer/api";
import { Message } from "ollama";
import { conversationLogService } from "./ConversationLog/ConversationLog.service";

export const MODEL_OPTION = "llama3.1";

export const SYSTEM_CONFIG_MESSAGE = `
You are an LLM that has access to a web container runtime. The runtime supports basic shell commands and a Node.js environment.

When you need to execute a command to answer the user's question, output it in the following format exactly: [[execute: <command>]].

- For mathematical calculations, use Node.js commands like \`node -e "console.log(Math.sqrt(7))"\`.

Do not include any additional output or explanation in the command. Only output the command in the specified format.

Only use this format when you need to execute a command; otherwise, provide the answer directly.

Note: The runtime does **not** have Python or \`bc\` installed, so avoid using Python or \`bc\` commands.

For the Tic-Tac-Toe game:
1. First, get the current game state: [[execute: node -e "fetch('http://localhost:3111/state').then(res => res.json()).then(console.log)"]]
2. After receiving the game state, analyze it and determine your next move.
3. Then, make your move: [[execute: node -e "fetch('http://localhost:3111/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: <0-8> }) }).then(res => res.json()).then(console.log)"]]

Your goal is to win the game. Always check the current state before making a move. Choose moves strategically to win or block the opponent from winning.
When the game is over you can reset and start again: [[execute: node -e "fetch('http://localhost:3111/reset', { method: 'POST' }).then(res => res.json()).then(console.log)"]]
`;

export const SYSTEM_EXPLAIN_PROMPT = `
You have just received the output from executing a command in the runtime environment. Use this output to provide a detailed explanation to the user. Keep the explanation fairly brief and return all answers in markup. Include the actual Node command that was run to generate the output.

For Tic-Tac-Toe game interactions:
- Explain the current state of the game board.
- You should always be player X, unless specifically overridden by the user.
- If the game is over, announce the winner or if it's a tie.
- If it's the AI's turn, explain your strategy for the next move and include the move command.
- If it's the user's turn, ask them to make a move by specifying a position (0-8).
- Remember the first position (0) is the top-left corner and the last position is the bottom-right corner(8).
`;

export class OllamaService {
  chatContext: Message[] = [];
  terminal: Terminal | null = null;
  webcontainer: WebContainer | null = null;

  constructor() {
    // Optionally initialize the chat context
    // this.initializeChatContext();
  }

  async initializeChatContext(
    terminal: Terminal,
    webcontainer: WebContainer
  ): Promise<void> {
    const [logs] = await conversationLogService.getAllConversationLogs();

    this.chatContext = logs
      .map((log) => [
        { role: "user", content: log.user },
        { role: "assistant", content: log.assistant },
      ])
      .flat();
    this.terminal = terminal;
    this.webcontainer = webcontainer;
  }

  async handleChat(prompt: string, model: string): Promise<string> {
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

        console.log("Command output, before:", commandOutput);

        // Provide the command output back to the LLM for explanation
        const updatedMessages = [
          ...messages,
          { role: "assistant", content: assistantResponse },
          { role: "system", content: SYSTEM_EXPLAIN_PROMPT },
          {
            role: "user",
            content: `Command output:\n${commandOutput}\nCommand run:\n${command}`,
          },
        ];

        // Ask the LLM to generate the final answer using the command output
        assistantResponse = await this.sendChatRequest(
          model,
          updatedMessages,
          userMessage
        );

        // If this was a state fetch, we need to make a move
        if (command.includes("http://localhost:3111/state")) {
          const moveMatch = assistantResponse.match(/\[\[execute: (.+?)\]\]/);
          if (moveMatch) {
            const moveCommand = moveMatch[1].trim();
            const moveOutput = await this.executeCommandInWebContainer(
              moveCommand
            );

            // Provide the move output back to the LLM for final explanation
            const finalMessages = [
              ...updatedMessages,
              { role: "assistant", content: assistantResponse },
              { role: "system", content: SYSTEM_EXPLAIN_PROMPT },
              {
                role: "user",
                content: `Command output:\n${moveOutput}\nCommand run:\n${moveCommand}`,
              },
            ];

            assistantResponse = await this.sendChatRequest(
              model,
              finalMessages,
              userMessage
            );
          }
        }
      } else {
        console.log("Disallowed command:", command);
        // Handle disallowed commands
        assistantResponse =
          "I'm sorry, but I'm not permitted to execute that command.";
      }
    }

    // Store user message and assistant response in chat context
    this.chatContext.push(userMessage, {
      role: "assistant",
      content: assistantResponse,
    });

    return assistantResponse;
  }

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

    const messages = [
      {
        role: "system",
        content: SYSTEM_CONFIG_MESSAGE,
      },
      ...this.chatContext,
    ];

    return { messages, userMessage };
  }

  async sendChatRequest(
    model: string,
    messages: Message[],
    userMessage: Message
  ): Promise<string> {
    try {
      const chatResponse = await ollamaClient.chat(model, messages, {});
      const assistantMessage = {
        role: "assistant",
        content: chatResponse.message.content,
      };
      console.log("Assistant response:", assistantMessage.content);

      this.chatContext.push(assistantMessage);

      return chatResponse.message.content;
    } catch (error) {
      console.error("Error:", error);
      throw new Error("An error occurred while processing the chat request.");
    }
  }

  isCommandAllowed(command: string) {
    const allowedCommands = [
      /^node -e "fetch\('http:\/\/localhost:3111\/state'\).+"/,
      /^node -e "fetch\('http:\/\/localhost:3111\/move'.+\)"/,
      /^node -e "fetch\('http:\/\/localhost:3111\/reset'.+\)"/,
      /^node\s+-e\s+"console\.log\(Math\.\w+\([\d\s.,]*\)\)"$/,
    ];

    return allowedCommands.some((pattern) => pattern.test(command.trim()));
  }

  async executeCommandInWebContainer(command: string) {
    if (!this.webcontainer) {
      throw new Error("WebContainer is not initialized.");
    }

    // Parse the command into executable and arguments
    const args = command.match(/"[^"]+"|[^\s]+/g);
    const cmd = args!.shift() as string;

    // Remove surrounding quotes from arguments
    const sanitizedArgs = args!.map((arg) => arg.replace(/^"|"$/g, ""));

    console.log(`Executing command: ${cmd} with args:`, sanitizedArgs);
    // Spawn the process directly without 'jsh -c'
    const process = await this.webcontainer.spawn(cmd, sanitizedArgs);
    const terminal = this.terminal;
    let output = "";
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal!.write(data), (output += stripAnsiCodes(data));
        },
      })
    );

    // Wait for the process to exit
    await process.exit;

    console.log(
      "ollama.service.executeCommandInWebContainer Command output:",
      output
    );
    return output.trim();
  }
}

// Function to strip ANSI escape codes
function stripAnsiCodes(str: string) {
  // Regular expression to match ANSI escape codes
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export const ollamaService = new OllamaService();
