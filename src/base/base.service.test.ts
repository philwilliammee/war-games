// base.service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BaseService } from "./base.service";
import { Terminal } from "@xterm/xterm";
import { WebContainer } from "@webcontainer/api";

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
        mkdir: vi.fn().mockResolvedValue(undefined),
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

  // Tests for extractStructuredResponse method
  describe("BaseService.extractStructuredResponse", () => {
    it("should extract structured response correctly", async () => {
      const response = JSON.stringify({
        assistantResponse: "Here are the commands.",
        commands: [
          { command: "ls", args: ["-al"], content: "" },
          { command: "node", args: ["-v"], content: "" },
        ],
      });
      const structuredResponse = await BaseService.extractStructuredResponse(
        response
      );
      expect(structuredResponse).toEqual({
        assistantResponse: "Here are the commands.",
        commands: [
          { command: "ls", args: ["-al"], content: "" },
          { command: "node", args: ["-v"], content: "" },
        ],
      });
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
      const structuredResponse = await BaseService.extractStructuredResponse(
        response
      );
      expect(structuredResponse).toEqual({
        assistantResponse: "Here is the update command.",
        commands: [
          {
            command: "update_file",
            args: ["/public/index.html"],
            content: "<html><body>Hello World</body></html>",
          },
        ],
      });

      // Execute the command to trigger the writeFile mock
      for (const command of structuredResponse.commands) {
        await service.executeCommandInWebContainer(command);
      }

      expect(webcontainer.fs.writeFile).toHaveBeenCalledTimes(1);
      expect(webcontainer.fs.writeFile).toHaveBeenCalledWith(
        "/public/index.html",
        "<html><body>Hello World</body></html>"
      );
    });

    it("should handle responses with extra text before and after JSON", async () => {
      const response = `
        Some text before the JSON.
        {
          "assistantResponse": "Here is the command.",
          "commands": [
            {
              "command": "echo",
              "args": ["Hello, World!"],
              "content": ""
            }
          ]
        }
        Some text after the JSON.
      `;
      const structuredResponse = await BaseService.extractStructuredResponse(
        response
      );
      expect(structuredResponse).toEqual({
        assistantResponse: "Here is the command.",
        commands: [
          {
            command: "echo",
            args: ["Hello, World!"],
            content: "",
          },
        ],
      });
    });

    it("should throw an error when no JSON object is found", async () => {
      const response = "No JSON here!";
      await expect(
        BaseService.extractStructuredResponse(response)
      ).rejects.toThrow("No JSON object found in assistant response");
    });
  });

  // Tests for processCommand method
  describe("BaseService.processCommand", () => {
    it("should process commands and update current response", async () => {
      const assistantResponse = JSON.stringify({
        assistantResponse: "Here is the command to calculate the square root.",
        commands: [
          {
            command: "node",
            args: ["-e"],
            content: "console.log(Math.sqrt(16))",
          },
        ],
      });

      // Mock spawn to simulate command execution
      webcontainer.spawn = vi.fn().mockResolvedValue({
        output: {
          pipeTo: vi.fn().mockImplementation((writableStream) => {
            writableStream.getWriter().write("4\n");
          }),
        },
        exit: Promise.resolve(0),
      });

      const currentResponse = "";
      const finalResponse = await service.processCommand(
        assistantResponse,
        currentResponse
      );

      expect(finalResponse).toContain(
        "Here is the command to calculate the square root."
      );
      expect(finalResponse).toContain("Command Output:\n4");
    });

    // it("should handle errors in command execution and request correction", async () => {
    //   const assistantResponse = JSON.stringify({
    //     assistantResponse: "Here is a faulty command.",
    //     commands: [
    //       {
    //         command: "node",
    //         args: ["-e"],
    //         content: "console.lo(Math.sqrt(16))", // Intentional typo 'console.lo'
    //       },
    //     ],
    //   });

    //   // Mock executeCommandInWebContainer to simulate command execution error
    //   vi.spyOn(service, "executeCommandInWebContainer").mockImplementation(
    //     async (command: ExtractedCommand) => {
    //       if (command.content.includes("console.lo")) {
    //         // Simulate error output
    //         return "ReferenceError: console.lo is not defined";
    //       } else {
    //         // Simulate correct output
    //         return "4";
    //       }
    //     }
    //   );

    //   // Mock sendChatRequest to simulate assistant's correction
    //   service.sendChatRequest = vi.fn().mockResolvedValue(
    //     JSON.stringify({
    //       assistantResponse: "Sorry about that. Here is the corrected command.",
    //       commands: [
    //         {
    //           command: "node",
    //           args: ["-e"],
    //           content: "console.log(Math.sqrt(16))",
    //         },
    //       ],
    //     })
    //   );

    //   const currentResponse = "";
    //   const finalResponse = await service.processCommand(
    //     assistantResponse,
    //     currentResponse
    //   );

    //   expect(finalResponse).toContain("Here is a faulty command.");
    //   expect(finalResponse).toContain(
    //     "Error executing command 'node': ReferenceError: console.lo is not defined"
    //   );
    //   expect(finalResponse).toContain(
    //     "Sorry about that. Here is the corrected command."
    //   );
    //   expect(finalResponse).toContain("Command Output:\n4");
    // });
  });
});
