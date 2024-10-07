// render.ts - Responsible for rendering the HTML layout
export function renderApp() {
    document.querySelector("#app")!.innerHTML = `
    <h2>AI Companion</h2>
    <div class="container">
      <div class="input">
        <label class="input-label">Input:
          <textarea id="inputText"></textarea>
        </label>
      </div>
      <label class="output-label">AI Companion Output:
        <div class="output"></div>
      </label>
    </div>
    <h2>Canvas</h2>
    <div class="container">
    <div class="editor">
        <textarea id="editorInput">I am a textarea</textarea>
    </div>
        <div class="preview">
            <iframe></iframe>
        </div>
    </div>
    <div class="terminal"></div>
    `;
  }
