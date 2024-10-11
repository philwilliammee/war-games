// main.ts - Main file of the application
import { WebContainer } from "@webcontainer/api";
import { files } from "./files";
import "./style.css";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { renderApp, getElements, renderEditor, renderTerminal } from "./render";
import { setupTerminal } from "./setupTerminal";
import * as showdown from "showdown";
import { modelService } from "./model/model.service";

// Initialize a converter for markdown to HTML conversion
const converter = new showdown.Converter();
const fitAddon = new FitAddon();
let webcontainer: WebContainer;

renderApp();
const elements = getElements();

const terminal = setupTerminal(elements.terminalEl, fitAddon);

window.addEventListener("load", async () => {
  if (!elements.textarea || !elements.iframe) {
    throw new Error("Missing textarea or iframe");
  }
  renderEditor(files["index.js"].file.contents);

  elements.textarea.addEventListener("input", (event: Event) => {
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

  elements.inputEl!.addEventListener("keyup", async (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const input = elements.inputEl.value;

      // Log or update DOM to show "Analyzing..." immediately after keypress
      console.log("Analyzing...");

      // Alternatively, update the DOM if you want to show this in a specific place, e.g., terminal or output section
      terminal.write("Analyzing...\r\n"); // Writes to the terminal output
      elements.outputEl.innerHTML = "Analyzing..."; // Writes to the output section
      const data = await modelService.handleChat(input);
      elements.outputEl!.innerHTML = converter.makeHtml(data);
      console.log(data);
    }
  });
});

async function startDevServer() {
  webcontainer.on("server-ready", (port, url) => {
    if (elements.iframe) {
      elements.iframe.src = url;
    }
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
