import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { Message } from "ollama";
import {
  MODEL_IDS,
  MistralRequestBody,
  ClaudeRequestBody,
  LlamaRequestBody,
  ClaudeResponse,
  LlamaResponse,
} from "./BedrockTypes";
// const PLATFORM = import.meta.env.VITE_PLATFORM;
const MODEL = import.meta.env.VITE_MODEL;
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const AWS_REGION = import.meta.env.VITE_AWS_REGION;
const AWS_SESSION_TOKEN = import.meta.env.VITE_AWS_SESSION_TOKEN;

export interface BedrockOptions {
  temperature: number;
}

export class BedrockClient {
  private bedrockClient: BedrockRuntimeClient;
  private decoder: TextDecoder;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || "",
        secretAccessKey: AWS_SECRET_ACCESS_KEY || "",
        sessionToken: AWS_SESSION_TOKEN || "",
      },
    });
    this.decoder = new TextDecoder();
  }

  // Unified chat method that accepts model ID, messages, and options
  public async chat(
    prompt: Message[],
    options: BedrockOptions
  ): Promise<string> {
    try {
      let requestBody:
        | MistralRequestBody
        | ClaudeRequestBody
        | LlamaRequestBody;
      let body: string;

      // filter the system message from the prompt
      const systemPrompt = prompt
        .filter((msg) => msg.role === "system")
        .map((msg) => msg.content)
        .join("");

      const userPrompt = prompt
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => msg.content)
        .join("");

      let model = MODEL;

      // @todo this can be improved.
      switch (model) {
        case MODEL_IDS.CLAUDE:
          requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 100000, // the output is truncated causing parse errors because of the token limit.
            system: systemPrompt,
            temperature: options.temperature,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: userPrompt,
                  },
                ],
              },
            ],
          };
          body = JSON.stringify(requestBody);
          break;

        case MODEL_IDS.LLAMA:
          requestBody = {
            prompt: userPrompt,
            max_gen_len: 512,
            temperature: options.temperature,
            top_p: 0.9,
          };
          body = JSON.stringify(requestBody);
          break;

        default:
          // throw new Error("Unsupported model ID");
          // fallback to claude model
          model = MODEL_IDS.CLAUDE;
          requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            system: systemPrompt,
            temperature: options.temperature,
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: userPrompt }],
              },
            ],
          };
          body = JSON.stringify(requestBody);
          break;
      }

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body,
      });

      const response: InvokeModelCommandOutput = await this.bedrockClient.send(
        command
      );
      const responseData = this.decoder.decode(response.body);

      // Parse and return response based on the model
      switch (model) {
        case MODEL_IDS.CLAUDE:
          // eslint-disable-next-line no-case-declarations
          const claudeResponse: ClaudeResponse = JSON.parse(responseData);
          return claudeResponse.content[0].text;

        case MODEL_IDS.LLAMA:
          // eslint-disable-next-line no-case-declarations
          const llamaResponse: LlamaResponse = JSON.parse(responseData);
          return llamaResponse.generation;

        default:
          throw new Error("Unexpected model response format");
      }
    } catch (error) {
      console.error("Error in BedrockClient:", error);
      throw new Error(
        "An error occurred while communicating with the Bedrock API."
      );
    }
  }
}

// Export a single instance of the BedrockClient
export const bedrockClient = new BedrockClient();
