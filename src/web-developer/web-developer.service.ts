import { BaseService, ExtractedCommand } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./web-developer.bot";
import { renderAiOutput } from "../render";

export class WebDeveloperService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  // async processCommand(
  //   assistantResponse: string,
  //   currentResponse: string
  // ): Promise<string> {
  //   let commands: ExtractedCommand[] = [];

  //   try {
  //     // Attempt to extract commands
  //     commands = await this.extractCommands(assistantResponse);
  //   } catch (error: any) {
  //     console.error("Error extracting commands:", error);

  //     // Use handleCommandError to inform the AI and get potential corrections
  //     const errorPrompt = `An error occurred while extracting commands: ${error.message}. Response received: ${assistantResponse}`;
  //     const result = await this.handleCommandError(
  //       errorPrompt,
  //       { command: "", args: [], content: "" }, // Dummy command object as placeholder
  //       currentResponse
  //     );

  //     commands = result.newCommands || [];
  //     currentResponse = result.currentResponse;
  //   }

  //   let commandCount = 0;
  //   const maxCommands = 3;

  //   for (const command of commands) {
  //     if (commandCount >= maxCommands) break;
  //     console.log("Command:", command);
  //     let retryCount = 0;
  //     const maxRetries = 3;

  //     while (retryCount < maxRetries) {
  //       try {
  //         // Execute the command in the web container
  //         const commandOutput = await this.executeCommandInWebContainer(
  //           command
  //         );
  //         currentResponse += `\nCommand Output:\n${commandOutput}`;

  //         // Check if the command output contains an error
  //         const isError = /error:/i.test(commandOutput);
  //         if (!isError) {
  //           // Successful execution, exit the retry loop
  //           break;
  //         }

  //         // Handle the command error and prepare a new command
  //         let newCommands;
  //         ({ newCommands, currentResponse } = await this.handleCommandError(
  //           commandOutput,
  //           command,
  //           currentResponse
  //         ));

  //         // If new commands are provided, update the command details for retry
  //         if (newCommands && newCommands.length > 0) {
  //           const [newCommand] = newCommands;
  //           command.command = newCommand.command;
  //           command.args = newCommand.args;
  //           command.content = newCommand.content;
  //         } else {
  //           console.log("No new command provided by the assistant.");
  //           break;
  //         }
  //       } catch (error: any) {
  //         console.error("Error executing command:", error);
  //         currentResponse += `\nError executing command: ${error.message}`;
  //       }

  //       retryCount++;
  //     }

  //     if (retryCount === maxRetries) {
  //       console.log("Max retries reached for command:", command);
  //       break;
  //     }

  //     commandCount++;
  //   }

  //   return currentResponse;
  // }

  // private async handleCommandError(
  //   errorPrompt: string,
  //   command: ExtractedCommand,
  //   currentResponse: string
  // ) {
  //   const newMessages = this.prepareMessages(errorPrompt).messages;

  //   const assistantRetryResponse = await this.sendChatRequest(newMessages);
  //   renderAiOutput(assistantRetryResponse);
  //   currentResponse += `\n${assistantRetryResponse}`;

  //   // Extract new command from the assistant's response
  //   const newCommands = await this.extractCommands(assistantRetryResponse);
  //   return { newCommands, currentResponse };
  // }
}

export const webDeveloperService = new WebDeveloperService();
