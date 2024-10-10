// @todo setup env variables
export const MODEL_IDS = {
  CLAUDE: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  // LLAMA: 'meta.llama2-13b-chat-v1',
  LLAMA: "meta.llama3-70b-instruct-v1:0",
};

export interface MistralResponse {
  outputs: {
    text: string;
    stop_reason: string;
  }[];
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string;
  stop_sequence: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LlamaResponse {
  generation: string;
  prompt_token_count: number;
  generation_token_count: number;
  stop_reason: string;
}

export interface MistralRequestBody {
  prompt: string;
  max_tokens: number;
  top_k: number;
  top_p: number;
  temperature: number;
}

// export interface ClaudeRequestBody {
//   anthropic_version: string;
//   max_tokens: number;
//   system?: string;
//   messages: {
//     role: string;
//     content: {
//       type: string;
//       text: string;
//     }[];
//   }[];
// }

// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
export interface ClaudeRequestBody {
  anthropic_version: string;
  max_tokens: number;
  system?: string; // this looks important
  // A system prompt is a way of providing context and instructions to Anthropic Claude, such as specifying a particular goal or role. For more information, see How to use system prompts in the Anthropic documentation.
  messages: Message[];
  temperature?: number; // The amount of randomness injected into the response.
  top_p?: number; // In nucleus sampling, Anthropic Claude computes the cumulative distribution over all the options for each subsequent token in decreasing probability order and cuts it off once it reaches a particular probability specified by top_p. You should alter either temperature or top_p, but not both.
  top_k?: number; // Use top_k to remove long tail low probability responses.
  stop_sequences?: string[];
  // (Optional) Custom text sequences that cause the model to stop generating. Anthropic Claude models normally stop when they have naturally completed their turn, in this case the value of the stop_reason response field is end_turn. If you want the model to stop generating when it encounters custom strings of text, you can use the stop_sequences parameter. If the model encounters one of the custom text strings, the value of the stop_reason response field is stop_sequence and the value of stop_sequence contains the matched stop sequence.

  // The maximum number of entries is 8191.
}

interface Message {
  role: string;
  content: Content[];
}

type Content = ImageContent | TextContent;

interface ImageContent {
  type: "image";
  source: ImageSource;
}

interface ImageSource {
  type: "base64";
  media_type: "image/jpeg";
  data: string; // This could be a base64 encoded string of the image content
}

interface TextContent {
  type: "text";
  text: string;
}

export interface LlamaRequestBody {
  prompt: string;
  max_gen_len: number;
  temperature: number;
  top_p: number;
}
