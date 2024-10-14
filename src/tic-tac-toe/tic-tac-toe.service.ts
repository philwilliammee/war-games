import { ollamaClient } from "../model/ollama/ollama.client";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";
import { Message, Options } from "ollama";
import { bedrockClient } from "../model/bedrock/bedrock.service";
import { renderAiOutput } from "../render";
import { SYSTEM_CONFIG_MESSAGE } from "./tic-tac-toe.bot";
import { ticTacToeModelPredict } from "./tfjs_model/loadmodel";

const PLATFORM = import.meta.env.VITE_PLATFORM;
const MODEL = import.meta.env.VITE_MODEL;

export class TicTacToeService {
  chatContext: Message[] = [];
  terminal: Terminal | null = null;
  webcontainer: WebContainer | null = null;

  async initializeChatContext(
    terminal: Terminal,
    webcontainer: WebContainer
  ): Promise<void> {
    this.chatContext = [
      {
        role: "assistant",
        content: "HOW ARE YOU FEELING TODAY?", // the first message that Joshua says in the movie.
      },
    ].flat();
    this.terminal = terminal;
    this.webcontainer = webcontainer;
    renderAiOutput("HOW ARE YOU FEELING TODAY?");
  }

  async handleChat(prompt: string): Promise<string> {
    const gameStateString = await this.getGameState();
    const promptPlusGameState = `The Current Game State is:\n${gameStateString}\n\n${prompt}`;
    const { messages } = this.prepareMessages(promptPlusGameState);
    const assistantResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantResponse);
    let finalAssistantResponse = assistantResponse;

    const commandMatches = this.extractCommands(assistantResponse);
    let commandCount = 0;

    for (const match of commandMatches) {
      if (commandCount >= 3) break;
      const command = match.trim();
      finalAssistantResponse = await this.processCommand(
        command,
        finalAssistantResponse
      );
      commandCount++;
    }

    return finalAssistantResponse;
  }

  extractCommands(response: string): string[] {
    return [...response.matchAll(/\[\[execute: (.+?)\]\]/g)].map(
      (match) => match[1]
    );
  }

  async processCommand(
    command: string,
    currentResponse: string
  ): Promise<string> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      const commandOutput = await this.executeCommandInWebContainer(command);
      currentResponse += `\n${commandOutput}`;

      const isError = /error:/i.test(commandOutput);
      if (!isError) {
        // Successful command execution; exit and return the response
        return currentResponse;
      }

      // Prepare the prompt for chat request to determine the next action
      const errorPrompt = `Command output:\n${commandOutput}\nCommand run:\n${command}`;
      const newMessages = this.prepareMessages(errorPrompt).messages;
      console.log("newMessages:", newMessages);

      const assistantResponse = await this.sendChatRequest(newMessages);
      renderAiOutput(assistantResponse); // Consider removing or handling this externally to keep concerns separated
      currentResponse += `\n${assistantResponse}`;

      const newCommandMatch = assistantResponse.match(/\[\[execute: (.+?)\]\]/);
      if (newCommandMatch) {
        // Update the command for the next iteration if a new command is suggested
        command = newCommandMatch[1].trim();
      } else {
        // No new command provided by the assistant, stop retries
        console.log("No new command provided by the assistant.");
        break;
      }

      retryCount++;
    }

    return currentResponse;
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

  public async getGameState(): Promise<string> {
    // bye bye pretty formatting it was making a javascript object string. we want json double quotes.
    // const command = `node -e "
    //   const util = require('util');
    //   fetch('http://localhost:3111/state')
    //     .then(res => res.json())
    //     .then(data => console.log(util.inspect(data, { depth: null })))
    // "`;
    const command = `node -e "
    fetch('http://localhost:3111/state')
      .then(res => res.json())
      .then(data => console.log(JSON.stringify(data)))
  "`;

    let gameStateData = await this.executeCommandInWebContainer(command);

    try {
      // If gameStateData is a string, parse it
      const gameState: GameState = JSON.parse(gameStateData.trim());
      if (gameState && gameState.board) {
        const predictedMove = await this.getModelPrediction(gameState.board); // Ensure the board exists
        gameStateData += `\n\nPredicted move: ${predictedMove}`;
      } else {
        console.log("Game state or board is undefined");
      }
    } catch (error) {
      console.log("Error parsing game state:", error);
    }

    console.log("Command output:", gameStateData);
    return gameStateData.trim();
  }

  private async getModelPrediction(
    ticTacToeBoard: ("X" | "O" | " " | "")[]
  ): Promise<number> {
    console.log("TicTacToe board input:", ticTacToeBoard); // Log the board input
    if (!ticTacToeBoard || !Array.isArray(ticTacToeBoard)) {
      throw new Error("Invalid tic-tac-toe board input");
    }

    const modelInput = this.mapBoardToModelInput(ticTacToeBoard);
    const predictedMove: number = await ticTacToeModelPredict(modelInput);
    return predictedMove;
  }

  private mapBoardToModelInput(board: ("X" | "O" | " " | "")[]): number[] {
    if (!board || !Array.isArray(board)) {
      throw new Error(
        "Invalid board input: Board is either undefined or not an array"
      );
    }

    const boardMap: { [key in "X" | "O" | " " | ""]: number } = {
      X: 1,
      O: -1,
      " ": 0,
      "": 0,
    };

    return board.map((cell) => boardMap[cell]);
  }

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

  isCommandAllowed(command: string): boolean {
    const allowedPatterns = [
      /^node\s+/i, // Matches any command that starts with 'node' (case insensitive)
      /.+/, // Matches anything else (i.e., bash commands)
    ];

    return allowedPatterns.some((pattern) => pattern.test(command.trim()));
  }

  async executeCommandInWebContainer(command: string) {
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
          // Use stripAnsiCodes here to remove the escape codes
          const cleanData = stripAnsiCodes(data);
          terminal!.write(cleanData);
          output += cleanData;
        },
      })
    );

    await process.exit;

    console.log("Final cleaned output:", output); // Check the cleaned output
    return output.trim();
  }
}

// Function to strip ANSI escape codes
function stripAnsiCodes(str: string) {
  return str.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "");
}

export const modelService = new TicTacToeService();

interface GameState {
  board: ("X" | "O" | " " | "")[];
  currentPlayer: string;
  gameOver: boolean;
  availableMoves: number[];
}
