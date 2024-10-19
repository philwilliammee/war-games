// tic-tac-toe.service.ts

import { BaseService } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./tic-tac-toe.bot";
import { renderAiOutput } from "../render";
import { ticTacToeModelPredict } from "./tfjs_model/loadmodel";

export class TicTacToeService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    // Extract multiple commands
    const commandMatches =
      assistantResponse.match(/\[\[execute: (.+?)\]\]/g) || [];
    let commandCount = 0;
    const maxCommands = 3;

    for (const match of commandMatches) {
      if (commandCount >= maxCommands) break;
      let command = match.replace("[[execute: ", "").replace("]]", "").trim();
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const commandOutput = await this.executeCommandInWebContainer(command);
        currentResponse += `\nCommand Output:\n${commandOutput}`;

        const isError = /error:/i.test(commandOutput);
        if (!isError) {
          // Successful execution
          break;
        }

        // Prepare error prompt
        const errorPrompt = `Command output:\n${commandOutput}\nCommand run:\n${command}`;
        const newMessages = this.prepareMessages(errorPrompt).messages;

        const assistantRetryResponse = await this.sendChatRequest(newMessages);
        renderAiOutput(assistantRetryResponse);
        currentResponse += `\n${assistantRetryResponse}`;

        // Extract new command from the assistant's response
        const newCommandMatches = assistantRetryResponse.match(
          /\[\[execute: (.+?)\]\]/g
        );
        if (newCommandMatches && newCommandMatches.length > 0) {
          command = newCommandMatches[0]
            .replace("[[execute: ", "")
            .replace("]]", "")
            .trim();
        } else {
          console.log("No new command provided by the assistant.");
          break;
        }

        retryCount++;
      }

      if (retryCount === maxRetries) {
        console.log("Max retries reached for command:", command);
        break;
      }

      commandCount++;
    }

    return currentResponse;
  }

  // Override handleChat to include game state
  async handleChat(prompt: string): Promise<string> {
    const gameStateString = await this.getGameState();
    const promptPlusGameState = `The Current Game State is:\n${gameStateString}\n\n${prompt}`;
    const { messages } = this.prepareMessages(promptPlusGameState);
    const assistantResponse = await this.sendChatRequest(messages);
    renderAiOutput(assistantResponse);

    let finalAssistantResponse = assistantResponse;

    finalAssistantResponse = await this.processCommand(
      assistantResponse,
      finalAssistantResponse
    );

    return finalAssistantResponse;
  }

  // Specific method to get game state
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
}

export const modelService = new TicTacToeService();

interface GameState {
  board: ("X" | "O" | " " | "")[];
  currentPlayer: string;
  gameOver: boolean;
  availableMoves: number[];
}
