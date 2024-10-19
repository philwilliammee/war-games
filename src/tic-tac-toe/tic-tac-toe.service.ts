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
    const commands = this.extractCommands(assistantResponse);
    if (commands.length === 0) {
      return currentResponse;
    }

    let updatedResponse = currentResponse;

    for (let command of commands) {
      let retryCount = 0;
      const maxRetries = 3;
      let executionSuccess = false;

      while (retryCount < maxRetries && !executionSuccess) {
        const output = await this.executeCommandInWebContainer(command);
        updatedResponse += `\n${output}`;

        if (!/error:/i.test(output)) {
          executionSuccess = true;
        } else {
          // Prepare error prompt
          const errorPrompt = `Command output:\n${output}\nCommand run:\n${command}`;
          const newMessages = this.prepareMessages(errorPrompt).messages;

          const assistantRetryResponse = await this.sendChatRequest(
            newMessages
          );
          updatedResponse += `\n${assistantRetryResponse}`;

          // Extract new command from the assistant's response
          const newCommandMatches = this.extractCommands(
            assistantRetryResponse
          );
          if (newCommandMatches && newCommandMatches.length > 0) {
            command = newCommandMatches[0];
          } else {
            updatedResponse += "\nNo new command provided.";
            break;
          }

          retryCount++;
        }
      }
    }

    return updatedResponse;
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

  private async getModelPrediction(ticTacToeBoard: Board): Promise<number> {
    console.log("TicTacToe board input:", ticTacToeBoard); // Log the board input
    if (!ticTacToeBoard || !Array.isArray(ticTacToeBoard)) {
      throw new Error("Invalid tic-tac-toe board input");
    }

    const modelInput = this.mapBoardToModelInput(ticTacToeBoard);
    const predictedMove: number = await ticTacToeModelPredict(modelInput);
    return predictedMove;
  }

  private mapBoardToModelInput(board: Board): number[] {
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

export const ticTacToeService = new TicTacToeService();

interface GameState {
  board: Board;
  currentPlayer: string;
  gameOver: boolean;
  availableMoves: number[];
}

export type Board = ("X" | "O" | " " | "")[];
