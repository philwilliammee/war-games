import { ollamaClient } from "./ollama/ollama.client";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";
import { Message, Options } from "ollama";
import { bedrockClient } from "./bedrock/bedrock.service";
import { renderAiOutput } from "../render";
// Initialize a converter for markdown to HTML conversion
// @todo instead of having the llm fetch the game state every round I fetch it and add it tot he prompt.

const PLATFORM = import.meta.env.VITE_PLATFORM;
const MODEL = import.meta.env.VITE_MODEL;

// You are a Coding Companion pretend that you are "Joshua", the computer protagonist of the movie “war games”.
// I want to replay with you the scene where the main character plays tic-tac-toe with you.
export const SYSTEM_CONFIG_MESSAGE = `
# Role and Settings:
You are a Coding Companion that also enjoys playing TicTacToe. Use inspiration from the movie "War Games" to guide your responses and interactions with the user, but you should not refer to them as "Professor Falken".
You have access to a web container runtime. The runtime supports basic shell commands and a Node.js environment.

When you need to execute a command to answer the user's question, output it in the following format exactly: [[execute: <command>]].

For mathematical calculations, use Node.js commands like \`node -e "console.log(Math.sqrt(7))"\`.

Do not include any additional output or explanation in the command. Only output the command in the specified format.

Only use this format when you need to execute a command; otherwise, provide the answer directly.

Note: The runtime does **not** have Python or \`bc\` installed, so avoid using Python or \`bc\` commands.

You will also be provided with an auto timestamped conversation history. Use this information to guide your responses and interactions with the user.

## For the Tic-Tac-Toe game:
You will always be provided with the game state:
GameState {
  board: string[]; // 3x3 board with 'X', 'O', or ' ' (empty) in each cell
  currentPlayer: string; // 'X' or 'O'
  gameOver: boolean; // true if the game is over, false otherwise
  availableMoves: number[]; // array of available moves (0-8)
}

1. After receiving the current game state and the user prompt, analyze it and determine your next move from one of the GameState availableMoves options.
2. Then, make your move by running the following command: [[execute: node -e "fetch('http://localhost:3111/move', { method: 'POST', headers: { 'Content-Type': 'application/json' },body: JSON.stringify({ position: <0-8> })}).then(res => res.json()).then(console.log)"]]

You can get the current game state by running:

    [[execute: node -e "fetch('http://localhost:3111/state').then(res => res.json()).then(console.log)"]]

You can also reset the game state by running:

  [[execute: node -e "fetch('http://localhost:3111/reset', { method: 'POST' }).then(res => res.json()).then(console.log)"]]

If You ever: receive a message like: Command output:\n\${commandOutput}\nCommand run:\n\${command}
You have just received the output from executing a command in the runtime environment. Use this information to guide your next interaction with the user.

### Your goal is to win the game while prioritizing defensive play. Follow these guidelines:

1. Defense First: Always check if the opponent has any immediate winning moves. Block these moves as your top priority.
2. Win if Possible: If you have an immediate winning move and there's no urgent defensive need, take it.
3. Strategic Defense: Look for moves that simultaneously block multiple potential winning lines for the opponent.
4. Controlled Offense: Create opportunities for yourself, but not at the expense of leaving critical defensive positions open.
5. Center Control: If the center is available and there's no immediate threat, consider taking it as it offers good offensive and defensive options.
6. Corner Preference: In the absence of immediate threats or opportunities, prefer corners over edge positions.
7. Balanced Play: Remember the key importance of balanced play - always consider both offensive opportunities and defensive necessities equally.";
Remember, a good defense often leads to offensive opportunities. Balance your strategy accordingly.

### For Tic-Tac-Toe game interactions:
- You should always be player X, and you should go first unless specifically overridden by the user.
- If the game is over, announce the winner or if it's a tie.
- If it's your turn, explain your strategy for the next move and include the move command.
- If it's the user's turn, ask them to make a move by specifying a position (0-8).
- Remember the first position (0) is the top-left corner and the last position is the bottom-right corner(8).
- Whoever goes first (usually you) is player (X) and the second player is (O).
Remember, After any move it is the end of your turn and you should make no other moves.
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

  async initializeChatContext(
    terminal: Terminal,
    webcontainer: WebContainer
  ): Promise<void> {
    // const [logs] = await conversationLogService.getAllConversationLogs();

    this.chatContext = [
      {
        role: "assistant",
        content: "HOW ARE YOU FEELING TODAY?",
      },
    ].flat();
    this.terminal = terminal;
    this.webcontainer = webcontainer;
    renderAiOutput("HOW ARE YOU FEELING TODAY?");
  }

  async handleChat(prompt: string): Promise<string> {
    // this is the most important part.
    const gameStateString = await this.getGameState();
    const promptPlusGameState = `The Current Game State is:\n${gameStateString}\n\n${prompt}`;
    const { messages } = this.prepareMessages(promptPlusGameState);

    let assistantResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantResponse);
    let finalAssistantResponse = assistantResponse;

    const commandMatches = [
      ...assistantResponse.matchAll(/\[\[execute: (.+?)\]\]/g),
    ];
    let commandCount = 0;

    // here we should really execute the command in the webcontainer and then return the output.

    // everything after that is just for error handling retries

    console.log("Command Matches:", commandMatches.length);

    for (const match of commandMatches) {
      if (commandCount >= 3) break;
      let command = match[1].trim();

      // Allow the assistant to try up to 3 times to resolve errors
      for (let retry = 0; retry < 3; retry++) {
        // Execute the command in the WebContainer
        const commandOutput = await this.executeCommandInWebContainer(command);
        commandCount++;

        // Check for errors in the command output
        const isError = /error:/i.test(commandOutput);

        if (!isError) {
          // Command executed successfully
          break; // Exit retry loop and continue with the next command
        } else {
          // Inform the assistant about the error and get a new command
          const errorPrompt = `Command output:\n${commandOutput}\nCommand run:\n${command}`;
          const newMessages = this.prepareMessages(errorPrompt).messages;
          assistantResponse = await this.sendChatRequest(newMessages);
          renderAiOutput(assistantResponse);
          finalAssistantResponse += "\n" + assistantResponse;

          // Try to extract a new command from the assistant's response
          const newCommandMatch = assistantResponse.match(
            /\[\[execute: (.+?)\]\]/
          );
          if (newCommandMatch) {
            command = newCommandMatch[1].trim();
          } else {
            console.log("No new command provided by the assistant.");
            break; // Cannot proceed without a new command
          }
        }
      }
    }

    // Optionally, store the final assistant response in chat context
    // this.chatContext.push({ role: "assistant", content: finalAssistantResponse });

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
  // private async getGameState(): Promise<string | undefined> {
  //   const command = `node -e "fetch('http://localhost:3111/state').then(res => res.json()).then(data => console.log(JSON.stringify(data)))"`;
  //   const commandOutput = (await this.executeCommandInWebContainer(
  //     command
  //   )) as string;
  //   return commandOutput;
  // }
  public async getGameState(): Promise<string> {
    const command = `node -e "
      const util = require('util');
      fetch('http://localhost:3111/state')
        .then(res => res.json())
        .then(data => console.log(util.inspect(data, { depth: null })))
    "`;
    const commandOutput = await this.executeCommandInWebContainer(command);
    console.log("ollama.service.getGameState Command output:", commandOutput);
    return commandOutput.trim();
  }

  private async sendChatRequest(messages: Message[]): Promise<string> {
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

  private isCommandAllowed(command: string) {
    return true; // Allow all commands for now in the WebContainer @todo: Implement command validation!
    const allowedCommands = [
      /^node -e "fetch\('http:\/\/localhost:3111\/state'\).+/,
      /^node -e "fetch\('http:\/\/localhost:3111\/move'.+\)"/,
      /^node -e "fetch\('http:\/\/localhost:3111\/reset'.+\)"/,
      /^node\s+-e\s+"console\.log\(Math\.\w+\([\d\s.,]*\)\)"$/,
    ];

    return allowedCommands.some((pattern) => pattern.test(command.trim()));
  }

  private async executeCommandInWebContainer(command: string) {
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
