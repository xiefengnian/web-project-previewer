import { useEffect, useRef, useState } from 'react';
import styles from './useTerminal.less';
import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { Skeleton } from 'antd';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import * as _ from 'lodash';

export const useTerminal = (projectName: string, gitBranch: string) => {
  const webContainerInstanceRef = useRef<WebContainer | null>(null);
  const processInstance = useRef<WebContainerProcess | null>();
  const [loaded, setLoaded] = useState(false);

  const termRef = useRef<Terminal | null>(null);

  const runCommand = async (commandString: string) => {
    const [command, ...args] = commandString.split(' ');

    termRef.current?.writeln(`> ${commandString}`);

    const process = await webContainerInstanceRef.current?.spawn(command, args);
    process?.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(termRef.current, data);
          termRef.current?.writeln(data);
        },
      })
    );

    processInstance.current = process;
    return process?.exit;
  };

  const killCommand = async () => {
    processInstance.current?.kill();
  };

  const terminal = loaded ? (
    <div className={styles.terminal}>
      <div className={styles.terminal_header}>terminal - @webcontainer</div>
      <div className={styles.terminal_output}>
        <div id={'x-term'}></div>
      </div>
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
            // @ts-ignore
            e.nativeEvent.target!.reset();
            await runCommand(formDat.get('command') as string);
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

  useEffect(() => {
    if (loaded) {
      const term = new Terminal({
        rows: 20,
        theme: {
          background: 'rgb(29, 34, 39)',
        },
      });
      term.open(document.getElementById('x-term')!);

      termRef.current = term;
    }
  }, [loaded]);

  const init = async (files: any) => {
    webContainerInstanceRef.current = await WebContainer.boot();
    await webContainerInstanceRef.current.mount(files);

    setLoaded(true);

    webContainerInstanceRef.current?.on('server-ready', (port, url) => {
      termRef.current?.writeln(`Server is running on ${url}`);
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
