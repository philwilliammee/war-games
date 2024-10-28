// main.ts - Main file of the application
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { renderApp, getElements } from "./render";
import { setupTerminal } from "./setupTerminal";
import { TicTacToeService } from "./tic-tac-toe/tic-tac-toe.service";
import { BaseService } from "./base/base.service";
import { TsDeveloperService } from "./ts-developer/ts-developer.service";
import { WebDeveloperService } from "./web-developer/web-developer.service";

const module = import.meta.env.VITE_MODULE;
let modelService: BaseService;
switch (module) {
  case "webDeveloper":
    modelService = new WebDeveloperService();
    break;
  case "ticTacToe":
    modelService = new TicTacToeService();
    break;
  case "tsDeveloper":
    modelService = new TsDeveloperService();
    break;
  default:
    modelService = new TicTacToeService();
    break;
}

const fitAddon = new FitAddon();

renderApp(modelService);
const elements = getElements();
const terminal = setupTerminal(elements.terminalEl, fitAddon);

// Load the App.
window.addEventListener("load", async () => {
  if (!elements.editorArea || !elements.iframe) {
    throw new Error("Missing textarea or iframe");
  }
  const webcontainer = await WebContainer.boot();
  modelService.boot(terminal, webcontainer);
});

/**
 * Install dependencies and start the Express server, and open the iframe view.
 */
export async function startDevServer(webcontainer: WebContainer | null) {
  if (!webcontainer) {
    throw new Error("WebContainer is not initialized");
  }
  // Install dependencies
  await installDependencies(webcontainer);

  // Run `npm run start` to start the Express app
  await runStartCommand(webcontainer);
  webcontainer.on("server-ready", (port, url) => {
    if (elements.iframe) {
      elements.iframe.src = url;
    }
  });
}

async function runStartCommand(webcontainer: WebContainer) {
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

async function installDependencies(webcontainer: WebContainer) {
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

export async function startShell(
  webcontainer: WebContainer,
  terminal: Terminal
) {
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

  window.addEventListener("resize", () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

  return shellProcess;
}
