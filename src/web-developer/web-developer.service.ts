// web-developer/web-developer.service.ts
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { BaseService } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./web-developer.bot";
import { renderEditor, setupFileExplorer } from "../render";
import { files } from "./web-developer.files";
import { startShell, startDevServer } from "../main";

export class WebDeveloperService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  async boot(terminal: Terminal, webcontainer: WebContainer): Promise<void> {
    renderEditor(files["index.js"].file.contents);

    await webcontainer.mount(files);

    await setupFileExplorer(webcontainer);

    await startShell(webcontainer, terminal);

    startDevServer(webcontainer);

    await this.initializeChatContext(terminal, webcontainer);
  }
}
