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
    const commands = this.extractCommands(assistantResponse);
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

  // Existing tests...

  // Add tests for extractCommands method
  describe("BaseService.extractCommands", () => {
    it("should extract commands from response correctly", () => {
      const response =
        "Here is a command [[execute: ls -al]] and another [[execute: node -v]]";
      const commands = service.extractCommands(response);
      expect(commands).toEqual(["ls -al", "node -v"]);
    });

    it("should extract commands and markdown from response correctly", async () => {
      const response =
        "Here is a command [[execute: update_file /public/index.html]]\n```markdown\n<html><body>Hello World</body></html>\n```";
      const commands = service.extractCommands(response);
      expect(commands).toEqual(["update_file /public/index.html"]);
      expect(webcontainer.fs.writeFile).toHaveBeenCalledTimes(1);
      expect(webcontainer.fs.writeFile).toHaveBeenCalledWith(
        "/public/index.html",
        "<html><body>Hello World</body></html>"
      );
    });

    it("should return an empty array when no commands are found", () => {
      const response = "No commands here!";
      const commands = service.extractCommands(response);
      expect(commands).toEqual([]);
    });
  });

  // Add tests for processCommand method
  // this is abstract
});
