// test.service.ts

import { BaseService } from "./base.service";

export class TestService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = "System configuration message for testing.";

  async processCommand(
    assistantResponse: string,
    currentResponse: string
  ): Promise<string> {
    // For testing, we'll return the response unmodified
    return currentResponse;
  }
}
