import { WebContainer } from "@webcontainer/api";
import { files } from "./files";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";

export let webcontainerInstance;

/**
 * Initializes the WebContainer, terminal, and sets up listeners for input/output.
 */
export async function initializeWebContainer() {
  const fitAddon = new FitAddon();

  // Set up the HTML structure in the #app div
  document.querySelector("#app").innerHTML = `
    <div class="container">
      <div class="editor">
        <textarea>I am a textarea</textarea>
      </div>
      <div class="preview">
        <iframe src="loading.html"></iframe>
      </div>
    </div>
    <div class="input">
      <label class="input-label">Input:
        <textarea></textarea>
      </label>
    </div>
    <div class="output"></div>
    <div class="terminal"></div>
  `;

  const iframeEl = document.querySelector("iframe");
  const textareaEl = document.querySelector("textarea");
  const terminalEl = document.querySelector(".terminal");

  const terminal = new Terminal({
    convertEol: true,
  });

  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl);
  fitAddon.fit();

  // Initialize WebContainer
  webcontainerInstance = await WebContainer.boot();
  window.webcontainerInstance = webcontainerInstance;
  await webcontainerInstance.mount(files);

  textareaEl.value = files["index.js"].file.contents;

  textareaEl.addEventListener("input", (e) => {
    writeIndexJS(e.currentTarget.value);
  });

  // Optionally install dependencies and start the dev server
  // const exitCode = await installDependencies(terminal);
  // if (exitCode !== 0) {
  //   throw new Error("Installation failed");
  // }
  // startDevServer();

  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    iframeEl.src = url;
  });

  const shellProcess = await startShell(terminal);
  window.addEventListener("resize", () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

  return terminal;
}

/**
 * Writes content to index.js in the WebContainer filesystem.
 * @param {string} content
 */
async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}

/**
 * Installs dependencies in the WebContainer.
 * @param {Terminal} terminal
 * @returns {Promise<number>}
 */
async function installDependencies(terminal) {
  const installProcess = await webcontainerInstance.spawn("npm", ["install"]);
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
  return installProcess.exit;
}

/**
 * Starts the development server inside the WebContainer.
 */
async function startDevServer() {
  const serverProcess = await webcontainerInstance.spawn("npm", [
    "run",
    "start",
  ]);
  serverProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
}

/**
 * Starts the shell process in the WebContainer.
 * @param {Terminal} terminal
 * @returns {Promise<void>}
 */
async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn("jsh", {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });

  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}
