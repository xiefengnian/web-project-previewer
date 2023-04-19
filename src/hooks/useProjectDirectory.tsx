import { useRef, useState, useEffect } from 'react';
import { DirectoryNode, FileNode, FileSystemTree } from '@webcontainer/api';
import type { DataNode } from 'antd/es/tree';
import { Tree, Skeleton, ConfigProvider } from 'antd';
import { useUpdate } from './useUpdate';
import * as _ from 'lodash';

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

export const useProjectDirectory = () => {
  const [files, setFiles] = useState<FileSystemTree | undefined>();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const fileContent = useRef<string>('');
  const filePath = useRef<string[]>([]);
  const [doubleClickFilepath, setDoubleClickFilepath] = useState<
    string[] | undefined
  >();

  const [loaded, setLoaded] = useState(false);

  const [activeKey, setActiveKey] = useState<string | number>('/package.json');

  const update = useUpdate();

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
            filePath: key.split('/').slice(1).join('/directory/').split('/'), // 主要是方便 lodash.get 获取
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
      setLoaded(true);
    }
  }, [files]);

  const load = (files: FileSystemTree) => {
    setFiles(files);
  };

  const handleSelect = (node: any) => {
    if (!node.isLeaf) return;
    setActiveKey(node.key);
    fileContent.current = _.get(
      files,
      node.filePath.concat(['file', 'contents'])
    ) as unknown as string;
    filePath.current = node.filePath;
    update();
  };

  // tabs 变化时反向更新选择的文件
  const outerSelect = (fileKey: string) => {
    setActiveKey('/' + fileKey);
    const fileKeyArr = fileKey.split('/');
    fileContent.current = _.get(files, fileKeyArr.concat(['file', 'contents']));
    filePath.current = fileKeyArr;
    update();
  };

  const directory = files ? (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: 'inherit',
          colorText: 'rgb(204,204,204)',
          motionDurationSlow: '0.1s',
          controlItemBgHover: 'rgb(41,45,50)',
          controlItemBgActive: 'white',
          colorPrimary: 'rgb(70,74,78)',
        },
      }}
    >
      <Tree.DirectoryTree
        treeData={treeData}
        multiple={false}
        selectedKeys={[activeKey]}
        onSelect={(e, info) => {
          handleSelect(info.node);
        }}
        onDoubleClick={(e, node) => {
          handleSelect(node);
          // @ts-ignore
          setDoubleClickFilepath(node.filePath);
        }}
      />
    </ConfigProvider>
  ) : (
    <Loading />
  );

  return {
    directory,
    load,
    fileContent,
    filePath,
    doubleClickFilepath,
    outerSelect,
    loaded,
  };
};
