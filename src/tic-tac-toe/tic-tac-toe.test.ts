// tic-tac-toe.service.test.ts

import { describe, it, beforeEach, expect, vi, afterEach } from "vitest";
import { Board, TicTacToeService } from "./tic-tac-toe.service";

// Mock external dependencies
vi.mock("../render", () => ({
  renderAiOutput: vi.fn(),
}));

vi.mock("../base/base.service", () => {
  return {
    BaseService: class {
      prepareMessages = vi.fn((prompt: string) => ({
        messages: [],
        userMessage: { role: "user", content: prompt },
      }));
      sendChatRequest = vi.fn(async () => "Mocked assistant response");
      executeCommandInWebContainer = vi.fn(async () => "Mocked command output");
    },
  };
});

vi.mock("./tfjs_model/loadmodel", () => ({
  ticTacToeModelPredict: vi.fn(async () => 4),
}));

let ticTacToeService: TicTacToeService;

beforeEach(() => {
  ticTacToeService = new TicTacToeService();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TicTacToeService.mapBoardToModelInput", () => {
  it("should correctly map the board symbols to numerical values", () => {
    const board: Board = ["X", "O", " ", "", "X", "O", "X", " ", "O"];
    const expectedOutput = [1, -1, 0, 0, 1, -1, 1, 0, -1];
    const result = ticTacToeService["mapBoardToModelInput"](board);
    expect(result).toEqual(expectedOutput);
  });

  it("should throw an error if board is invalid", () => {
    expect(() => {
      ticTacToeService["mapBoardToModelInput"](null as any);
    }).toThrow(
      "Invalid board input: Board is either undefined or not an array"
    );
  });
});

describe("TicTacToeService.getModelPrediction", () => {
  it("should return a predicted move index", async () => {
    const board: Board = ["X", "O", " ", "", "X", "O", "X", " ", "O"];
    const prediction = await ticTacToeService["getModelPrediction"](board);
    expect(prediction).toBe(4);
  });

  it("should throw an error if board is invalid", async () => {
    await expect(
      ticTacToeService["getModelPrediction"](null as any)
    ).rejects.toThrow("Invalid tic-tac-toe board input");
  });
});

describe("TicTacToeService.getGameState", () => {
  beforeEach(() => {
    vi.spyOn(
      ticTacToeService,
      "executeCommandInWebContainer"
    ).mockImplementation(async (command: string) => {
      const gameState = {
        board: ["X", "O", " ", "", "X", "O", "X", " ", "O"],
        currentPlayer: "X",
        gameOver: false,
        availableMoves: [2, 3, 7],
      };
      return JSON.stringify(gameState);
    });
  });

  it("should fetch the game state and include model prediction", async () => {
    const getModelPredictionSpy = vi.spyOn(
      ticTacToeService as any,
      "getModelPrediction"
    );

    const gameStateString = await ticTacToeService.getGameState();
    expect(gameStateString).toContain(
      '"board":["X","O"," ","","X","O","X"," ","O"]'
    );
    expect(gameStateString).toContain("Predicted move: 4");
    expect(ticTacToeService.executeCommandInWebContainer).toHaveBeenCalled();
    expect(getModelPredictionSpy).toHaveBeenCalled();
  });
});

describe("TicTacToeService.handleChat", () => {
  it("should handle chat, include game state, and process assistant response", async () => {
    vi.spyOn(ticTacToeService, "getGameState").mockResolvedValue(
      "Game State String"
    );
    vi.spyOn(ticTacToeService, "prepareMessages").mockReturnValue({
      messages: [],
      userMessage: { role: "user", content: "Prompt with game state" },
    });
    vi.spyOn(ticTacToeService, "sendChatRequest").mockResolvedValue(
      "Assistant response"
    );
    vi.spyOn(ticTacToeService, "processCommand").mockResolvedValue(
      "Final assistant response"
    );

    const prompt = "User prompt";
    const result = await ticTacToeService.handleChat(prompt);

    expect(result).toBe("Final assistant response");
    expect(ticTacToeService.getGameState).toHaveBeenCalled();
    expect(ticTacToeService.prepareMessages).toHaveBeenCalledWith(
      "The Current Game State is:\nGame State String\n\nUser prompt"
    );
    expect(ticTacToeService.sendChatRequest).toHaveBeenCalled();
    expect(ticTacToeService.processCommand).toHaveBeenCalledWith(
      "Assistant response",
      "Assistant response"
    );
  });
});
