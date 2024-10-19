// web-developer.service.ts

import { BaseService } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./web-developer.bot";
import { renderAiOutput } from "../render";

export class WebDeveloperService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    const commands = await this.extractCommands(assistantResponse);
    let commandCount = 0;
    const maxCommands = 3;

    for (const command of commands) {
      if (commandCount >= maxCommands) break;
      console.log("Command:", command);
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const commandOutput = await this.executeCommandInWebContainer(
            command
          );
          currentResponse += `\nCommand Output:\n${commandOutput}`;

          const isError = /error:/i.test(commandOutput);
          if (!isError) {
            // Successful execution
            break;
          }

          // Prepare error prompt
          const errorPrompt = `Command output:\n${commandOutput}\nCommand run:\n${
            command.command
          } ${command.args.join(" ")}`;
          const newMessages = this.prepareMessages(errorPrompt).messages;

          const assistantRetryResponse = await this.sendChatRequest(
            newMessages
          );
          renderAiOutput(assistantRetryResponse);
          currentResponse += `\n${assistantRetryResponse}`;

          // Extract new command from the assistant's response
          const newCommands = await this.extractCommands(
            assistantRetryResponse
          );
          if (newCommands && newCommands.length > 0) {
            command.command = newCommands[0].command;
            command.args = newCommands[0].args;
            command.content = newCommands[0].content;
          } else {
            console.log("No new command provided by the assistant.");
            break;
          }
        } catch (error: any) {
          console.error("Error executing command:", error);
          currentResponse += `\nError executing command: ${error.message}`;
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
}

export const webDeveloperService = new WebDeveloperService();
