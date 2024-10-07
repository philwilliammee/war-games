
// setupTerminal.ts - Responsible for setting up the terminal
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export function setupTerminal(terminalEl: HTMLElement, fitAddon: FitAddon): Terminal {
  const terminal = new Terminal({
    convertEol: true,
  });

  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl);
  fitAddon.fit();

  return terminal;
}
