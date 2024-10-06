import { WebContainer } from "@webcontainer/api";
import { files } from "./files";
import "./style.css";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { ollamaService } from "./ollama/ollama.service";

const fitAddon = new FitAddon();
let webcontainer: WebContainer;

// add a textarea (the editor) and an iframe (a preview window) to the document
document.querySelector("#app")!.innerHTML = `
  <div class="container">
    <div class="editor">
      <textarea>I am a textarea</textarea>
    </div>
    <div class="preview">
      <iframe></iframe>
    </div>
  </div>
  <div class="output"></div>
  <div class="terminal"></div>
`;

// the editor
const textarea = document.querySelector("textarea");

// the preview window
const iframe = document.querySelector("iframe");
const terminalEl = document.querySelector(".terminal") as HTMLElement;

const terminal = new Terminal({
  convertEol: true,
});

terminal.loadAddon(fitAddon);
terminal.open(terminalEl);
fitAddon.fit();

window.addEventListener("load", async () => {
  textarea!.value = files["index.js"].file.contents;

  textarea!.addEventListener("input", (event: any) => {
    const content = event.currentTarget.value || "";
    webcontainer.fs.writeFile("/index.js", content);
  });

  // call only once
  webcontainer = await WebContainer.boot();

  await webcontainer.mount(files);

  // const exitCode = await installDependencies();

  // if (exitCode !== 0) {
  //   throw new Error("Installation failed");
  // }

  const shellProcess = await startShell(terminal);
  window.addEventListener("resize", () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

  startDevServer();
  await ollamaService.initializeChatContext(terminal, webcontainer);
  const data = await ollamaService.handleChat(
    "What is the square root of 7?",
    "llama3.1"
  );
  console.log(data);
});

async function installDependencies() {
  // install dependencies
  const installProcess = await webcontainer.spawn("npm", ["install"]);

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      },
    })
  );

  // wait for install command to exit
  return installProcess.exit;
}

async function startDevServer() {
  // run `npm run start` to start the express app
  // await webcontainer.spawn("npm", ["run", "start"]);

  // wait for `server-ready` event
  webcontainer.on("server-ready", (port, url) => {
    iframe!.src = url;
  });
}

/**
 * Starts the shell process in the WebContainer.
 * @param {Terminal} terminal
 * @returns {Promise<void>}
 */
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
