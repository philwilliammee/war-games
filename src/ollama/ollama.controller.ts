import { Express, Request, Response } from "express";
import { asyncErrorHandler, uploadFileMiddleware } from "../../app.middleware";
import { ollamaService } from "./ollama.service";
import { getApiResponse } from "../../helpers/utils";

const MAX_NUMBER_OF_FILES = 10;

// interface Options {
//   temperature: number;
//   additionalInstructions?: string;
// }

/**
 * @type {Request} request
 * @type {Response} response
 * @returns {Promise<Response>}
 */
export async function apiChat(request, response) {
  try {
    const formData = request.body;
    let prompt = formData.prompt;
    const model = formData.model;
    let images;

    // Ensure options are valid JSON and parse them safely
    let options;
    try {
      options = formData.options ? JSON.parse(formData.options) : {};
    } catch (error) {
      throw new Error("Invalid options format");
    }

    // Validate and sanitize the prompt input
    const sanitizedPrompt = await validateAndSanitizeInput(prompt);

    // Generate response using Ollama service
    const responseHtml = await ollamaService.handleChat(sanitizedPrompt, model);

    // Send response
    const apiResponse = getApiResponse("ollama", 200, responseHtml);
    return response.json(apiResponse);
  } catch (error) {
    console.error("Error processing chat request:", error.message);
    return response.status(500).json({ error: "Internal server error" });
  }
}

/**
 * @type {string} prompt
 * @returns {Promise<string>}
 */
export async function validateAndSanitizeInput(input) {
  const sanitizedInput = input.trim().replace(/[^\x20-\x7E]/g, "");
  if (!sanitizedInput) {
    throw new Error("Invalid input");
  }
  return sanitizedInput;
}

// Define routes for Ollama integration
const ollamaRoutes = (app) => {
  app.post("/api/ollama", uploadFileMiddleware, asyncErrorHandler(apiChat));
};

// Export the routes for use in your application
export { ollamaRoutes };
