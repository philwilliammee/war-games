// tic-tac-toe.service.ts

import { BaseService } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./tic-tac-toe.bot";
import { renderAiOutput, renderEditor, setupFileExplorer } from "../render";
import { ticTacToeModelPredict } from "./tfjs_model/loadmodel";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { startShell, startDevServer } from "../main";
import { files } from "./tic-tac-toe.files";

export class TicTacToeService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  async boot(terminal: Terminal, webcontainer: WebContainer): Promise<void> {
    renderEditor(files["index.js"].file.contents);

    await webcontainer.mount(files);

    await setupFileExplorer(webcontainer);

    await startShell(webcontainer, terminal);

    startDevServer(webcontainer);

    await this.initializeChatContext(terminal, webcontainer);
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
    const command = {
      command: "node",
      args: ["-e"],
      content: `
      fetch('http://localhost:3111/state')
        .then(res => res.json())
        .then(data => console.log(JSON.stringify(data)))
    `,
    };

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

interface GameState {
  board: Board;
  currentPlayer: string;
  gameOver: boolean;
  availableMoves: number[];
}

export type Board = ("X" | "O" | " " | "")[];
