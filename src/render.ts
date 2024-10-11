// render.ts - Responsible for rendering the HTML layout and elements

interface Elements {
  textarea: HTMLTextAreaElement;
  iframe: HTMLIFrameElement;
  terminalEl: HTMLElement;
  inputEl: HTMLTextAreaElement;
  outputEl: HTMLElement;
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
          <button id="editButton" class="active">Edit</button>
          <button id="previewButton">Preview</button>
        </div>
        <div class="editor-container">
          <div class="editor">
            <textarea id="editorInput"></textarea>
          </div>
          <div class="preview" style="display: none;">
            <iframe></iframe>
          </div>
        </div>
        <div class="terminal"></div>
      </div>
    </div>
  `;

  setupModeToggle();
}

export function getElements(): Elements {
  return {
    textarea: document.querySelector("#editorInput") as HTMLTextAreaElement,
    iframe: document.querySelector("iframe") as HTMLIFrameElement,
    terminalEl: document.querySelector(".terminal") as HTMLElement,
    inputEl: document.querySelector("#inputText") as HTMLTextAreaElement,
    outputEl: document.querySelector(".ai-output") as HTMLElement,
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
    outputEl.innerHTML = content;
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
