// base.service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BaseService } from "./base.service";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";
import { renderAiOutput } from "../render";

// Mock the dependencies
vi.mock("@xterm/xterm", () => {
  return {
    Terminal: class {
      write(data: string) {
        // Mock implementation
      }
    },
  };
});

vi.mock("@webcontainer/api", () => {
  return {
    WebContainer: class {
      async spawn(cmd: string, args: string[]) {
        return {
          output: {
            pipeTo: vi.fn(),
          },
          exit: Promise.resolve(0),
        };
      }

      fs = {
        writeFile: vi.fn().mockResolvedValue(undefined),
      };
    },
  };
});

vi.mock("../model/ollama/ollama.client", () => {
  return {
    ollamaClient: {
      chat: vi.fn().mockResolvedValue({
        message: { content: "Mocked Ollama response." },
      }),
    },
  };
});

vi.mock("../model/bedrock/bedrock.service", () => {
  return {
    bedrockClient: {
      chat: vi.fn().mockResolvedValue("Mocked Bedrock response."),
    },
  };
});

vi.mock("../render", () => {
  return {
    renderAiOutput: vi.fn(),
  };
});

// Create a concrete subclass of BaseService for testing
class TestService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = "System configuration message for testing.";

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    const commands = await this.extractCommands(assistantResponse);
    if (commands.length === 0) {
      return currentResponse;
    }

    let updatedResponse = currentResponse;

    for (const command of commands) {
      try {
        const output = await this.executeCommandInWebContainer(command);
        updatedResponse += `\n${output}`;
      } catch (error: any) {
        updatedResponse += `\nError executing command: ${error.message}`;
      }
    }

    return updatedResponse;
  }
}

describe("BaseService", () => {
  let service: TestService;
  let terminal: Terminal;
  let webcontainer: WebContainer;

  beforeEach(() => {
    terminal = new Terminal();
    webcontainer = new WebContainer();
    service = new TestService();
    service.terminal = terminal;
    service.webcontainer = webcontainer;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Add tests for extractCommands method
  describe("BaseService.extractCommands", () => {
    it("should extract commands from structured response correctly", async () => {
      const response = JSON.stringify({
        assistantResponse: "Here are the commands.",
        commands: [
          { command: "ls", args: ["-al"], content: "" },
          { command: "node", args: ["-v"], content: "" },
        ],
      });
      const commands = await service.extractCommands(response);
      expect(commands).toEqual([
        { command: "ls", args: ["-al"], content: "" },
        { command: "node", args: ["-v"], content: "" },
      ]);
    });

    it("should extract update_file command with content from structured response correctly", async () => {
      const response = JSON.stringify({
        assistantResponse: "Here is the update command.",
        commands: [
          {
            command: "update_file",
            args: ["/public/index.html"],
            content: "<html><body>Hello World</body></html>",
          },
        ],
      });
      const commands = await service.extractCommands(response);
      expect(commands).toEqual([
        {
          command: "update_file",
          args: ["/public/index.html"],
          content: "<html><body>Hello World</body></html>",
        },
      ]);

      // Execute the command to trigger the writeFile mock
      for (const command of commands) {
        await service.executeCommandInWebContainer(command);
      }

      expect(webcontainer.fs.writeFile).toHaveBeenCalledTimes(1);
      expect(webcontainer.fs.writeFile).toHaveBeenCalledWith(
        "/public/index.html",
        "<html><body>Hello World</body></html>"
      );
    });

    it("should return an empty array when no commands are found in structured response", async () => {
      const response = JSON.stringify({
        assistantResponse: "No commands here!",
        commands: [],
      });
      const commands = await service.extractCommands(response);
      expect(commands).toEqual([]);
    });
  });

  // Add tests for processCommand method
  describe("BaseService.processCommand", () => {
    it("should execute node command to calculate the square root of a number", async () => {
      const response = JSON.stringify({
        assistantResponse: "Here is the command to calculate the square root.",
        commands: [
          {
            command: "node",
            args: ["-e"],
            content: "console.log(Math.sqrt(16))",
          },
        ],
      });
      const commands = await service.extractCommands(response);
      expect(commands).toEqual([
        {
          command: "node",
          args: ["-e"],
          content: "console.log(Math.sqrt(16))",
        },
      ]);

      // Mock spawn to simulate command execution
      webcontainer.spawn = vi.fn().mockResolvedValue({
        output: {
          pipeTo: vi.fn().mockImplementation((writableStream) => {
            writableStream.getWriter().write("4\n");
          }),
        },
        exit: Promise.resolve(0),
      });

      const output = await service.executeCommandInWebContainer(commands[0]);
      expect(output).toBe("4");
    });
  });
});
