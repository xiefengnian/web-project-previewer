import { useRef, useState } from 'react';
import styles from './useTerminal.less';
import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { Skeleton } from 'antd';
import * as _ from 'lodash';

export const useTerminal = (projectName: string, gitBranch: string) => {
  const terminalDomRef = useRef<HTMLDivElement | null>(null);
  const webContainerInstanceRef = useRef<WebContainer | null>(null);
  const processInstance = useRef<WebContainerProcess | null>();
  const [loaded, setLoaded] = useState(false);

  const runCommand = async (commandString: string) => {
    console.log(commandString);

    const [command, ...args] = commandString.split(' ');
    const outputDom = terminalDomRef.current;

    if (outputDom) {
      outputDom.innerHTML += `<div class="command-output-line command-string"><div class="project_info">&gt;&nbsp;${projectName}<div class="git_branch"> (${gitBranch}) </div></div>${commandString}</div>`;
    }

    const process = await webContainerInstanceRef.current?.spawn(command, args);
    process?.output.pipeTo(
      new WritableStream({
        write(data) {
          if (outputDom) {
            outputDom.innerHTML += `<div class="command-output-line"> ${data}</div>`;
          }
          _.throttle(() => {
            outputDom?.scrollTo(0, outputDom.scrollHeight);
          }, 100);
        },
      })
    );
    console.log(terminalDomRef.current);
    processInstance.current = process;
  };

  const killCommand = async () => {
    processInstance.current?.kill();
  };

  const terminal = loaded ? (
    <div className={styles.terminal}>
      <div className={styles.terminal_header}>terminal - @webcontainer</div>
      <div className={styles.terminal_output} ref={terminalDomRef}></div>
      <div className={styles.terminal_input_container}>
        <div className={'project_info'}>
          {'>'} helper-demo
          <div className="git_branch"> (master) </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formDat = new FormData(
              e.nativeEvent.target as HTMLFormElement
            );

            await runCommand(formDat.get('command') as string);
            // @ts-ignore
            e.nativeEvent.target!.reset();
          }}
        >
          <input
            spellCheck={false}
            name="command"
            defaultValue={'npm start'}
            className={styles.terminal_input}
            autoComplete={'off'}
            onKeyDown={(e) => {
              if (e.code === 'KeyC' && e.ctrlKey) {
                killCommand();
              }
            }}
          />
        </form>
      </div>
    </div>
  ) : (
    <Skeleton className={styles.terminal_skeleton} />
  );

  const init = async (dom: HTMLDivElement, files: any) => {
    terminalDomRef.current = dom;
    webContainerInstanceRef.current = await WebContainer.boot();
    await webContainerInstanceRef.current.mount(files);

    setLoaded(true);

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
  };

  return { terminal, init };
};
