// render.ts - Responsible for rendering the HTML layout and elements
import { BaseService } from "./base/base.service";
import "./style.css";
import { WebContainer } from "@webcontainer/api";

// const converter = new showdown.Converter();

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
  refreshButton: HTMLButtonElement;
}

export function renderApp(modelService: BaseService) {
  document.querySelector("#app")!.innerHTML = `
    <div class="main-container">
      <div class="left-column">
        <div class="chat-container">
          <div class="ai-output"></div>
          <div class="loading-indicator" >
            <div class="loading-ellipses">
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
          <div class="user-input">
            <textarea id="inputText" placeholder="Type your message here..."></textarea>
            <div class="input-actions">
              <input type="file" id="fileUpload" style="display: none;">
              <button id="fileUploadButton">📎</button>
              <button id="sendButton">Send</button>
            </div>
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
          <div class="file-explorer-container">
            <div class="file-explorer-header">
              <h3>File Explorer</h3>
              <button id="refreshButton" title="Refresh Files">🔄</button>
            </div>
            <div class="file-explorer"></div>
            </div>
            <textarea id="editorInput" spellcheck="false"></textarea>
          </div>
          <div class="preview">
            <div class="iframe-container">
              <iframe></iframe>
            </div>
          </div>
        </div>
        <div class="terminal"></div>
      </div>
    </div>
  `;

  setupModeToggle();
  setupChatHandlers(modelService);
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
    refreshButton: document.querySelector(
      "#refreshButton"
    ) as HTMLButtonElement,
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
  try {
    // why are we parsing this here. This should be done in the service, and passed as extracted command.
    const trimmedCommand = content
      .trim() // Remove leading and trailing whitespace.
      .replace(/^[^\{]*/, "") // Remove everything before the first '{'.
      .replace(/[^\}]*$/, ""); // Remove everything after the last '}'.

    const json = JSON.parse(trimmedCommand) as {
      assistantResponse: string;
      commands: any[];
    };
    content = json.assistantResponse;
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
  if (typeof document !== "undefined") {
    const outputEl = document.querySelector(".ai-output") as HTMLElement;
    if (outputEl) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "message ai-message";
      messageDiv.textContent = content; // converter.makeHtml(content);
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

function setupChatHandlers(modelService: BaseService) {
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
      <div class="content">${message}</div>
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

  // File upload handling
  elements.fileUploadButton.addEventListener("click", () => {
    elements.fileUploadInput.click();
  });

  elements.fileUploadInput.addEventListener("change", async (event) => {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        appendUserMessage(`Uploaded file: ${file.name}`);
        try {
          await modelService.handleChat(
            `I've uploaded a file named ${file.name}. Here's its content: ${content}`
          );
        } catch (error) {
          console.error("Error handling file upload:", error);
          renderAiOutput(
            "An error occurred while processing the uploaded file."
          );
        }
      };
      reader.readAsText(file);
    }
  });

  function showLoadingIndicator() {
    elements.loadingEl.style.display = "flex";
  }

  function hideLoadingIndicator() {
    elements.loadingEl.style.display = "none";
  }
}

export async function setupFileExplorer(webcontainer: WebContainer) {
  const fileExplorer = getElements().fileExplorer;
  const refreshButton = getElements().refreshButton;

  async function createFileExplorerHTML(dir: string): Promise<string> {
    try {
      const items = await webcontainer.fs.readdir(dir, { withFileTypes: true });
      let html = '<ul class="file-list">';
      for (const item of items) {
        const path = `${dir}/${item.name}`;
        const isDirectory = item.isDirectory();
        const icon = isDirectory ? "📁" : "📄";
        html += `<li class="file-item" data-path="${path}" data-type="${
          isDirectory ? "directory" : "file"
        }">${icon} ${item.name}`;
        if (isDirectory) {
          html += await createFileExplorerHTML(path);
        }
        html += "</li>";
      }
      html += "</ul>";
      return html;
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      return `<li class="error">Error reading ${dir}</li>`;
    }
  }

  async function refreshFileExplorer() {
    try {
      fileExplorer.innerHTML = await createFileExplorerHTML("/");
    } catch (error) {
      console.error("Error refreshing file explorer:", error);
      fileExplorer.innerHTML = "<p>Error refreshing file explorer</p>";
    }
  }

  await refreshFileExplorer();

  fileExplorer.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("file-item")) {
      const filePath = target.getAttribute("data-path") as string;
      const fileType = target.getAttribute("data-type");

      if (fileType === "file") {
        try {
          const file = await webcontainer.fs.readFile(filePath, "utf-8");
          const editorInput = document.querySelector(
            "#editorInput"
          ) as HTMLTextAreaElement;
          editorInput.value = file;

          // Add event listener for input changes
          editorInput.oninput = async () => {
            await webcontainer.fs.writeFile(filePath, editorInput.value);
          };
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      } else if (fileType === "directory") {
        // Toggle directory expansion
        const sublist = target.querySelector("ul");
        if (sublist) {
          sublist.style.display =
            sublist.style.display === "none" ? "block" : "none";
        }
      }
    }
  });

  refreshButton.addEventListener("click", refreshFileExplorer);
}
