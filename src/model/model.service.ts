import { ollamaClient } from "./ollama/ollama.client";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";
import { Message } from "ollama";
import { conversationLogService } from "./ConversationLog/ConversationLog.service";
import { bedrockClient } from "./bedrock/bedrock.service";
import { renderAiOutput } from "../render";
// Initialize a converter for markdown to HTML conversion
// @todo instead of having the llm fetch the game state every round I fetch it and add it tot he prompt.

const PLATFORM = import.meta.env.VITE_PLATFORM;
const MODEL = import.meta.env.VITE_MODEL;

export const SYSTEM_CONFIG_MESSAGE = `
You are an LLM that has access to a web container runtime. The runtime supports basic shell commands and a Node.js environment.

When you need to execute a command to answer the user's question, output it in the following format exactly: [[execute: <command>]].

For mathematical calculations, use Node.js commands like \`node -e "console.log(Math.sqrt(7))"\`.

Do not include any additional output or explanation in the command. Only output the command in the specified format.

Only use this format when you need to execute a command; otherwise, provide the answer directly.

Note: The runtime does **not** have Python or \`bc\` installed, so avoid using Python or \`bc\` commands.

For the Tic-Tac-Toe game:
1. First, get the current game state:

    [[execute: node -e "fetch('http://localhost:3111/state').then(res => res.json()).then(console.log)"]]

2. After receiving the game state, analyze it and determine your next move.
3. Then, make your move:

   [[execute: node -e "fetch('http://localhost:3111/move', { method: 'POST', headers: { 'Content-Type': 'application/json' },body: JSON.stringify({ position: <0-8> })}).then(res => res.json()).then(console.log)"]]


You can also reset the game state by running:

  [[execute: node -e "fetch('http://localhost:3111/reset', { method: 'POST' }).then(res => res.json()).then(console.log)"]]


Your goal is to win the game while prioritizing defensive play. Always check the current state before making a move. Follow these guidelines:

1. Defense First: Always check if the opponent has any immediate winning moves. Block these moves as your top priority.
2. Win if Possible: If you have an immediate winning move and there's no urgent defensive need, take it.
3. Strategic Defense: Look for moves that simultaneously block multiple potential winning lines for the opponent.
4. Controlled Offense: Create opportunities for yourself, but not at the expense of leaving critical defensive positions open.
5. Center Control: If the center is available and there's no immediate threat, consider taking it as it offers good offensive and defensive options.
6. Corner Preference: In the absence of immediate threats or opportunities, prefer corners over edge positions.
7. Balanced Play: Remember the key importance of balanced play - always consider both offensive opportunities and defensive necessities equally.";

Remember, a good defense often leads to offensive opportunities. Balance your strategy accordingly.


If You ever: receive a message like: Command output:\n\${commandOutput}\nCommand run:\n\${command}
You have just received the output from executing a command in the runtime environment.

For Tic-Tac-Toe game interactions:
- You should always be player X, unless specifically overridden by the user.
- If the game is over, announce the winner or if it's a tie.
- If it's the  turn, explain your strategy for the next move and include the move command.
- If it's the user's turn, ask them to make a move by specifying a position (0-8).
- Remember the first position (0) is the top-left corner and the last position is the bottom-right corner(8).
- Whoever goes first (usually you) is player (X) and the second player is (O).
  After any move it is the end of your turn and you should make no other moves.
`;

interface GameState {
  board: string[];
  currentPlayer: string;
  gameOver: boolean;
  availableMoves: number[];
}

export class ModelService {
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

  async handleChat(prompt: string): Promise<string> {
    const gameState = await modelService.getGameState();
    console.log("Current Game State:", gameState);
    const promptPlusGameState = `${prompt}\n\n${gameState}`;
    const { messages } = this.prepareMessages(promptPlusGameState);
    const assistantResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantResponse);

    console.log("assistantResponse", assistantResponse);

    let finalAssistantResponse = assistantResponse;
    let commandMatches = [
      ...assistantResponse.matchAll(/\[\[execute: (.+?)\]\]/g),
    ];
    let commandCount = 0;

    while (commandMatches.length > 0 && commandCount < 5) {
      for (const match of commandMatches) {
        if (commandCount >= 5) {
          break;
        }
        const command = match[1].trim();

        // Validate the command (implement validation as needed)
        if (this.isCommandAllowed(command)) {
          // Execute the command in the WebContainer
          const commandOutput = await this.executeCommandInWebContainer(
            command
          );
          commandCount++;

          // Update the messages with the command output and ask for explanation
          // const updatedMessages = [
          //   ...messages,
          //   { role: "assistant", content: finalAssistantResponse },
          //   { role: "system", content: SYSTEM_EXPLAIN_PROMPT },
          //   {
          //     role: "user",
          //     content: `Command output:\n${commandOutput}\nCommand run:\n${command}`,
          //   },
          // ];
          // const assistantPrompt = finalAssistantResponse ;
          const newPrompt = `Command output:\n${commandOutput}\nCommand run:\n${command}`;
          const updatedMessages = this.prepareMessages(newPrompt).messages;

          // Get an updated response from the model based on the command output

          finalAssistantResponse = await this.sendChatRequest(updatedMessages);
          renderAiOutput(finalAssistantResponse);
        } else {
          console.log("Disallowed command:", command);
          // Handle disallowed commands
          finalAssistantResponse =
            "I'm sorry, but I'm not permitted to execute that command.";
          renderAiOutput(finalAssistantResponse);
          break;
        }
      }
      commandMatches = [
        ...finalAssistantResponse.matchAll(/\[\[execute: (.+?)\]\]/g),
      ];
    }

    // Store user message and final assistant response in chat context
    this.chatContext.push({
      role: "assistant",
      content: finalAssistantResponse,
    });

    return finalAssistantResponse;
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
    this.truncateChatContext();
    const messages = [
      {
        role: "system",
        content: SYSTEM_CONFIG_MESSAGE,
      },
      ...this.chatContext,
    ];

    return { messages, userMessage };
  }

  truncateChatContext(): void {
    const MAX_MESSAGES = 10;
    if (this.chatContext.length > MAX_MESSAGES) {
      this.chatContext = this.chatContext.slice(-MAX_MESSAGES);
    }
  }

  // Add this new method to your ModelService class
  public async getGameState(): Promise<string | undefined> {
    const command = `node -e "fetch('http://localhost:3111/state').then(res => res.json()).then(data => console.log(JSON.stringify(data)))"`;
    const commandOutput = (await this.executeCommandInWebContainer(
      command
    )) as string;
    return commandOutput;
  }

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
        const chatResponse = await ollamaClient.chat(MODEL, messages, {});
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

  isCommandAllowed(command: string) {
    return true; // Allow all commands for now in the WebContainer @todo: Implement command validation!
    const allowedCommands = [
      /^node -e "fetch\('http:\/\/localhost:3111\/state'\).+/,
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
  return str.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "");
}

export const modelService = new ModelService();
