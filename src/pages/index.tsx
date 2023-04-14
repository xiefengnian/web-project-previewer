import styles from './index.less';
import { WebContainer } from '@webcontainer/api';
import { useEffect, useRef } from 'react';
import * as _ from 'lodash';
import { useMonacoEditor } from '@/hooks/useMonacoEditor';
import { useProjectDirectory } from '@/hooks/useProjectDirectory';

export default function HomePage() {
  const webContainerInstanceRef = useRef<WebContainer | null>(null);

  const terminalDomRef = useRef<HTMLDivElement>(null);

  const editorDomRef = useRef<HTMLDivElement | null>(null);

  const { load, directory, fileContent, filePath } = useProjectDirectory();

  const { setModel, init: editorInit } = useMonacoEditor();

  useEffect(() => {
    const currentFilePath = filePath.current;
    const currentFileContent = fileContent.current;

    setModel(currentFileContent, currentFilePath[currentFilePath.length - 1]);
  }, [filePath.current, fileContent.current]);

  async function installDependencies() {
    // Install dependencies
    const installProcess = await webContainerInstanceRef.current?.spawn(
      'yarn',
      ['install']
    );
    installProcess?.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      })
    );
    // Wait for install command to exit
    return installProcess?.exit;
  }

  async function startDevServer() {
    // Run `npm run start` to start the Express app

    await installDependencies();

    const startServerProcess = await webContainerInstanceRef.current?.spawn(
      'yarn',
      ['start']
    );

    // Wait for `server-ready` event
    webContainerInstanceRef.current?.on('server-ready', (port, url) => {
      if (terminalDomRef.current) {
        terminalDomRef.current.innerText += `server ready on port ${port} and url ${url}`;
      }
    });

    webContainerInstanceRef.current?.on('error', (error) => {
      console.error(error);
    });

    webContainerInstanceRef.current?.on('port', (port, type, url) => {
      console.error(port, type, url);
    });

    startServerProcess?.output.pipeTo(
      new WritableStream({
        write(data) {
          if (terminalDomRef.current) {
            terminalDomRef.current.innerText += data;
          }
        },
      })
    );
  }

  const init = async () => {
    const files = await (await fetch('http://localhost:3111/get')).json();

    webContainerInstanceRef.current = await WebContainer.boot();

    await webContainerInstanceRef.current.mount(files);

    load(files);

    startDevServer();

    setModel(files['package.json'].file.contents || '', 'package.json');

    // editorInstance.current.onDidChangeModelContent((e) => {
    //   console.log(editorInstance.current?.getValue(), filePath.current);
    // });
  };

  useEffect(() => {
    editorInit(editorDomRef.current!);
    init();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}></div>
      <div className={styles.body}>
        <div className={styles.leftPanel}>{directory}</div>
        <div className={styles.main}>
          <div className={styles.editor}>
            <div
              id={'editor'}
              ref={editorDomRef}
              style={{ width: '100%', height: '100%' }}
            ></div>
          </div>
          <div className={styles.terminal} ref={terminalDomRef}></div>
        </div>
      </div>
    </div>
  );
}
