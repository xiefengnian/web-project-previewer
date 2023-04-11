import { Spin, Tree, Skeleton } from 'antd';
import type { DataNode } from 'antd/es/tree';
import styles from './index.less';
import { useRequest } from 'ahooks';
import {
  DirectoryNode,
  FileNode,
  FileSystemTree,
  WebContainer,
} from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import * as _ from 'lodash';

import * as monaco from 'monaco-editor';

const Loading = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Skeleton active style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

const useProjectDirectory = () => {
  const [files, setFiles] = useState<FileSystemTree | undefined>();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [currentFileContent, setCurrentFileContent] = useState<string>('');
  const [currentFilePath, setCurrentFilePath] = useState<string[]>([]);

  const getFileContent = () => {};

  const transformData = (projectFiles: FileSystemTree): DataNode[] => {
    const isDir = (item: DirectoryNode | FileNode) => {
      return Object.hasOwn(item, 'directory');
    };

    const result: DataNode[] = [];

    const traverse = (
      dir: DirectoryNode,
      res: DataNode[],
      prevPath: string
    ) => {
      Object.keys(dir).forEach((path) => {
        const key = `${prevPath}/${path}`;

        if (
          isDir(
            // @ts-ignore
            dir[path]
          )
        ) {
          const node: DataNode = {
            title: path,
            key,
            children: [],
          };
          res.push(node);
          traverse(
            // @ts-ignore
            dir[path]['directory'] as unknown as DirectoryNode,
            node.children as DataNode[],
            prevPath + '/' + path
          );
        } else {
          const node: DataNode = {
            title: path,
            key,
            isLeaf: true,
            // @ts-ignore
            filePath: (
              key.split('/').slice(1).join('/directory/') + '/file/contents'
            ).split('/'), // 主要是方便 lodash.get 获取
          };
          res.push(node);
        }
      });
    };

    traverse(projectFiles as unknown as DirectoryNode, result, '');

    return result;
  };

  useEffect(() => {
    if (files) {
      setTreeData(transformData(files));
    }
  }, [files]);

  const load = (files: FileSystemTree) => {
    setFiles(files);
  };

  const directory = files ? (
    <Tree.DirectoryTree
      treeData={treeData}
      multiple={false}
      onSelect={(e, info) => {
        if (!info.node.isLeaf) return;
        setCurrentFileContent(
          _.get(
            files,
            // @ts-ignore
            info.node.filePath
          ) as unknown as string
        );
        setCurrentFilePath(
          // @ts-ignore
          info.node.filePath as string[]
        );
      }}
    />
  ) : (
    <Loading />
  );

  return {
    directory,
    getFileContent,
    load,
    currentFilePath,
    currentFileContent,
  };
};

export default function HomePage() {
  const webContainerInstanceRef = useRef<WebContainer | null>(null);

  const terminalDomRef = useRef<HTMLDivElement>(null);

  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor>();

  const { load, directory, currentFileContent, currentFilePath } =
    useProjectDirectory();

  useEffect(() => {
    console.log(currentFileContent);
    editorInstance.current?.setValue(currentFileContent);
  }, [currentFileContent]);

  async function startDevServer() {
    // Run `npm run start` to start the Express app

    const startServerProcess = await webContainerInstanceRef.current?.spawn(
      'node',
      ['./app/index.js']
    );

    // Wait for `server-ready` event
    webContainerInstanceRef.current?.on('server-ready', (port, url) => {
      console.log(`server ready on port ${port} and url ${url}`);
      // window.open(url, '_blank');
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

    editorInstance.current = monaco.editor.create(
      document.getElementById('editor')!,
      {
        value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join(
          '\n'
        ),
        language: 'javascript',
      }
    );
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}></div>
      <div className={styles.body}>
        <div className={styles.leftPanel}>{directory}</div>
        <div className={styles.main}>
          <div className={styles.editor}>
            <div id={'editor'} style={{ width: '100%', height: '100%' }}></div>
          </div>
          <div className={styles.terminal} ref={terminalDomRef}></div>
        </div>
      </div>
    </div>
  );
}
