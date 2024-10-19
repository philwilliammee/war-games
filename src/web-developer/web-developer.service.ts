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
    const commandMatches = this.extractCommands(assistantResponse);
    let commandCount = 0;
    const maxCommands = 3;

    for (const match of commandMatches) {
      if (commandCount >= maxCommands) break;
      console.log("Match:", match);
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
        const newCommandMatches = this.extractCommands(assistantRetryResponse);
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
}

export const webDeveloperService = new WebDeveloperService();
