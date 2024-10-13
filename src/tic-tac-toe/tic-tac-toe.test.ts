// Import necessary libraries for testing
import { describe, it, beforeEach, expect, vi } from "vitest";
import { TicTacToeService } from "./tic-tac-toe.service";

// Create an instance of TicTacToeService
let ticTacToeService: TicTacToeService;

// Setup before each test
beforeEach(() => {
  ticTacToeService = new TicTacToeService();
});

// Test extractCommands method
describe("TicTacToeService.extractCommands", () => {
  it("should extract commands from response correctly", () => {
    const response =
      "Here is a command [[execute: ls -al]] and another [[execute: node -v]]";
    const commands = ticTacToeService.extractCommands(response);
    expect(commands).toEqual(["ls -al", "node -v"]);
  });

  it("should return an empty array when no commands are found", () => {
    const response = "No commands here!";
    const commands = ticTacToeService.extractCommands(response);
    expect(commands).toEqual([]);
  });
});

// Test processCommand method
describe("TicTacToeService.processCommand", () => {
  it("should handle a successful command execution without error", async () => {
    vi.spyOn(
      ticTacToeService,
      "executeCommandInWebContainer"
    ).mockResolvedValue("Command executed successfully");
    vi.spyOn(ticTacToeService, "sendChatRequest").mockResolvedValue(
      "No more commands to execute"
    );

    const command = "echo Hello";
    const currentResponse = "Initial response";
    const updatedResponse = await ticTacToeService.processCommand(
      command,
      currentResponse
    );

    expect(updatedResponse).toEqual(
      `${currentResponse}\nCommand executed successfully`
    );
  });

  // Test processCommand FAIL method
  it("should handle an unsuccessful command execution and eventually stop retrying", async () => {
    // Mock executeCommandInWebContainer to always return an error
    vi.spyOn(
      ticTacToeService,
      "executeCommandInWebContainer"
    ).mockResolvedValue("error: Something went wrong");

    // Mock sendChatRequest to simulate a retry limit, after which no new command is provided
    let retryCount = 0;
    vi.spyOn(ticTacToeService, "sendChatRequest").mockImplementation(
      async (messages) => {
        retryCount++;
        return retryCount > 2
          ? "No new command provided."
          : "[[execute: retry]]";
      }
    );

    const command = "echo Hello";
    const currentResponse = "Initial response";
    const updatedResponse = await ticTacToeService.processCommand(
      command,
      currentResponse
    );

    // Log the updated response for debugging
    console.log("updatedResponse", updatedResponse);

    // Expect that the final updated response includes the error messages and the fact that no new command was provided
    expect(updatedResponse).toContain("error: Something went wrong");
    expect(updatedResponse).toContain("No new command provided.");
    expect(updatedResponse.match(/error: Something went wrong/g)?.length).toBe(
      3
    ); // Ensure the error appears 3 times
  });
});
