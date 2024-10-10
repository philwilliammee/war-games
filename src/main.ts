// main.ts - Main file of the application
import { WebContainer } from "@webcontainer/api";
import { files } from "./files";
import "./style.css";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { modelService } from "./model/model.service";
import { renderApp } from "./render";
import { setupTerminal } from "./setupTerminal";
import * as showdown from "showdown";

const converter = new showdown.Converter();
const fitAddon = new FitAddon();
let webcontainer: WebContainer;

// Do these in order
renderApp();

// add references to DOM elements
const textarea = document.querySelector("#editorInput") as HTMLTextAreaElement;
const iframe = document.querySelector("iframe");
const terminalEl = document.querySelector(".terminal") as HTMLElement;
const inputEl = document.querySelector("#inputText") as HTMLTextAreaElement;
const outputEl = document.querySelector(".output") as HTMLElement;
const terminal = setupTerminal(terminalEl, fitAddon);

window.addEventListener("load", async () => {
  if (!textarea || !iframe) {
    throw new Error("Missing textarea or iframe");
  }
  textarea.value = files["index.js"].file.contents;

  textarea.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLInputElement;
    const content = target.value || "";
    webcontainer.fs.writeFile("/index.js", content);
  });

  webcontainer = await WebContainer.boot();
  await webcontainer.mount(files);

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

  inputEl!.addEventListener("keyup", async (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const input = inputEl.value;
      outputEl.textContent = "analyzing...";
      modelService.handleChat(input);
    }
  });
});

async function startDevServer() {
  webcontainer.on("server-ready", (port, url) => {
    iframe!.src = url;
  });
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

export function renderOutput(output: string) {
  // add a horizontal line to separate the output and add the new output to the top of the stack.
  const newOutput = converter.makeHtml(output);
  const oldOutput = outputEl.innerHTML.replace("analyzing...", "");
  outputEl.innerHTML = newOutput + "<hr />" + oldOutput;
}
