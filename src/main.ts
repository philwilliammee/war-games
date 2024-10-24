// main.ts - Main file of the application
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import {
  renderApp,
  getElements,
  renderEditor,
  setupFileExplorer,
} from "./render";
import { setupTerminal } from "./setupTerminal";
import { files as ticTacToeFiles } from "./tic-tac-toe/tic-tac-toe.files";
import { files as webDeveloperFiles } from "./web-developer/web-developer.files";
import { webDeveloperService } from "./web-developer/web-developer.service";
import { ticTacToeService } from "./tic-tac-toe/tic-tac-toe.service";

const module = import.meta.env.VITE_MODULE;
const modelService =
  module === "ticTacToe" ? ticTacToeService : webDeveloperService;
const files = module === "ticTacToe" ? ticTacToeFiles : webDeveloperFiles;

const fitAddon = new FitAddon();
let webcontainer: WebContainer;

renderApp();
const elements = getElements();
const terminal = setupTerminal(elements.terminalEl, fitAddon);

window.addEventListener("load", async () => {
  if (!elements.editorArea || !elements.iframe) {
    throw new Error("Missing textarea or iframe");
  }
  renderEditor(files["index.js"].file.contents);

  webcontainer = await WebContainer.boot();
  await webcontainer.mount(files);

  await setupFileExplorer(webcontainer);

  const shellProcess = await startShell(terminal);
  window.addEventListener("resize", () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

  startDevServer();

  await modelService.initializeChatContext(terminal, webcontainer);
});

async function startDevServer() {
  // Install dependencies
  await installDependencies();

  // Run `npm run start` to start the Express app
  await runStartCommand();
  webcontainer.on("server-ready", (port, url) => {
    if (elements.iframe) {
      elements.iframe.src = url;
    }
  });
}

async function runStartCommand() {
  const startProcess = await webcontainer.spawn("npm", ["run", "start"]);

  startProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
  // don't exit leave the game open.
}

async function installDependencies() {
  // Install dependencies
  const installProcess = await webcontainer.spawn("npm", ["install"]);

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
  // Wait for install command to exit
  return installProcess.exit;
}

async function startShell(terminal: Terminal) {
  const shellProcess = await webcontainer.spawn("jsh", {
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
