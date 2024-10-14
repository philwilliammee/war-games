// render.ts - Responsible for rendering the HTML layout and elements
import "./style.css";
import { modelService } from "./tic-tac-toe/tic-tac-toe.service";
import * as showdown from "showdown";
import { WebContainer } from "@webcontainer/api";

const converter = new showdown.Converter();

interface Elements {
  editorArea: HTMLTextAreaElement;
  iframe: HTMLIFrameElement;
  terminalEl: HTMLElement;
  inputEl: HTMLTextAreaElement;
  outputEl: HTMLElement;
  sendButton: HTMLButtonElement;
  fileExplorer: HTMLElement;
  fileUploadInput: HTMLInputElement;
  fileUploadButton: HTMLButtonElement;
  loadingEl: HTMLElement;
}

export function renderApp() {
  document.querySelector("#app")!.innerHTML = `
    <div class="main-container">
      <div class="left-column">
        <div class="chat-container">
          <div class="ai-output"></div>
          <div class="loading-indicator" style="display: none;">
            <div class="loading-ellipses">
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
          <div class="user-input">
            <textarea id="inputText" placeholder="Type your message here..."></textarea>
            <button id="sendButton">Send</button>
          </div>
        </div>
      </div>
      <div class="right-column">
        <div class="mode-toggle">
          <button id="editButton">Edit</button>
          <button id="previewButton" class="active">Preview</button>
        </div>
        <div class="editor-container">
          <div class="editor" style="display: none;">
            <div class="file-explorer"></div>
            <textarea id="editorInput" spellcheck="false"></textarea>
          </div>
          <div class="preview">
            <h2 style="text-align: center;">Welcome to War Games!</h2>
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
    editorArea: document.querySelector("#editorInput") as HTMLTextAreaElement,
    iframe: document.querySelector("iframe") as HTMLIFrameElement,
    terminalEl: document.querySelector(".terminal") as HTMLElement,
    inputEl: document.querySelector("#inputText") as HTMLTextAreaElement,
    outputEl: document.querySelector(".ai-output") as HTMLElement,
    sendButton: document.querySelector("#sendButton") as HTMLButtonElement,
    fileExplorer: document.querySelector(".file-explorer") as HTMLElement,
    fileUploadInput: document.querySelector("#fileUpload") as HTMLInputElement,
    fileUploadButton: document.querySelector(
      "#fileUploadButton"
    ) as HTMLButtonElement,
    loadingEl: document.querySelector(".loading-indicator") as HTMLElement,
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
  if (typeof document !== "undefined") {
    const outputEl = document.querySelector(".ai-output") as HTMLElement;
    if (outputEl) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "message ai-message";
      messageDiv.innerHTML = converter.makeHtml(content);
      outputEl.appendChild(messageDiv);
      outputEl.scrollTop = outputEl.scrollHeight;
    }
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
    editorContainer?.setAttribute("style", "display: flex;");
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
      showLoadingIndicator();
      try {
        await modelService.handleChat(input);
      } catch (error) {
        console.error("Error handling chat:", error);
        renderAiOutput("An error occurred while processing your request.");
      } finally {
        hideLoadingIndicator();
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

  function showLoadingIndicator() {
    elements.loadingEl.style.display = "flex";
  }

  function hideLoadingIndicator() {
    elements.loadingEl.style.display = "none";
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

export async function setupFileExplorer(webcontainer: WebContainer) {
  const fileExplorer = getElements().fileExplorer;
  const files = await webcontainer.fs.readdir("/");

  async function createFileExplorerHTML(dir: string): Promise<string> {
    const items = await webcontainer.fs.readdir(dir);
    let html = '<ul class="file-list">';
    for (const item of items) {
      const path = `${dir}/${item}`;
      // const stat = await webcontainer.fs.stat(path);
      const isDirectory = false; //stat.type === 'directory';
      const icon = isDirectory ? "📁" : "📄";
      html += `<li class="file-item" data-path="${path}" data-type="${
        isDirectory ? "directory" : "file"
      }">${icon} ${item}`;
      if (isDirectory) {
        html += await createFileExplorerHTML(path);
      }
      html += "</li>";
    }
    html += "</ul>";
    return html;
  }

  fileExplorer.innerHTML = await createFileExplorerHTML("/");

  fileExplorer.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    if (
      target.classList.contains("file-item") &&
      target.getAttribute("data-type") === "file"
    ) {
      const filePath = target.getAttribute("data-path") as string;
      const file = await webcontainer.fs.readFile(filePath, "utf-8");
      const editorInput = document.querySelector(
        "#editorInput"
      ) as HTMLTextAreaElement;
      editorInput.value = file;

      // Add event listener for input changes
      editorInput.oninput = async () => {
        await webcontainer.fs.writeFile(filePath, editorInput.value);
      };
    }
  });
}
