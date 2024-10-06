import { FileSystemTree, WebContainer } from '@webcontainer/api';
import { files } from './files';

let webcontainer: WebContainer;

// add a textarea (the editor) and an iframe (a preview window) to the document
document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="editor">
      <textarea>I am a textarea</textarea>
    </div>
    <div class="preview">
      <iframe></iframe>
    </div>
  </div>
`;

// the editor
const textarea = document.querySelector('textarea');

// the preview window
const iframe = document.querySelector('iframe');

window.addEventListener('load', async () => {
  textarea.value = files['index.js'].file.contents;

  textarea.addEventListener('input', (event) => {
    const content = event.currentTarget.value;
    webcontainer.fs.writeFile('/index.js', content);
  });

  // call only once
  webcontainer = await WebContainer.boot();

  await webcontainer.mount(files);

  const exitCode = await installDependencies();

  if (exitCode !== 0) {
    throw new Error('Installation failed');
  }

  startDevServer();
});

async function installDependencies() {
  // install dependencies
  const installProcess = await webcontainer.spawn('npm', ['install']);

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      }
    })
  );

  // wait for install command to exit
  return installProcess.exit;
}

async function startDevServer() {
  // run `npm run start` to start the express app
  await webcontainer.spawn('npm', ['run', 'start']);

  // wait for `server-ready` event
  webcontainer.on('server-ready', (port, url) => {
    iframe.src = url;
  });
}
