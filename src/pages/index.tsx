import styles from './index.less';
import { WebContainer } from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import * as _ from 'lodash';
import { useMonacoEditor } from '@/hooks/useMonacoEditor';
import { useProjectDirectory } from '@/hooks/useProjectDirectory';
import { CloseOutlined } from '@ant-design/icons';
import cx from 'classnames';
import { Skeleton } from 'antd';

type TabType = {
  filename: string;
  fileKey: string;
};

const useTabs = (initTabs: TabType[], initActiveTab: string) => {
  const [tmpTab, setTmpTab] = useState<TabType | undefined>();

  const [activeTab, setActiveTab] = useState<string | undefined>(initActiveTab);

  const [openedTabs, setOpenedTabs] = useState<TabType[]>(initTabs);

  const [loading, setLoading] = useState(true);

  const doneLoad = () => {
    setLoading(false);
  };

  const openTab = (filename: string, fileKey: string) => {
    if (openedTabs.find((tab) => tab.fileKey === fileKey)) {
      setActiveTab(fileKey);
      return;
    }
    if (tmpTab && tmpTab.fileKey === fileKey) {
      tmpTab2OpenedTab();
      return;
    }
    setOpenedTabs([...openedTabs, { filename, fileKey }]);
    setActiveTab(fileKey);
  };

  const removeTab = (fileKey: string) => {
    if (fileKey === tmpTab?.fileKey) {
      setTmpTab(undefined);
      setActiveTab(openedTabs[0]?.fileKey);
    } else {
      const nextState = openedTabs
        .filter((tab) => tab.fileKey !== fileKey)
        .slice();
      if (nextState.length === 0 && tmpTab) {
        setActiveTab(tmpTab.fileKey);
      } else {
        setActiveTab(nextState[0]?.fileKey);
      }
      setOpenedTabs(nextState);
    }
  };

  const tmpTab2OpenedTab = () => {
    if (tmpTab) {
      const key = tmpTab.fileKey;
      setOpenedTabs([...openedTabs, tmpTab]);
      setTmpTab(undefined);
      setActiveTab(key);
    }
  };

  const openTmpTab = (filename: string, fileKey: string) => {
    if (openedTabs.find((tab) => tab.fileKey === fileKey)) {
      setActiveTab(fileKey);
      return;
    }
    setTmpTab({ filename, fileKey });
    setActiveTab(fileKey);
  };

  const tabs = (
    <div className={styles.tab_container}>
      {loading ? (
        <Skeleton></Skeleton>
      ) : (
        <>
          {openedTabs.map((tab) => (
            <div
              className={cx(styles.tab, {
                [styles.unused_tab]: tab.fileKey !== activeTab,
              })}
              key={tab.fileKey}
              onClick={() => {
                setActiveTab(tab.fileKey);
              }}
            >
              {tab.filename}
              <CloseOutlined
                className={styles.tab_close_icon}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.fileKey);
                }}
              />
            </div>
          ))}
          {tmpTab && (
            <div
              onClick={() => {
                setActiveTab(tmpTab.fileKey);
              }}
              onDoubleClick={() => {
                tmpTab2OpenedTab();
              }}
              className={cx(styles.tab, styles.tmp_tab, {
                [styles.unused_tab]: tmpTab.fileKey !== activeTab,
              })}
            >
              {tmpTab.filename}
              <CloseOutlined
                className={styles.tab_close_icon}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tmpTab.fileKey);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  console.log({ loading });

  return {
    tabs,
    activeTab,
    openTab,
    openTmpTab,
    openedTabs,
    doneLoad,
  };
};

const filepath2fileKey = (filepath: string[]) => filepath.join('/');

export default function HomePage() {
  const webContainerInstanceRef = useRef<WebContainer | null>(null);

  const terminalDomRef = useRef<HTMLDivElement>(null);

  const editorDomRef = useRef<HTMLDivElement | null>(null);

  const {
    load,
    directory,
    fileContent,
    filePath,
    doubleClickFilepath,
    outerSelect,
    loaded,
  } = useProjectDirectory();

  const { tabs, openTmpTab, openTab, activeTab, openedTabs, doneLoad } =
    useTabs(
      [
        {
          filename: 'package.json',
          fileKey: 'package.json',
        },
      ],
      'package.json'
    );

  const { setModel, init: editorInit } = useMonacoEditor();

  const prevFile = useRef<{ filepath: string[]; fileContent: string }>({
    filepath: [],
    fileContent: '',
  });

  useEffect(() => {
    if (activeTab) {
      outerSelect(activeTab);
    } else {
      if (openedTabs.length === 0) {
        console.log('load empty file');
        outerSelect('/Untitled');
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (loaded) {
      doneLoad();
    }
  }, [loaded]);

  useEffect(() => {
    const currentFilePath = filePath.current;
    const currentFileContent = fileContent.current;
    if (prevFile.current.filepath.join('/') === currentFilePath.join('/')) {
      prevFile.current = {
        filepath: currentFilePath,
        fileContent: currentFileContent,
      };
      return;
    }

    prevFile.current = {
      filepath: currentFilePath,
      fileContent: currentFileContent,
    };

    const filename = currentFilePath[currentFilePath.length - 1];

    if (currentFilePath.length && filename) {
      // 编辑器加载文件
      setModel(currentFileContent, filename);
      // 更新 tabs
      openTmpTab(filename, filepath2fileKey(currentFilePath));
    } else {
      // 编辑器加载空文件
      console.log('load empty file');
      setModel('', 'Untitled');
      openTmpTab('Untitled', '/Untitled');
    }
  }, [filePath.current, fileContent.current]);

  useEffect(() => {
    if (doubleClickFilepath) {
      const filename = doubleClickFilepath[doubleClickFilepath.length - 1];
      openTab(filename, filepath2fileKey(doubleClickFilepath));
    }
  }, [doubleClickFilepath]);

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

    // startDevServer();

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
      <div className={styles.header}>index.js - helper-demo</div>
      <div className={styles.body}>
        <div className={styles.leftPanel}>{directory}</div>
        <div className={styles.main}>
          <div className={styles.tabs}>
            <div className={styles.tabs_scroll}></div>
            {tabs}
          </div>
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
