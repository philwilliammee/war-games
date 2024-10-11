// render.ts - Responsible for rendering the HTML layout and elements
import { modelService } from "./model/model.service";
import * as showdown from "showdown";

const converter = new showdown.Converter();

interface Elements {
  textarea: HTMLTextAreaElement;
  iframe: HTMLIFrameElement;
  terminalEl: HTMLElement;
  inputEl: HTMLTextAreaElement;
  outputEl: HTMLElement;
  sendButton: HTMLButtonElement;
}

export function renderApp() {
  document.querySelector("#app")!.innerHTML = `
    <div class="main-container">
      <div class="left-column">
        <div class="chat-container">
          <div class="ai-output"></div>
          <div class="user-input">
            <textarea id="inputText" placeholder="Type your message here..."></textarea>
            <button id="sendButton">Send</button>
          </div>
        </div>
      </div>
      <div class="right-column">
        <div class="mode-toggle">
          <button id="editButton" >Edit</button>
          <button id="previewButton" class="active">Preview</button>
        </div>
        <div class="editor-container">
          <div class="editor" style="display: none;">
            <textarea id="editorInput"></textarea>
          </div>
          <div class="preview" style="margin: auto; text-align: center;">
            <h2>Welcome to War Games!</h2>
            <p>To get started, run the following command in the terminal: <pre>npm i && npm start</pre></p>
            <iframe></iframe>
          </div>
        </div>
        <div class="terminal"></div>
      </div>
    </div>
  `;

  setupModeToggle();
  setupChatHandlers();
}

export function getElements(): Elements {
  return {
    textarea: document.querySelector("#editorInput") as HTMLTextAreaElement,
    iframe: document.querySelector("iframe") as HTMLIFrameElement,
    terminalEl: document.querySelector(".terminal") as HTMLElement,
    inputEl: document.querySelector("#inputText") as HTMLTextAreaElement,
    outputEl: document.querySelector(".ai-output") as HTMLElement,
    sendButton: document.querySelector("#sendButton") as HTMLButtonElement,
  };
}

export function renderEditor(content: string) {
  const editorInput = document.querySelector(
    "#editorInput"
  ) as HTMLTextAreaElement;
  if (editorInput) {
    editorInput.value = content;
  }
}

export function renderTerminal(content: string) {
  const terminalEl = document.querySelector(".terminal") as HTMLElement;
  if (terminalEl) {
    terminalEl.innerHTML = content;
  }
}

export function renderAiOutput(content: string) {
  const outputEl = document.querySelector(".ai-output") as HTMLElement;
  if (outputEl) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai-message";
    messageDiv.innerHTML = converter.makeHtml(content);
    outputEl.appendChild(messageDiv);
    outputEl.scrollTop = outputEl.scrollHeight;
  }
}

function setupModeToggle() {
  const editButton = document.getElementById("editButton");
  const previewButton = document.getElementById("previewButton");
  const editorContainer = document.querySelector(".editor");
  const previewContainer = document.querySelector(".preview");

  editButton?.addEventListener("click", () => {
    editButton.classList.add("active");
    previewButton?.classList.remove("active");
    editorContainer?.setAttribute("style", "display: block;");
    previewContainer?.setAttribute("style", "display: none;");
  });

  previewButton?.addEventListener("click", () => {
    previewButton.classList.add("active");
    editButton?.classList.remove("active");
    previewContainer?.setAttribute("style", "display: block;");
    editorContainer?.setAttribute("style", "display: none;");
  });
}

function setupChatHandlers() {
  const elements = getElements();

  async function handleChatInput() {
    const input = elements.inputEl.value.trim();
    if (input) {
      elements.inputEl.value = "";
      appendUserMessage(input);
      try {
        await modelService.handleChat(input);
      } catch (error) {
        console.error("Error handling chat:", error);
        renderAiOutput("An error occurred while processing your request.");
      }
    }
  }

  function appendUserMessage(message: string) {
    const outputEl = document.querySelector(".ai-output") as HTMLElement;
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user-message";
    messageDiv.innerHTML = `
      <div class="avatar">👤</div>
      <div class="content">${converter.makeHtml(message)}</div>
    `;
    outputEl.appendChild(messageDiv);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  elements.inputEl.addEventListener("keyup", async (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleChatInput();
    }
  });

  elements.sendButton.addEventListener("click", async () => {
    await handleChatInput();
  });
}
