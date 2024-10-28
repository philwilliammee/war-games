// web-developer/web-developer.service.ts
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { BaseService } from "../base/base.service";
import { SYSTEM_CONFIG_MESSAGE } from "./angular-developer.bot";
import { renderEditor, setupFileExplorer } from "../render";
import { files } from "./angular-developer.files";
import { startShell, startDevServer } from "../main";

export class TsDeveloperService extends BaseService {
  SYSTEM_CONFIG_MESSAGE = SYSTEM_CONFIG_MESSAGE;

  async boot(terminal: Terminal, webcontainer: WebContainer): Promise<void> {
    // this order is important
    await this.initializeChatContext(terminal, webcontainer);

    renderEditor(files["index.ts"].file.contents);

    await webcontainer.mount(files);

    await setupFileExplorer(webcontainer);

    await startShell(webcontainer, terminal);

    startDevServer(webcontainer);

    // await webcontainer.spawn("npm", ["run", "watch"]);
  }
}
